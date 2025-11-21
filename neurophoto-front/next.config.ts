import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  images: {
    domains: [process.env.MINIO_ENDPOINT || 'localhost'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '/api',
  },
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
