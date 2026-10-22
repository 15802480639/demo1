#!/usr/bin/env bash
# ============================================================
#  WebShopp (J&D) 生产部署脚本 —— Alibaba Cloud Linux 3 / Ubuntu 22.04+
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

[[ $EUID -ne 0 ]] && die "请用 root 运行：sudo bash deploy-linux.sh"

# ---------- 1. 系统依赖 ----------
log "1/8 安装系统依赖"
if ! command -v dnf >/dev/null 2>&1; then
  apt-get update -qq && apt-get install -y -qq curl git build-essential
else
  dnf install -y -q curl git gcc-c++ make
fi
ok "系统依赖就绪"

# ---------- 2. Node.js 22 ----------
log "2/8 安装 Node.js ${NODE_MAJOR}"
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | sed 's/v\([0-9]*\).*/\1/')" -lt 20 ]]; then
  curl -fsSL https://rpm.nodesource.com/setup_${NODE_MAJOR}.x | bash - 2>/dev/null \
    || curl -fsSL https://deb.nodesource.com/setup_${NODE_MAJOR}.x | bash -
  if command -v dnf >/dev/null 2>&1; then
    dnf install -y -q nodejs
  else
    apt-get install -y -qq nodejs
  fi
fi
ok "Node $(node -v)"

# ---------- 3. PostgreSQL ----------
log "3/8 配置 PostgreSQL"
if ! command -v psql >/dev/null 2>&1; then
  if command -v dnf >/dev/null 2>&1; then
    dnf install -y -q postgresql-server postgresql-contrib
    postgresql-setup --initdb || true
    systemctl enable --now postgresql
  else
    apt-get install -y -qq postgresql postgresql-contrib
    systemctl enable --now postgresql
  fi
fi

# 建库建用户（幂等）
sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${PG_USER}'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE USER ${PG_USER} WITH PASSWORD '${PG_PASSWORD:-change-me-now}';"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${PG_DB}'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE DATABASE ${PG_DB} OWNER ${PG_USER};"
ok "PostgreSQL $(psql --version | awk '{print $3}') 就绪（库 ${PG_DB}）"

# ---------- 4. 应用目录与代码 ----------
log "4/8 拉取代码 → ${APP_DIR}"
mkdir -p "$APP_DIR"
cd "$APP_DIR"
if [[ -d .git ]]; then
  git fetch --all --tags && git reset --hard "origin/${BRANCH}"
  ok "已更新到 origin/${BRANCH}"
else
  git clone --depth 1 -b "$BRANCH" "$REPO_URL" .
  ok "首次克隆完成"
fi

# ---------- 5. 依赖 ----------
log "5/8 安装依赖"
npm ci --omit=dev 2>/dev/null || npm install --omit=dev
# prisma CLI 是 devDependency，但 migrate deploy 需要它 → 单独装
npm install --no-save prisma@7.9.1 @prisma/client@7.9.1 @prisma/adapter-pg@7.9.1 tsx 2>/dev/null || true
ok "依赖就绪"

# ---------- 6. 环境变量 ----------
log "6/8 配置环境变量"
if [[ ! -f .env ]]; then
  cat > .env <<EOF
DATABASE_URL="postgresql://${PG_USER}:${PG_PASSWORD:-change-me-now}@127.0.0.1:5432/${PG_DB}?schema=public"
AUTH_SECRET="${AUTH_SECRET:-$(openssl rand -base64 48)}"
NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL:-http://$(curl -s --max-time 5 ifconfig.me 2>/dev/null || echo 127.0.0.1)}"
NODE_ENV="production"
EOF
  chmod 600 .env
  warn "已生成 .env —— **请检查 DATABASE_URL / AUTH_SECRET / NEXT_PUBLIC_SITE_URL**"
else
  ok ".env 已存在，跳过（不覆盖）"
fi
set -a; source .env; set +a

# ---------- 7. 数据库迁移（生产铁律：只 migrate，绝不 db push） ----------
log "7/8 执行数据库迁移"
npx prisma generate
npx prisma migrate deploy
ok "迁移完成（未重置数据）"

# ---------- 8. 构建 + 守护 ----------
log "8/8 构建并启动"
export NODE_OPTIONS="--max-old-space-size=1536"
npm run build
ok "构建完成"

# standalone 产物需要手动补 public 与 static（Next 不会自动带）
cp -r public .next/standalone/ 2>/dev/null || true
mkdir -p .next/standalone/.next
cp -r .next/static .next/standalone/.next/ 2>/dev/null || true

# 复制 prisma 引擎与 schema（standalone 运行期需要）
mkdir -p .next/standalone/prisma
cp prisma/schema.prisma .next/standalone/prisma/ 2>/dev/null || true
cp -r node_modules/.prisma .next/standalone/node_modules/ 2>/dev/null || true
cp -r node_modules/@prisma .next/standalone/node_modules/ 2>/dev/null || true

# PM2 守护
if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2
fi
pm2 delete webshopp 2>/dev/null || true
pm2 start .next/standalone/server.js --name webshopp \
  --env PORT=3000 --env HOSTNAME=127.0.0.1 --time
pm2 save
pm2 startup systemd -u "$NODE_USER" --hp "/home/$NODE_USER" 2>/dev/null || true
ok "PM2 已启动"

echo -e "\n\033[0;32m✅ 部署完成\033[0m"
echo "   本机访问： curl http://127.0.0.1:3000/ko"
echo "   查看日志： pm2 logs webshopp"
echo -e "\n\033[1;33m下一步：配置 Nginx 反代 + HTTPS 证书\033[0m"
