import type { NextConfig } from "next";

// 注：项目目录被文件监视器对空闲的数据文件（.db 等）持续加只读锁，
// 但 .next 构建缓存在监视器忽略列表中，可正常读写，使用默认 .next 即可。
// 生产部署：输出自包含 standalone 产物（含精简 node_modules + server.js），
// 目标服务器无需 npm install，直接 `node server.js` 即可运行。
const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    // public 静态清单里没有的 /uploads/* （如运行中新上传的图片）兜底到动态读盘接口
    return [{ source: "/uploads/:path*", destination: "/api/uploads/:path*" }];
  },
};

export default nextConfig;
