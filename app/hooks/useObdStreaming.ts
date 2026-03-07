'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ObdWebSocketClient, ObdSensorData, ObdStreamConfig } from '../lib/iot/obd-websocket';

interface UseObdStreamingOptions {
  serverUrl: string;
  token: string;
  autoConnect?: boolean;
}

interface UseObdStreamingReturn {
  isConnected: boolean;
  isStreaming: boolean;
  streamId: string | null;
  currentData: ObdSensorData | null;
  history: ObdSensorData[];
  error: Error | null;
  connect: () => void;
  disconnect: () => void;
  startStreaming: (config: ObdStreamConfig) => Promise<void>;
  stopStreaming: () => void;
  subscribeDevice: (deviceId: string) => void;
}

export function useObdStreaming(options: UseObdStreamingOptions): UseObdStreamingReturn {
  const clientRef = useRef<ObdWebSocketClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamId, setStreamId] = useState<string | null>(null);
  const [currentData, setCurrentData] = useState<ObdSensorData | null>(null);
  const [history, setHistory] = useState<ObdSensorData[]>([]);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    clientRef.current = new ObdWebSocketClient(options.serverUrl);

    if (options.autoConnect) {
      connect();
    }

    return () => {
      clientRef.current?.disconnect();
    };
  }, [options.serverUrl, options.token]);

  const connect = useCallback(() => {
    if (!clientRef.current) return;

    clientRef.current.connect(options.token);

    clientRef.current.onSensorData((data) => {
      setCurrentData(data);
      setHistory((prev) => [...prev.slice(-99), data]);
    });

    // Listen for connection events
    const socket = (clientRef.current as any).socket;
    if (socket) {
      socket.on('connect', () => setIsConnected(true));
      socket.on('disconnect', () => setIsConnected(false));
    }
  }, [options.token]);

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
    setIsConnected(false);
    setIsStreaming(false);
    setStreamId(null);
  }, []);

  const startStreaming = useCallback(async (config: ObdStreamConfig) => {
    try {
      const id = await clientRef.current?.startStreaming(config);
      if (id) {
        setStreamId(id);
        setIsStreaming(true);
      }
    } catch (err) {
      setError(err as Error);
    }
  }, []);

  const stopStreaming = useCallback(() => {
    if (streamId) {
      clientRef.current?.stopStreaming(streamId);
      setIsStreaming(false);
      setStreamId(null);
    }
  }, [streamId]);

  const subscribeDevice = useCallback((deviceId: string) => {
    clientRef.current?.subscribeDevice(deviceId);
  }, []);

  return {
    isConnected,
    isStreaming,
    streamId,
    currentData,
    history,
    error,
    connect,
    disconnect,
    startStreaming,
    stopStreaming,
    subscribeDevice,
  };
}
