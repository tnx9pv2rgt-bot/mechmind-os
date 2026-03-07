/**
 * MechMind OS - OBD WebSocket Client
 */

import { io, Socket } from 'socket.io-client';

export interface ObdSensorData {
  timestamp: Date;
  rpm?: number;
  speed?: number;
  coolantTemp?: number;
  throttlePos?: number;
  engineLoad?: number;
  fuelLevel?: number;
  fuelRate?: number;
  voltage?: number;
}

export interface ObdStreamConfig {
  deviceId: string;
  adapterType: string;
  protocol?: string;
  sensors?: string[];
  interval?: number;
}

export class ObdWebSocketClient {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(private serverUrl: string) {}

  connect(token: string): void {
    this.socket = io(`${this.serverUrl}/obd-streaming`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('OBD WebSocket connected');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', () => {
      console.log('OBD WebSocket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('OBD WebSocket error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.socket?.disconnect();
      }
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  startStreaming(config: ObdStreamConfig): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('start-streaming', config, (response: { streamId: string }) => {
        resolve(response.streamId);
      });

      setTimeout(() => reject(new Error('Start streaming timeout')), 5000);
    });
  }

  stopStreaming(streamId: string): void {
    this.socket?.emit('stop-streaming', { streamId });
  }

  subscribeDevice(deviceId: string): void {
    this.socket?.emit('subscribe-device', { deviceId });
  }

  unsubscribeDevice(deviceId: string): void {
    this.socket?.emit('unsubscribe-device', { deviceId });
  }

  onSensorData(callback: (data: ObdSensorData) => void): void {
    this.socket?.on('sensor-data', callback);
  }

  onStreamingStarted(callback: (data: { streamId: string; deviceId: string }) => void): void {
    this.socket?.on('streaming-started', callback);
  }

  onStreamingStopped(callback: (data: { streamId: string }) => void): void {
    this.socket?.on('streaming-stopped', callback);
  }

  onFreezeFrameCaptured(callback: (data: any) => void): void {
    this.socket?.on('freeze-frame-captured', callback);
  }

  onEvapTestStarted(callback: (data: any) => void): void {
    this.socket?.on('evap-test-started', callback);
  }

  captureFreezeFrame(deviceId: string, dtcCode: string): void {
    this.socket?.emit('capture-freeze-frame', { deviceId, dtcCode });
  }

  executeEvapTest(deviceId: string, testType: 'LEAK' | 'PRESSURE' | 'VACUUM'): void {
    this.socket?.emit('execute-evap-test', { deviceId, testType });
  }

  getMode06Tests(deviceId: string): void {
    this.socket?.emit('get-mode06-tests', { deviceId });
  }

  onMode06Results(callback: (data: { deviceId: string; results: any[] }) => void): void {
    this.socket?.on('mode06-results', callback);
  }

  requestSnapshot(deviceId: string): void {
    this.socket?.emit('request-snapshot', { deviceId });
  }

  onSnapshot(callback: (data: { deviceId: string; data: ObdSensorData | null }) => void): void {
    this.socket?.on('snapshot', callback);
  }
}
