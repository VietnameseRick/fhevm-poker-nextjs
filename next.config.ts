import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["fhevm-poker", "@fhevm/react"],
  // No CORS headers - allows Privy to work
  // FHEVM will need to be configured to work without strict CORS
  // or use a Web Worker approach
};

export default nextConfig;
