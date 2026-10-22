import type { NextConfig } from "next";

// 注：项目目录被文件监视器对空闲的数据文件（.db 等）持续加只读锁，
// 但 .next 构建缓存在监视器忽略列表中，可正常读写，使用默认 .next 即可。
// 生产部署：输出自包含 standalone 产物（含精简 node_modules + server.js），
// 目标服务器无需 npm install，直接 `node server.js` 即可运行。
const nextConfig: NextConfig = {
  output: "standalone",
  // 排除与运行时无关的目录，缩小 tracing 范围（降低构建内存峰值与 standalone 产物体积）。
  // 注意：public 仍会在部署时整目录复制到 standalone，不影响 /uploads 静态图访问。
  outputFileTracingExcludes: {
    "*": [
      "./.git/**/*",
      "./scripts/**/*",
      "./memory/**/*",
      "*.md",
    ],
  },
  async rewrites() {
    // public 静态清单里没有的 /uploads/* （如运行中新上传的图片）兜底到动态读盘接口
    return [{ source: "/uploads/:path*", destination: "/api/uploads/:path*" }];
  },
};

export default nextConfig;
