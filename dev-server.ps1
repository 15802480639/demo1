<#
  webshopp 本地预览 一键起停脚本
  用法：
    .\dev-server.ps1          启动（默认）
    .\dev-server.ps1 start    启动
    .\dev-server.ps1 stop     仅停网站（数据库保持运行）
    .\dev-server.ps1 restart  重启网站

  说明：
    - 数据库 webshopp-pg 已设 restart=unless-stopped，被 OOM 杀了会自动恢复；
      本脚本启动时会确保它处于运行状态。
    - 网站用 standalone 模式运行（node .next/standalone/server.js）。
    - 若 .next/standalone/server.js 不存在，请先执行 npx next build 并同步产物：
        npx next build
        mkdir -p .next/standalone/public && cp -r public/. .next/standalone/public/
        mkdir -p .next/standalone/.next && cp -r .next/static .next/standalone/.next/
        mkdir -p .next/standalone/node_modules/.prisma/client && cp -r node_modules/.prisma/client/. .next/standalone/node_modules/.prisma/client/
#>
param([string]$Action = "start")

$ErrorActionPreference = 'Continue'
$dir = "D:\LuoshenWorkspace\code\webshopp"
$env:NO_PROXY = '*'
$env:HTTP_PROXY = ''
$env:HTTPS_PROXY = ''

function Stop-Web {
  $p = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
  if ($p) {
    $p.OwningProcess | Sort-Object -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
    Write-Host "已停止占用 3000 端口的进程"
  } else {
    Write-Host "3000 端口当前无监听"
  }
}

function Ensure-Pg {
  $running = docker inspect -f '{{.State.Running}}' webshopp-pg 2>$null
  if ($running -ne 'true') {
    Write-Host "启动数据库 webshopp-pg ..."
    docker start webshopp-pg | Out-Null
    for ($i = 0; $i -lt 25; $i++) {
      if (docker exec webshopp-pg pg_isready -h 127.0.0.1 -p 5432 >$null 2>&1) {
        Write-Host "数据库已就绪"
        return
      }
      Start-Sleep -Seconds 1
    }
    Write-Host "警告：数据库未在预期时间内就绪，请检查 docker"
  } else {
    Write-Host "数据库 webshopp-pg 已在运行"
  }
}

if ($Action -eq 'stop') {
  Stop-Web
  Write-Host "已停止网站（数据库保持运行）"
  exit 0
}

# start / restart
if ($Action -eq 'restart') { Stop-Web }
Ensure-Pg

$server = Join-Path $dir ".next/standalone/server.js"
if (-not (Test-Path $server)) {
  Write-Host "未找到 $server —— 请先构建（见脚本头部说明）"
  exit 1
}

Stop-Web  # 确保端口空闲
Set-Location $dir
$env:PORT = "3000"
$env:HOSTNAME = "127.0.0.1"

Write-Host "启动 webshopp 预览（standalone）..."
Start-Process -FilePath "node" -ArgumentList $server -WindowStyle Hidden

# 等待就绪
$ready = $false
for ($i = 0; $i -lt 20; $i++) {
  try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:3000/zh" -UseBasicParsing -TimeoutSec 4 -ErrorAction Stop
    if ($r.StatusCode -eq 200) { $ready = $true; break }
  } catch {}
  Start-Sleep -Seconds 1
}

if ($ready) {
  Write-Host "网站已就绪 ->  http://localhost:3000"
} else {
  Write-Host "网站启动中，请稍候手动访问 http://localhost:3000（或查看 node 日志）"
}
exit 0
