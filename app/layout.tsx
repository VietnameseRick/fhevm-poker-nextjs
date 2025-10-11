import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import Image from "next/image";

// Remove edge runtime to support WalletConnect
// export const runtime = 'edge';

export const metadata: Metadata = {
  title: "GHub - Privacy-First Blockchain Poker",
  description: "Experience the future of poker with Fully Homomorphic Encryption on fhEVM",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-gray-900 text-foreground antialiased">
        {/* Futuristic Background Layers */}
        <div className="fixed inset-0 w-full h-full z-[-20] overflow-hidden">
          {/* Base dark gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900"></div>
          
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `
                linear-gradient(to right, cyan 1px, transparent 1px),
                linear-gradient(to bottom, cyan 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px',
            }}></div>
          </div>

          {/* Animated particles */}
          <div className="absolute inset-0">
            <div className="absolute top-20 left-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-float"></div>
            <div className="absolute top-40 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
            <div className="absolute bottom-20 left-1/2 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }}></div>
          </div>

          {/* Scan line effect */}
          <div className="absolute inset-0 pointer-events-none opacity-20">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent animate-scan"></div>
          </div>
        </div>

        <main className="relative flex flex-col max-w-screen-lg mx-auto pb-20 min-w-[350px] px-3 md:px-6">
          {/* Header Nav */}
          <nav className="flex w-full h-fit py-10 justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <Image
                  src="/zama-logo.svg"
                  alt="Zama Logo"
                  width={120}
                  height={120}
                  className="relative z-10 transition-transform duration-300 group-hover:scale-105"
                />
                {/* Glow effect on hover */}
                <div className="absolute inset-0 blur-xl bg-cyan-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              
              {/* Status indicator */}
              <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-full">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-cyan-400 text-xs font-bold mono tracking-wider">SYSTEM ONLINE</span>
              </div>
            </div>

            {/* Title Badge */}
            <div className="hidden lg:flex items-center gap-2 px-4 py-2 glass-card rounded-full">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 font-bold text-sm">
                GHub Poker
              </span>
              <span className="text-gray-400 text-xs">• fhEVM</span>
            </div>
          </nav>
          
          <Providers>{children}</Providers>
        </main>
      </body>
    </html>
  );
}
