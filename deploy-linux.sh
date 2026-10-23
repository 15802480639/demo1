#!/usr/bin/env bash
# ============================================================
#  WebShopp (J&D) 生产部署脚本 —— Alibaba Cloud Linux 3/4 / Ubuntu 22.04+
#
#  用法：
#    sudo bash deploy-linux.sh
#
#  前置（在阿里云控制台完成）：
#    1. 创建 ECS 实例（密钥对登录，root 用户）
#    2. 安全组入方向放行：22 / 80 / 443
#    3. 磁盘挂载到 /www（若未挂载则跳过，脚本会用系统盘）
#
#  设计原则：
#    · 生产库只走 prisma migrate deploy，**绝不 db push / 绝不 seed**
#    · 构建在本机完成，服务器只跑 standalone 产物（省内存）
#    · 幂等：重复执行安全
# ============================================================
set -euo pipefail

APP_DIR="${APP_DIR:-/www/webshopp}"
REPO_URL="${REPO_URL:-https://github.com/15802480639/demo1.git}"
BRANCH="${BRANCH:-master}"
NODE_MAJOR=22
PG_DB="${PG_DB:-webshopp}"
PG_USER="${PG_USER:-webshopp}"
NODE_USER="${NODE_USER:-webshopp}"

log()  { echo -e "\n\033[1;36m==> $*\033[0m"; }
ok()   { echo -e "  \033[0;32m✓ $*\033[0m"; }
warn() { echo -e "  \033[0;33m! $*\033[0m"; }
die()  { echo -e "\n\033[0;31m✗ $*\033[0m"; exit 1; }

# 支持非 root 登录（阿里云默认 ecs-user 等）：有免密 sudo 时自动提权重跑
if [[ $EUID -ne 0 ]]; then
  if sudo -n true 2>/dev/null; then
    log "当前用户 $(whoami) 非 root，自动提权重跑部署"
    exec sudo -E bash "$0" "$@"
  else
    die "请用 sudo 运行：sudo bash deploy-linux.sh"
  fi
fi

# ---------- 1. 系统依赖 ----------
log "1/8 安装系统依赖"
if ! command -v dnf >/dev/null 2>&1; then
  apt-get update -qq && apt-get install -y -qq curl git build-essential
else
  dnf install -y -q curl git gcc-c++ make
fi
ok "系统依赖就绪"

# ---------- 1b. 运行用户（PM2 与文件属主；原脚本漏建会导致开机自启失效） ----------
if ! id "$NODE_USER" >/dev/null 2>&1; then
  useradd -m -s /bin/bash "$NODE_USER"
  ok "已创建运行用户 $NODE_USER"
fi

# ---------- 1c. 内存保障 ----------
# Next 16 构建峰值约 1.5GB；物理内存不足 3.5GB 时补 swap，否则被 OOM Killer 杀掉
MEM_TOTAL_KB="$(awk '/MemTotal/ {print $2}' /proc/meminfo)"
MEM_TOTAL_MB=$((MEM_TOTAL_KB / 1024))
log "物理内存：${MEM_TOTAL_MB}MB"
if [[ $MEM_TOTAL_MB -lt 3500 ]] && ! swapon --show 2>/dev/null | grep -q '/swapfile'; then
  log "内存不足 3.5GB，创建 4GB swap（仅构建期兜底）"
  fallocate -l 4G /swapfile 2>/dev/null \
    || dd if=/dev/zero of=/swapfile bs=1M count=4096 status=none
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile || warn "swap 启用失败（虚拟化环境可能禁用 swap，需手动升配）"
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  free -m | awk '/Swap/ {print "  ✓ Swap 总计 "$2"MB"}'
fi

