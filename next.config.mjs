import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" }
    ]
  },
  async headers() {
    const noIndexHeaders = [
      { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
    ];

    return [
      { source: "/api/:path*", headers: noIndexHeaders },
      { source: "/admin/:path*", headers: noIndexHeaders },
      { source: "/review/:path*", headers: noIndexHeaders },
      { source: "/thank-you", headers: noIndexHeaders },
      { source: "/mover/dashboard/:path*", headers: noIndexHeaders },
      { source: "/mover/login", headers: noIndexHeaders },
      { source: "/mover/forgot-password", headers: noIndexHeaders },
      { source: "/mover/reset-password", headers: noIndexHeaders },
      { source: "/mover/verify-email", headers: noIndexHeaders },
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()"
          }
        ]
      }
    ];
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
