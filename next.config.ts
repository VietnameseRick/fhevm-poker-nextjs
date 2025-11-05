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

  // Webpack configuration to handle MetaMask SDK React Native imports
  webpack: (config, { isServer }) => {
    // Fix for @metamask/sdk trying to import React Native packages in browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        '@react-native-async-storage/async-storage': false,
        'react-native': false,
      };

      // Add externals to completely ignore problematic imports
      config.externals = config.externals || [];
      config.externals.push({
        '@react-native-async-storage/async-storage': 'commonjs @react-native-async-storage/async-storage',
      });
    }

    return config;
  },
};

export default nextConfig;
