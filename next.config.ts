import type { NextConfig } from "next";

// 注：项目目录被文件监视器对空闲的数据文件（.db 等）持续加只读锁，
// 但 .next 构建缓存在监视器忽略列表中，可正常读写，使用默认 .next 即可。
// 生产部署：输出自包含 standalone 产物（含精简 node_modules + server.js），
// 目标服务器无需 npm install，直接 `node server.js` 即可运行。
const nextConfig: NextConfig = {
  output: "standalone",
  // ⚠️ ali-oss 必须外置（不参与打包）：
  //   它的传递依赖 urllib 里 require('proxy-agent')，而 proxy-agent → vm2
  //   带有非标准的预编译目录结构，Turbopack 打包器直接报
  //   "Can't resolve './ROOT/node_modules/vm2'"，构建必失败。
  // 外置后由 Node 在运行时从 node_modules require，standalone 产物会自动带上。
  serverExternalPackages: ["ali-oss", "proxy-agent"],
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
