import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // web/ is built standalone (Vercel root directory = web), not from the monorepo root.
  outputFileTracingRoot: process.cwd(),
  experimental: {
    // Image uploads (logo, staff photos, gallery) go through server actions.
    serverActions: { bodySizeLimit: "12mb" },
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**.supabase.co" }],
  },
  async headers() {
    const common = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
    ];
    return [
      // Everything except the chat embed page refuses to be framed.
      { source: "/((?!s/[^/]+/chat$).*)", headers: [...common, { key: "X-Frame-Options", value: "DENY" }] },
      { source: "/s/:slug/chat", headers: common },
    ];
  },
};

export default nextConfig;
