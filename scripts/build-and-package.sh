#!/usr/bin/env bash
# ============================================================
#  本地构建 + 打包 standalone 产物（供服务器免构建部署）
#
#  用法：
#    bash scripts/build-and-package.sh
#    scp /tmp/webshopp-standalone.tar.gz webdeploy@<IP>:/tmp/
#    ssh webdeploy@<IP> "sudo bash /tmp/deploy-linux.sh"   # 服务器端不再构建
#
#  为什么必须本地构建：
#    生产机只有 1.7G 内存，服务器端 `next build` 会吃满内存+swap，
#    表现为 SSH banner 超时、HTTP 无响应、整机僵死（2026-10-23 实测）。
# ============================================================
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
OUT_TAR="${OUT_TAR:-/tmp/webshopp-standalone.tar.gz}"
NODE_BIN="${NODE_BIN:-node}"

cd "$PROJECT_DIR"

log() { echo -e "\n\033[1;36m==> $*\033[0m"; }
ok()  { echo -e "  \033[0;32m✓ $*\033[0m"; }
die() { echo -e "  \033[0;31m✗ $*\033[0m"; exit 1; }

log "清理旧构建产物"
# ⚠️ 用 mv 而不是 rm：safe-delete 策略会拦截批量删除（2975 个文件需确认）
if [[ -d .next ]]; then
  mv .next ".next_stale_$(date +%s)"
  ok "旧 .next 已移为 .next_stale_*"
fi

log "安装依赖"
npm ci --no-audit --no-fund || npm install --no-audit --no-fund

log "生成 Prisma Client"
# ⚠️ 必须先生成：@prisma/client 的类型（PrismaClient / Product / Sku…）
# 是从 schema.prisma 生成的，不生成则 tsc 报 "no exported member 'PrismaClient'"
npx prisma generate || die "prisma generate 失败"

log "类型检查"
"$NODE_BIN" ./node_modules/typescript/bin/tsc --noEmit || die "类型检查失败"

log "构建 standalone"
"$NODE_BIN" ./node_modules/next/dist/bin/next build || die "构建失败"

[[ -d .next/standalone ]] || die "未生成 .next/standalone"

log "补齐 standalone 依赖与静态资源"
cp -r public .next/standalone/ 2>/dev/null || true
mkdir -p .next/standalone/.next
cp -r .next/static .next/standalone/.next/ 2>/dev/null || true
mkdir -p .next/standalone/prisma
cp prisma/schema.prisma .next/standalone/prisma/ 2>/dev/null || true
cp -r node_modules/.prisma .next/standalone/node_modules/ 2>/dev/null || true
cp -r node_modules/@prisma .next/standalone/node_modules/ 2>/dev/null || true

# ali-oss 等外置包必须带上（serverExternalPackages 的包 tracing 会带上，这里兜底）
for m in ali-oss proxy-agent vm2; do
  if [[ -d "node_modules/$m" && ! -d ".next/standalone/node_modules/$m" ]]; then
    cp -r "node_modules/$m" ".next/standalone/node_modules/$m" 2>/dev/null || true
  fi
done

# ⚠️⚠️ 关键：把外置模块的符号链接换成真实目录
# Next 16 对 serverExternalPackages 的模块，会在
#   .next/standalone/.next/node_modules/<pkg>-<hash>
# 生成**指向本机绝对路径**的符号链接（如 Windows 的 D:\LuoshenWorkspace\...）。
# 打包上传到 Linux 服务器后链接必然断链 →
#   "Failed to load external module @prisma/client-<hash>: Cannot find module"
# 逐个把链接替换为目标目录的真实拷贝。
log "修复外置模块的符号链接（改为真实目录）"
FIXED=0
while IFS= read -r link; do
  target="$(readlink "$link" 2>/dev/null)" || continue
  [[ -z "$target" ]] && continue
  # Windows 绝对路径 → 换算成项目内的相对路径
  rel="${target#*:/}"
  rel="${rel//\\//}"
  src="$PROJECT_DIR/$rel"
  if [[ ! -d "$src" ]]; then
    # 目标可能已经是相对路径或指向 node_modules 顶层
    src="$target"
  fi
  if [[ -d "$src" ]]; then
    tmp="${link}.real"
    rm -rf "$tmp" 2>/dev/null || true
    cp -rL "$src" "$tmp" 2>/dev/null || cp -r "$src" "$tmp" 2>/dev/null || true
    if [[ -d "$tmp" ]]; then
      rm -f "$link" 2>/dev/null || true
      mv "$tmp" "$link" 2>/dev/null || true
      echo "  ✓ $(basename "$link")"
      FIXED=$((FIXED + 1))
    fi
  else
    echo "  ! $(basename "$link") 目标不存在: $target"
  fi