# ---------- 2. Node.js 22 ----------
log "2/8 安装 Node.js ${NODE_MAJOR}"
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | sed 's/v\([0-9]*\).*/\1/')" -lt 20 ]]; then
  # 优先走软件源（NodeSource 对 RHEL/CentOS/Rocky/Alma 系识别较好）
  # ⚠️ 必须加 `|| true`：set -e 下 curl|bash 失败会让整个脚本退出
  curl -fsSL "https://rpm.nodesource.com/setup_${NODE_MAJOR}.x" | bash - 2>/dev/null \
    || curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash - || true
  if command -v dnf >/dev/null 2>&1; then
    dnf install -y -q nodejs || true
  else
    apt-get install -y -qq nodejs || true
  fi
  # 兜底：源不可用（如 Alibaba Cloud Linux 4 未被 NodeSource 识别）
  # → 装官方预编译二进制，任何 glibc 2.28+ 的 Linux 均可运行
  if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | sed 's/v\([0-9]*\).*/\1/')" -lt 20 ]]; then
    warn "软件源安装 Node 失败，改用官方二进制包"
    NODE_ARCH="$(uname -m)"
    case "$NODE_ARCH" in
      x86_64|amd64) NODE_ARCH="x64" ;;
      aarch64|arm64) NODE_ARCH="arm64" ;;
      *) die "不支持的 CPU 架构：${NODE_ARCH}" ;;
    esac
    NODE_VER="$(curl -fsSL "https://nodejs.org/dist/latest-v${NODE_MAJOR}.x/" 2>/dev/null \
      | grep -o "node-v${NODE_MAJOR}\.[0-9]*\.[0-9]*-linux-${NODE_ARCH}\.tar\.xz" \
      | head -1 | sed "s/^node-//; s/\.tar\.xz$//")"
    [[ -n "${NODE_VER}" ]] || die "获取 Node 版本号失败（nodejs.org 不可达？）"
    log "下载 Node ${NODE_VER}（${NODE_ARCH}）"
    mkdir -p /usr/local/lib/nodejs
    curl -fsSL "https://nodejs.org/dist/${NODE_VER}/node-${NODE_VER}-linux-${NODE_ARCH}.tar.xz" \
      -o /tmp/node.tar.xz || die "Node 二进制下载失败"
    tar -xJf /tmp/node.tar.xz -C /usr/local/lib/nodejs || die "Node 解压失败"
    for BIN in node npm npx corepack; do
      SRC="/usr/local/lib/nodejs/node-${NODE_VER}-linux-${NODE_ARCH}/bin/${BIN}"
      [[ -x "$SRC" ]] && ln -sf "$SRC" "/usr/local/bin/${BIN}"
    done
    rm -f /tmp/node.tar.xz
    hash -r 2>/dev/null || true
  fi
fi
command -v node >/dev/null 2>&1 || die "Node 安装失败，请检查服务器网络"
ok "Node $(node -v)"

# ---------- 3. PostgreSQL ----------
log "3/8 配置 PostgreSQL"
# ⚠️ 密码必须在建库之前就确定，否则建库用的密码与 .env 里的对不上
PG_PASS_FILE="/etc/webshopp/.pgpass"
mkdir -p /etc/webshopp "$APP_DIR"
if [[ -z "${PG_PASSWORD:-}" && -f "$PG_PASS_FILE" ]]; then
  PG_PASSWORD="$(cat "$PG_PASS_FILE")"
fi
if [[ -z "${PG_PASSWORD:-}" ]]; then
  PG_PASSWORD="$(openssl rand -base64 18 | tr -d '/+=' | head -c 20)"
  echo "$PG_PASSWORD" > "$PG_PASS_FILE"
  chmod 600 "$PG_PASS_FILE"
  warn "已生成数据库密码并保存到 $PG_PASS_FILE（请备份）"
fi
PG_PASS_ENC="$(printf '%s' "$PG_PASSWORD" | od -An -tx1 | tr -d ' \n' | sed 's/../%&/g')"

