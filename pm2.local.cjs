// 本地预览用的 pm2 配置（生产部署请使用服务器上的 ecosystem.config.js）
//
// ⚠️ 关键：本项目 next.config.ts 是 output: "standalone"，
//    Next 16 下 `next start` 与 standalone 不兼容（会启动即退出），
//    必须直接跑 .next/standalone/server.js。
//
// 启动：npx pm2 start pm2.local.cjs
// 停止：npx pm2 stop webshopp    日志：npx pm2 logs webshopp
module.exports = {
  apps: [
    {
      name: 'webshopp',
      // cwd 必须是项目根，否则 standalone 的 server.js 加载不到 .env（DATABASE_URL / AUTH_SECRET）
      cwd: __dirname,
      interpreter: process.execPath,
      script: './.next/standalone/server.js',
      env: {
        NODE_ENV: 'production',
        NEXT_TELEMETRY_DISABLED: '1',
        PORT: '3000',
        HOSTNAME: '127.0.0.1',
      },
      autorestart: true,
      max_restarts: 5,
      min_uptime: '10s',
    },
  ],
};
