"use client";

import { useState, useEffect } from "react";

export interface ServerStatus {
  name: string;
  status: "operational" | "downtime" | "degraded" | "maintenance" | "recovered";
  availability: number;
}

export interface ServerStatusData {
  coprocessor: ServerStatus | null;
  mpc: ServerStatus | null;
  relayer: ServerStatus | null;
  loading: boolean;
  error: string | null;
  hasIssues: boolean;
}

const STATUS_API_URL = "/api/server-status";
const REFRESH_INTERVAL = 60000; // 1 minute

export function useServerStatus(): ServerStatusData {
  const [data, setData] = useState<ServerStatusData>({
    coprocessor: null,
    mpc: null,
    relayer: null,
    loading: true,
    error: null,
    hasIssues: false,
  });

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(STATUS_API_URL, {
          cache: 'no-cache', // Ensure fresh data
        });
        if (!response.ok) {
          throw new Error("Failed to fetch status");
        }

        const json = await response.json();
        
        // Find the resources in the included array
        const resources = json.included?.filter(
          (item: { type: string }) => item.type === "status_page_resource"
        ) || [];

        // Find specific services
        const coprocessor = resources.find((r: { attributes: { public_name: string } }) => 
          r.attributes?.public_name?.toLowerCase().includes("coprocessor")
        );
        const mpc = resources.find((r: { attributes: { public_name: string } }) => 
          r.attributes?.public_name?.toLowerCase().includes("mpc")
        );
        const relayer = resources.find((r: { attributes: { public_name: string } }) => 
          r.attributes?.public_name?.toLowerCase().includes("relayer")
        );

        const coprocessorStatus: ServerStatus | null = coprocessor ? {
          name: coprocessor.attributes.public_name,
          status: coprocessor.attributes.status,
          availability: coprocessor.attributes.availability || 0,
        } : null;

        const mpcStatus: ServerStatus | null = mpc ? {
          name: mpc.attributes.public_name,
          status: mpc.attributes.status,
          availability: mpc.attributes.availability || 0,
        } : null;

        const relayerStatus: ServerStatus | null = relayer ? {
          name: relayer.attributes.public_name,
          status: relayer.attributes.status,
          availability: relayer.attributes.availability || 0,
        } : null;

        const hasIssues = 
          (coprocessorStatus?.status !== "operational") ||
          (mpcStatus?.status !== "operational") ||
          (relayerStatus?.status !== "operational");

        setData({
          coprocessor: coprocessorStatus,
          mpc: mpcStatus,
          relayer: relayerStatus,
          loading: false,
          error: null,
          hasIssues,
        });
      } catch (error) {
        console.error("Error fetching server status:", error);
        setData({
          coprocessor: null,
          mpc: null,
          relayer: null,
          loading: false,
          error: error instanceof Error ? error.message : "Unknown error",
          hasIssues: false,
        });
      }
    };

    // Initial fetch
    fetchStatus();

    // Set up polling
    const interval = setInterval(fetchStatus, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  return data;
}