if ! command -v psql >/dev/null 2>&1; then
  if command -v dnf >/dev/null 2>&1; then
    dnf install -y -q postgresql-server postgresql-contrib xz
    # 初始化数据目录：优先 postgresql-setup（RHEL 系），
    # 阿里云 ALOS4 等系统可能没有该命令 → 回退手动 initdb
    if ! postgresql-setup --initdb 2>/dev/null; then
      warn "postgresql-setup 不可用，改用 initdb 手动初始化"
      PG_DATA="/var/lib/pgsql/data"
      if [[ ! -f "${PG_DATA}/PG_VERSION" ]]; then
        mkdir -p "$PG_DATA"
        chown -R postgres:postgres /var/lib/pgsql
        sudo -u postgres initdb -D "$PG_DATA" --encoding=UTF8 --locale=C.UTF-8 \
          || die "PostgreSQL 初始化失败"
      fi
    fi
    systemctl enable --now postgresql
    # RHEL/ALOS 系 PG 默认 host 127.0.0.1/32 走 ident 认证，
    # 应用经 TCP+密码连接会被拒（Prisma 报 P1010 denied access）→ 改 scram-sha-256
    PG_HBA="/var/lib/pgsql/data/pg_hba.conf"
    if grep -qE '^host\s+all\s+all\s+(127\.0\.0\.1/32|::1/128)\s+ident' "$PG_HBA" 2>/dev/null; then
      sed -i -E 's#^(host\s+all\s+all\s+(127\.0\.0\.1/32|::1/128)\s+)ident#\1scram-sha-256#' "$PG_HBA"
      systemctl reload postgresql
      ok "pg_hba 已切换为密码认证（默认 ident 会导致应用连不上）"
    fi
  else
    apt-get install -y -qq postgresql postgresql-contrib xz-utils
    systemctl enable --now postgresql
  fi
fi

# 建库建用户（幂等）
sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${PG_USER}'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE USER ${PG_USER} WITH PASSWORD '${PG_PASSWORD}';"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${PG_DB}'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE DATABASE ${PG_DB} OWNER ${PG_USER};"
ok "PostgreSQL $(psql --version | awk '{print $3}') 就绪（库 ${PG_DB}）"

# ---------- 4. 应用目录与代码 ----------
log "4/8 拉取代码 → ${APP_DIR}"
mkdir -p "$APP_DIR"
cd "$APP_DIR"

# ⚠️ 必须显式声明目录可信。
# 本脚本以 root 运行，但第 8 步会把整个 APP_DIR（含 .git）chown 给 webshopp，
# 于是 root 再操作该仓库时 git 判定为 "dubious ownership" 并拒绝一切操作。
# 后果极其隐蔽：git 报错后旧代码继续构建，日志却显示"已更新成功"，
# 表现为新功能"部署了却没生效"、数据库迁移静默不执行。
git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true
git config --global --add safe.directory '*' 2>/dev/null || true

# GitHub 直连在部分网络下很慢，允许用加速通道（GH_PROXY=https://ghfast.top）
GIT_URL="$REPO_URL"
if [[ -n "${GH_PROXY:-}" ]]; then
  GIT_URL="${GH_PROXY}/${REPO_URL}"
  warn "使用 GitHub 加速通道：${GH_PROXY}"
fi

if [[ -d .git ]]; then
  git fetch --all --tags || die "git fetch 失败（检查服务器到 GitHub 的网络，或设置 GH_PROXY）"
  git reset --hard "origin/${BRANCH}" || die "git reset 失败"
  # 打印真实 commit —— 只打印"已更新"这种自述无法验证是否真的拉到了
  ok "已更新到 $(git rev-parse --short HEAD)（origin/${BRANCH}）"
else
  git clone --depth 1 -b "$BRANCH" "$GIT_URL" . || die "git clone 失败"
  ok "首次克隆完成：$(git rev-parse --short HEAD)"
fi

# ⚠️ 校验拉到的确实是最新代码（防止拉错分支导致跑旧版）
if [[ -f package.json ]]; then
  PKG_VER="$(node -e "console.log(require('./package.json').dependencies.next)" 2>/dev/null || echo '?')"
  ok "Next.js 版本：${PKG_VER}"
