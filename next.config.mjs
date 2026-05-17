import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" }
    ]
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "matchnmove.co.nz" }],
        destination: "https://www.matchnmove.co.nz/:path*",
        permanent: true
      }
    ];
  },
  turbopack: {
    root: __dirname
  }
};

export default nextConfig;
