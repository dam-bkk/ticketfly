import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  agentRules: false,
  transpilePackages: ["@ticketfly/core", "@ticketfly/db"],
  serverExternalPackages: ["postgres"],
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  outputFileTracingRoot: new URL("../../", import.meta.url).pathname,
};

export default nextConfig;