fi
[[ -f deploy-linux.sh ]] || warn "⚠️ 拉到的代码里没有 deploy-linux.sh，可能拉错分支了"

# ---------- 5. 依赖 ----------
log "5/8 安装依赖"
# ⚠️ 2Mbps 带宽 + 1.7G 内存的机器上，直连官方源会长时间打满 CPU/网络导致 sshd 无响应。
# 三重保险：镜像源加速 + 限并发降内存 + nice 降优先级（保证 sshd 始终能抢到 CPU）
NPM_MIRROR="https://registry.npmmirror.com"
install_deps() {
  nice -n 19 npm "$@" --omit=dev --no-audit --no-fund --maxsockets 2
}
install_deps ci --registry="$NPM_MIRROR" \
  || install_deps ci \
  || (nice -n 19 npm install --omit=dev --no-audit --no-fund --maxsockets 2) \
  || die "依赖安装失败"
# prisma CLI 是 devDependency，但 migrate deploy 需要它 → 单独装
nice -n 19 npm install --no-save prisma@7.9.1 @prisma/client@7.9.1 @prisma/adapter-pg@7.9.1 tsx \
  --no-audit --no-fund --maxsockets 2 2>/dev/null || warn "prisma CLI 补装失败（若迁移报错请手动处理）"
ok "依赖就绪"

# ---------- 6. 环境变量 ----------
log "6/8 配置环境变量"
# 数据库密码未指定则自动生成并记到独立文件（.env 里 URL 编码，避免特殊字符炸掉）
PG_PASS_FILE="/etc/webshopp/.pgpass"
if [[ -z "${PG_PASSWORD:-}" && -f "$PG_PASS_FILE" ]]; then
  PG_PASSWORD="$(cat "$PG_PASS_FILE")"
fi
if [[ -z "${PG_PASSWORD:-}" ]]; then
  PG_PASSWORD="$(openssl rand -base64 18 | tr -d '/+=' | head -c 20)"
  echo "$PG_PASSWORD" > "$PG_PASS_FILE"
  chmod 600 "$PG_PASS_FILE"
  warn "已生成数据库密码并保存到 $PG_PASS_FILE（请备份）"
fi
# URL 编码密码中的特殊字符
PG_PASS_ENC="$(printf '%s' "$PG_PASSWORD" | od -An -tx1 | tr -d ' \n' | sed 's/../%&/g')"

if [[ ! -f .env ]]; then
  cat > .env <<EOF
DATABASE_URL="postgresql://${PG_USER}:${PG_PASS_ENC}@127.0.0.1:5432/${PG_DB}?schema=public"
AUTH_SECRET="${AUTH_SECRET:-$(openssl rand -base64 48)}"
NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL:-http://$(curl -s --max-time 5 ifconfig.me 2>/dev/null || echo 127.0.0.1)}"
NODE_ENV="production"
EOF
  chmod 600 .env
  warn "已生成 .env —— **请检查 DATABASE_URL / AUTH_SECRET / NEXT_PUBLIC_SITE_URL**"
else
  ok ".env 已存在，跳过（不覆盖）"
fi

