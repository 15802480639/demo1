# WebShopp 一键部署 - 本地 SQLite 版 (阿里云 ECS Windows Server)
$ErrorActionPreference = "Stop"
Write-Host "=== WebShopp 部署开始 (本地 SQLite) ==="

# 0. 虚拟内存 (2G 物理内存跑 next build 需扩展)
try {
  $cs = Get-WmiObject Win32_ComputerSystem
  if ($cs.AutomaticManagedPagefile) { $cs.AutomaticManagedPagefile = $false; $cs.Put() | Out-Null }
  $pg = Get-WmiObject Win32_PageFileSetting -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "*pagefile.sys" } | Select-Object -First 1
  if (-not $pg) { Set-WmiInstance -Class Win32_PageFileSetting -Arguments @{Name="C:\pagefile.sys"; InitialSize=4096; MaximumSize=4096} | Out-Null }
  else { $pg.InitialSize = 4096; $pg.MaximumSize = 4096; $pg.Put() | Out-Null }
  Write-Host "虚拟内存已设为 4GB (若首次设置, 请重启服务器后重跑本脚本)"
} catch { Write-Warning ("设置虚拟内存失败(可忽略): " + $_) }

# 1. 安装 Chocolatey
if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
  Set-ExecutionPolicy Bypass -Scope Process -Force
  [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
  iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
}

# 2. 安装 git + node
choco install git nodejs-lts -y

# 3. 克隆代码
if (-not (Test-Path C:\webshopp)) { cd C:\; git clone https://github.com/15802480639/demo1.git webshopp }
cd C:\webshopp

# 4. .env
if (-not (Test-Path .env)) {
  Copy-Item env.example .env
  $secret = -join ((48..57)+(65..90)+(97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
  Add-Content .env ("AUTH_SECRET=" + $secret)
  Add-Content .env "NEXT_PUBLIC_SITE_URL=http://112.39.82.21:3000"
  Write-Host ".env 已创建 (DATABASE_URL=file:./dev.db)"
}

# 5. 安装依赖 + 构建 (build 自动 prisma generate + db push + seed)
npm install
npm run build

# 6. 防火墙放行 3000
New-NetFirewallRule -Name "webshopp-3000" -DisplayName "WebShopp 3000" -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 3000 -ErrorAction SilentlyContinue

# 7. PM2 守护
npm install -g pm2
pm2 start npm --name webshopp -- run start -- -p 3000
pm2 save
pm2-startup install

Write-Host "=== 完成! 访问 http://112.39.82.21:3000 ==="