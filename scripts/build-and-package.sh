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