# ---------- OSS 配置（ECS RAM Role 方式，服务器不存长期 AccessKey） ----------
# 用 upsert 式追加：已存在同键则替换，不存在则追加，避免重复行。
set_env() {
  local key="$1" val="$2"
  if grep -qE "^${key}=" .env 2>/dev/null; then
    # 存在则就地替换（sed 分隔符用 |，值里可能含 /）
    sed -i "s|^${key}=.*|${key}=${val}|" .env
  else
    printf '%s=%s\n' "$key" "$val" >> .env
  fi
}
OSS_BUCKET="${OSS_BUCKET:-jd-oss}"
OSS_REGION="${OSS_REGION:-oss-cn-hongkong}"
OSS_ROLE_NAME="${OSS_ROLE_NAME:-JNDOSSImageRole}"
OSS_PUBLIC_URL="${OSS_PUBLIC_URL:-https://${OSS_BUCKET}.${OSS_REGION}.aliyuncs.com}"
set_env "OSS_BUCKET" "$OSS_BUCKET"
set_env "OSS_REGION" "$OSS_REGION"
set_env "OSS_ROLE_NAME" "$OSS_ROLE_NAME"
set_env "OSS_PUBLIC_URL" "$OSS_PUBLIC_URL"
ok "OSS 配置就绪：${OSS_BUCKET} @ ${OSS_REGION}（RAM Role: ${OSS_ROLE_NAME}）"

# 用 grep 逐行取，避免 source 触发 URL 里的特殊字符
DB_URL="$(grep -E '^DATABASE_URL=' .env | head -1 | sed 's/^DATABASE_URL=//; s/^"//; s/"$//')"
export DATABASE_URL="$DB_URL"
export NODE_ENV=production

# ---------- 7. 数据库迁移（生产铁律：只 migrate，绝不 db push） ----------
log "7/8 执行数据库迁移"
npx prisma generate
npx prisma migrate deploy
ok "迁移完成（未重置数据）"

# ---------- 8. 构建 + 守护 ----------
log "8/8 构建并启动"
# ⚠️ BUILD_ON_SERVER 默认为 0。
# 这台机只有 1.7G 内存：服务器上跑 `next build` 会把内存+swap 吃满，
# 表现为 SSH banner exchange 超时、HTTP 全无响应、整个系统僵死（2026-10-23 实测）。
# 正确姿势：**本地构建好 standalone 产物 → 上传 → 服务器只做 npm ci + 启动**。
BUILD_ON_SERVER="${BUILD_ON_SERVER:-0}"

# 从上传的预构建产物包解出 .next/standalone
if [[ -f /tmp/webshopp-standalone.tar.gz ]]; then
  log "解出预构建产物 /tmp/webshopp-standalone.tar.gz"
  # 旧产物先移走（不删，safe-delete 会拦批量删除）
  if [[ -d .next ]]; then
    mv .next ".next_stale_$(date +%s)"
  fi
  tar -xzf /tmp/webshopp-standalone.tar.gz -C .next 2>/dev/null \
    || { mkdir -p .next && tar -xzf /tmp/webshopp-standalone.tar.gz -C .next; }
  ok "预构建产物已就位"
fi

if [[ "$BUILD_ON_SERVER" == "1" ]]; then
  # Node heap 上限按物理内存动态计算：留 1GB 给系统与 PostgreSQL，
  # 小内存机器（有 swap 兜底）至少给 1GB heap
  if [[ ${MEM_TOTAL_MB:-0} -gt 2048 ]]; then
    HEAP_MB=$((MEM_TOTAL_MB - 1024))
  else
    # 小内存机器：留约 390MB 给系统与 PostgreSQL，其余给 V8；
    # 物理内存不够的部分由 4GB swap 兜底（换页变慢但不会失败）
    HEAP_MB=1280
  fi
  export NODE_OPTIONS="--max-old-space-size=${HEAP_MB}"
  log "构建内存策略：物理 ${MEM_TOTAL_MB:-?}MB → Node heap 上限 ${HEAP_MB}MB"
  warn "服务器上构建 —— 小内存机器有卡死风险（建议 BUILD_ON_SERVER=0）"
  npm run build
  ok "构建完成"
else
  if [[ -d .next/standalone ]]; then
    ok "检测到预构建产物 .next/standalone，跳过服务器端构建（省内存）"
  else
    warn "未找到 .next/standalone 且 BUILD_ON_SERVER=0 —— 无法启动！"
    warn "请先在本地构建并上传产物，或设置 BUILD_ON_SERVER=1 强制在服务器构建"
    die "缺少构建产物"
  fi
