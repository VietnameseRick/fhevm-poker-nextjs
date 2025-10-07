"use client";

import type { ReactNode } from "react";
import { PrivyProvider } from "@/providers/PrivyProvider";
import { InMemoryStorageProvider } from "@/hooks/useInMemoryStorage";

type Props = {
  children: ReactNode;
};

export function Providers({ children }: Props) {
  return (
    <PrivyProvider>
      <InMemoryStorageProvider>{children}</InMemoryStorageProvider>
    </PrivyProvider>
  );
}
