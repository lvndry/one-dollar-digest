import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
    formats: ["image/avif", "image/webp"],
  },
  async rewrites() {
    return [
      { source: "/article/:id.md", destination: "/api/markdown/article/:id" },
      { source: "/digest/today.md", destination: "/api/markdown/digest/today" },
      { source: "/digest/:date.md", destination: "/api/markdown/digest/:date" },
    ];
  },
};

export default nextConfig;
