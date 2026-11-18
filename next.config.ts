import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async redirects() {
    // The workspace is the product. The app shell sends visitors without a session to /login.
    return [{ source: "/", destination: "/dashboard", permanent: false }];
  },
};

export default nextConfig;
