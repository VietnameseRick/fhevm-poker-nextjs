"use client";

import { useState, useEffect } from 'react';
import config from '@/utils/config';

/**
 * Hook to monitor WebSocket connection status
 * Returns true if WebSocket is connected and working
 */
export function useWebSocketStatus() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastError, setLastError] = useState<Error | null>(null);

  useEffect(() => {
    if (!config.wsRpcUrl || !config.enableWebSocket) {
      console.log('⚠️ WebSocket disabled in config');
      setIsConnected(false);
      return;
    }

    let ws: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout;
    let pingInterval: NodeJS.Timeout;

    const connect = () => {
      try {
        console.log('🔌 Connecting to WebSocket:', config.wsRpcUrl);
        ws = new WebSocket(config.wsRpcUrl!);

        ws.onopen = () => {
          console.log('✅ WebSocket connected');
          setIsConnected(true);
          setLastError(null);

          // Send periodic pings to keep connection alive
          pingInterval = setInterval(() => {
            if (ws?.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ 
                jsonrpc: '2.0', 
                method: 'net_version', 
                params: [], 
                id: Date.now() 
              }));
            }
          }, 30000); // Ping every 30 seconds
        };

        ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          setLastError(new Error('WebSocket connection error'));
          setIsConnected(false);
        };

        ws.onclose = () => {
          console.log('🔌 WebSocket disconnected, will retry in 5s...');
          setIsConnected(false);
          clearInterval(pingInterval);
          
          // Attempt reconnect after 5 seconds
          reconnectTimer = setTimeout(connect, 5000);
        };
      } catch (error) {
        console.error('❌ Failed to create WebSocket:', error);
        setLastError(error as Error);
        setIsConnected(false);
        
        // Retry after 5 seconds
        reconnectTimer = setTimeout(connect, 5000);
      }
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      clearInterval(pingInterval);
      if (ws) {
        ws.close();
      }
    };
  }, []);

  return { isConnected, lastError };
}

