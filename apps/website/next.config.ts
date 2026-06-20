import type { NextConfig } from "next";
import { join } from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    // The site lives inside a pnpm workspace; pin the root to the workspace so
    // Next stops inferring it from a stray parent lockfile, while still
    // resolving hoisted deps (next, react) from the workspace node_modules.
    root: join(__dirname, "..", ".."),
  },
};

export default nextConfig;
