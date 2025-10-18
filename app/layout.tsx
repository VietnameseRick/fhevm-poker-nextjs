import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { CardAnimations } from "@/components/CardDisplay";

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
      <body className="bg-black text-foreground antialiased">
        <CardAnimations />
        <main>
          <Providers>{children}</Providers>
        </main>
      </body>
    </html>
  );
}
