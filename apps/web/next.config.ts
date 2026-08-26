import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: { position: "bottom-right" },
  agentRules: false,
  transpilePackages: ["@ticketfly/core", "@ticketfly/db"],
  serverExternalPackages: ["postgres"],
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  outputFileTracingRoot: new URL("../../", import.meta.url).pathname,
};

export default nextConfig;
