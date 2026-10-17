import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ['node:sqlite'],
  outputFileTracingExcludes: { '*': ['./.dev.vars', './.local/**/*', './.sites-runtime/**/*'] },
  turbopack: { root: process.cwd() },
};

export default nextConfig;
