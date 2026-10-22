# ============================================================
# WebShopp 部署脚本 - Windows Server 2022
# 以【管理员身份】打开 PowerShell 运行本脚本：
#   powershell -ExecutionPolicy Bypass -File deploy-windows.ps1
#
# 前置（在阿里云控制台手动完成）：
#   1. 给实例绑定弹性公网 IP
#   2. 安全组入方向放行 3000 端口 (0.0.0.0/0)
#   3. 建议把系统虚拟内存设到 4GB+（2G 内存跑 build 更稳）
# ============================================================
$ErrorActionPreference = "Stop"

# 1. 安装 Chocolatey（如未安装）
if (!(Get-Command choco -ErrorAction SilentlyContinue)) {
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
}

# 2. 安装 git + Node.js LTS
choco install git nodejs-lts -y
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine")

# 3. 克隆代码（已有则拉取最新）
cd C:\
if (!(Test-Path C:\webshopp)) {
    git clone https://github.com/15802480639/demo1.git webshopp
} else {
    cd C:\webshopp; git pull
}
cd C:\webshopp

# 4. 生成 .env（仅首次；已存在则跳过，避免覆盖你填的值）
$publicIp = (Invoke-RestMethod -Uri "http://myip.ipip.net" -TimeoutSec 10) -replace ".+?(\d+\.\d+\.\d+\.\d+).+",'$1'
if ([string]::IsNullOrWhiteSpace($publicIp)) { $publicIp = "你的公网IP" }
if (!(Test-Path .env)) {
    $chars = (48..57) + (97..122)
    $secret = -join ($chars | Get-Random -Count 48 | ForEach-Object { [char]$_ })
    $envContent = @"
DATABASE_URL=file:./dev.db
AUTH_SECRET=$secret
NEXT_PUBLIC_SITE_URL=http://$publicIp`:3000
"@
    $envContent | Out-File -Encoding utf8 .env
    Write-Host "已生成 .env（本地 SQLite + 随机 AUTH_SECRET）" -ForegroundColor Cyan
}

# 5. 安装依赖 + 构建（build 脚本会自动 prisma generate + db push + seed）
$env:NODE_OPTIONS = "--max-old-space-size=1536"
npm install
if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
npm run build
if ($LASTEXITCODE -ne 0) { throw "npm run build failed" }

# 6. 放通 Windows 防火墙 3000 端口（阿里云安全组另需在控制台放行）
New-NetFirewallRule -DisplayName "WebShopp 3000" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue

# 7. 用 PM2 守护运行（走 cmd 绕过 PowerShell 执行策略）
npm install -g pm2
cmd /c "pm2 delete webshopp 2>nul"
cmd /c "pm2 start npm --name webshopp -- run start"
if ($LASTEXITCODE -ne 0) { throw "pm2 start failed" }
cmd /c "pm2 save"

Write-Host "✅ 部署完成！浏览器访问 http://$publicIp`:3000" -ForegroundColor Green
