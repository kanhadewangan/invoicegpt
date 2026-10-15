/** @type {import('next').NextConfig} */
const nextConfig = {
  // Internal packages export raw TypeScript (no build step). Turbopack compiles workspace
  // packages automatically; listing them keeps it explicit and also covers webpack builds.
  transpilePackages: ["@repo/shared", "@repo/paypal", "@repo/ai", "@repo/db", "@repo/notion"],
  // Keep the dev badge clear of the sidebar's account menu (bottom-left).
  devIndicators: { position: "bottom-right" },
};

export default nextConfig;