fi

# standalone 产物需要手动补 public 与 static（Next 不会自动带）
# ⚠️ 用 rsync 语义（cp -r src dst/ 当 dst 已存在时会变成 dst/src）：
# 目标已存在时逐项复制，确保 public/uploads 里的存量图正确落到 standalone。
if [[ -d .next/standalone/public ]]; then
  cp -r public/. .next/standalone/public/ 2>/dev/null || true
else
  cp -r public .next/standalone/ 2>/dev/null || true
fi
mkdir -p .next/standalone/.next
cp -r .next/static/. .next/standalone/.next/static/ 2>/dev/null || true

# ⚠️ .env 必须同时放在 standalone 目录：
# Next 的 standalone server.js 用 __dirname 定位 .env，而 process.chdir(__dirname)
# 之后 cwd 变成 .next/standalone —— 只放项目根会导致运行时读不到 DATABASE_URL
# （报 Prisma P1001）与 OSS 配置。
cp -f .env .next/standalone/.env 2>/dev/null || true

# 复制 prisma 引擎与 schema（standalone 运行期需要）
# ⚠️ 只补 .prisma（生成的 client）与 @prisma/client、@prisma/adapter-pg，
# 不要整个拷贝 @prisma —— 里面含 studio-core(43M)/dev(19M) 等生产用不到的包。
mkdir -p .next/standalone/prisma
cp prisma/schema.prisma .next/standalone/prisma/ 2>/dev/null || true
cp -r node_modules/.prisma .next/standalone/node_modules/ 2>/dev/null || true
for m in "@prisma/client" "@prisma/adapter-pg" "@prisma/client-runtime-utils" "@prisma/get-platform" "@prisma/engines-version"; do
  if [[ -d "node_modules/$m" && ! -d ".next/standalone/node_modules/$m" ]]; then
    mkdir -p ".next/standalone/node_modules/$(dirname "$m")"
    cp -r "node_modules/$m" ".next/standalone/node_modules/$m" 2>/dev/null || true
  fi
done

# ali-oss 已通过 next.config.ts 的 serverExternalPackages 外置，
# Next 的 tracing 会自动把 ali-oss / proxy-agent / vm2 打进 standalone。
# 这里只做兜底检查，缺失则手动补（防止 tracing 行为变化导致运行时才崩）。
if [[ ! -d ".next/standalone/node_modules/ali-oss" ]]; then
  warn "standalone 产物缺少 ali-oss，手动补齐"
  for m in ali-oss proxy-agent vm2; do
    [[ -d "node_modules/$m" ]] && cp -r "node_modules/$m" ".next/standalone/node_modules/$m" 2>/dev/null || true
  done
else
  ok "OSS SDK 依赖已包含在 standalone 产物中"
fi

# PM2 守护
if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2
fi
# 产物属主交给运行用户，避免 PM2 以 webshopp 身份启动时权限不足
chown -R "$NODE_USER:$NODE_USER" "$APP_DIR"
pm2 delete webshopp 2>/dev/null || true
pm2 start .next/standalone/server.js --name webshopp \
  --env PORT=3000 --env HOSTNAME=127.0.0.1 \
  --env OSS_BUCKET="$OSS_BUCKET" \
  --env OSS_REGION="$OSS_REGION" \
  --env OSS_ROLE_NAME="$OSS_ROLE_NAME" \
  --env OSS_PUBLIC_URL="$OSS_PUBLIC_URL" \
  --time
pm2 save
pm2 startup systemd -u "$NODE_USER" --hp "/home/$NODE_USER" 2>/dev/null || true
ok "PM2 已启动"

echo -e "\n\033[0;32m✅ 部署完成\033[0m"
echo "   本机访问： curl http://127.0.0.1:3000/ko"
echo "   查看日志： pm2 logs webshopp"
echo -e "\n\033[1;33m下一步：配置 Nginx 反代 + HTTPS 证书\033[0m"
