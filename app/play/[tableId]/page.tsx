"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { usePokerStore } from "@/stores/pokerStore";

export default function PlayTablePage() {
  const params = useParams();
  const router = useRouter();
  const tableId = params.tableId as string;
  const store = usePokerStore();

  useEffect(() => {
    if (!tableId) {
      router.push("/");
      return;
    }

    const tableIdBigInt = BigInt(tableId);
    
    // Set the table ID in store
    store.setCurrentTableId(tableIdBigInt);

    // Save to localStorage
    if (typeof window !== "undefined") {
      window.localStorage.setItem("poker:lastTableId", tableId);
    }

    console.log(`📊 Navigated to table ${tableId}`);
  }, [tableId, router, store]);

  // Redirect to home - the PokerGame component will handle the rest
  useEffect(() => {
    router.push("/");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="text-white text-xl">Loading table...</div>
    </div>
  );
}
