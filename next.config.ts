import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["fhevm-poker", "@fhevm/react"],
  // No CORS headers - allows Privy to work
  // FHEVM will need to be configured to work without strict CORS
  // or use a Web Worker approach
  
  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  compress: true,
  
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Modular imports for better tree-shaking
  modularizeImports: {
    'react-hot-toast': {
      transform: 'react-hot-toast/dist/{{member}}',
    },
  },
};

export default nextConfig;