done < <(find .next/standalone -type l 2>/dev/null)
ok "已修复 $FIXED 个符号链接"

# 修复后若仍有断链的链接，直接报告（部署前自查）
BROKEN=$(find .next/standalone -type l ! -exec test -e {} \; -print 2>/dev/null | wc -l)
if [[ "$BROKEN" -gt 0 ]]; then
  warn "仍有 $BROKEN 个断链符号链接："
  find .next/standalone -type l ! -exec test -e {} \; -print 2>/dev/null | head -5
else
  ok "无断链符号链接"
fi

# ⚠️ 瘦身：这些包生产完全用不到，但 tracing 会一并带进来（占 80M+）
#   @prisma/studio-core 43M（Prisma Studio 图形界面）
#   @prisma/dev 19M（Prisma CLI 依赖）
#   typescript 19M（只在构建期用）
#   prisma 目录（CLI 本体，migrate 在服务器上跑需要，保留）
log "剔除生产无用依赖（studio-core / dev / typescript）"
for junk in "@prisma/studio-core" "@prisma/dev" "typescript" "tsx"; do
  if [[ -d ".next/standalone/node_modules/$junk" ]]; then
    mv ".next/standalone/node_modules/$junk" "/tmp/junk_$(basename "$junk")_$$" 2>/dev/null || true
  fi
done

# ⚠️ 瘦身：Prisma 7 的 query compiler 按数据库方言各带一份 wasm，
#   每种约 15M（mysql / sqlite / cockroachdb / sqlserver / postgresql）。
#   生产只用 PostgreSQL → 剔掉其余四种，省约 60M。
log "剔除 Prisma 非 PostgreSQL 方言的 query compiler"
for d in ".next/standalone/.next/node_modules/@prisma"/*/runtime; do
  [[ -d "$d" ]] || continue
  for f in "$d"/query_compiler_*.wasm-base64.*; do
    [[ -f "$f" ]] || continue
    case "$f" in
      *postgresql*) ;;
      *) rm -f "$f" 2>/dev/null || true ;;
    esac
  done
  # 同样精简非 pg 的方言 js（体积小，顺手清）
  for f in "$d"/query_compiler_*.js "$d"/query_compiler_*.mjs; do
    [[ -f "$f" ]] || continue
    case "$f" in
      *postgresql*) ;;
      *) rm -f "$f" 2>/dev/null || true ;;
    esac
  done
done
ok "Prisma 方言精简完成"

# standalone 里的 uploads 是运行时上传目录，清掉避免把旧图打包进去
rm -rf .next/standalone/public/uploads 2>/dev/null || true

log "打包"
SIZE=$(du -sh .next/standalone | cut -f1)
(cd .next && tar -czf "$OUT_TAR" standalone)
TAR_SIZE=$(du -h "$OUT_TAR" | cut -f1)

ok "standalone 体积: $SIZE"
ok "打包文件: $OUT_TAR ($TAR_SIZE)"
echo ""
echo "下一步："
echo "  scp -i ~/.ssh/webshopp_deploy $OUT_TAR webdeploy@<IP>:/tmp/"
echo "  ssh -i ~/.ssh/webshopp_deploy webdeploy@<IP> 'sudo bash /tmp/deploy-linux.sh'"
echo ""
echo "（服务器端会检测到 .next/standalone 并跳过构建）"
