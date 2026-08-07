import type { NextConfig } from "next";

// 注：项目目录被文件监视器对空闲的数据文件（.db 等）持续加只读锁，
// 但 .next 构建缓存在监视器忽略列表中，可正常读写，使用默认 .next 即可。
const nextConfig: NextConfig = {};

export default nextConfig;
