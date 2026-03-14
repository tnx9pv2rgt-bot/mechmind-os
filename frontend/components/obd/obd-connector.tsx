'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bluetooth,
  Wifi,
  Search,
  CheckCircle,
  XCircle,
  RefreshCw,
  Smartphone,
  Usb,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OBDDevice, OBDConnectionStatus } from '@/types/obd';

interface OBDConnectorProps {
  onConnect: (device: OBDDevice) => void;
  onDisconnect: () => void;
  connectionStatus: OBDConnectionStatus;
  connectedDevice?: OBDDevice;
}

export function OBDConnector({
  onConnect,
  onDisconnect,
  connectionStatus,
  connectedDevice,
}: OBDConnectorProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [foundDevices, setFoundDevices] = useState<OBDDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<OBDDevice | null>(null);
  const [connectionMethod, setConnectionMethod] = useState<'bluetooth' | 'wifi' | 'usb'>(
    'bluetooth'
  );

  const startScan = async () => {
    setIsScanning(true);
    setFoundDevices([]);
    try {
      // Try real WebSocket-based OBD scan via backend
      const res = await fetch('/api/obd/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: connectionMethod }),
      });
      if (res.ok) {
        const data = await res.json();
        setFoundDevices(data.devices || []);
      }
    } catch {
      // Backend unavailable — no devices found
    } finally {
      setIsScanning(false);
    }
  };

  const handleConnect = (device: OBDDevice) => {
    setSelectedDevice(device);
    onConnect(device);
  };

  return (
    <Card className='max-w-md mx-auto'>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <RefreshCw className='h-5 w-5' />
          Connessione OBD-II
        </CardTitle>
        <CardDescription>
          Collega un dongle OBD per monitorare il veicolo in tempo reale
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-6'>
        {/* Connection Method */}
        <div className='grid grid-cols-3 gap-2'>
          {[
            { id: 'bluetooth', label: 'Bluetooth', icon: Bluetooth },
            { id: 'wifi', label: 'WiFi', icon: Wifi },
            { id: 'usb', label: 'USB', icon: Usb },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setConnectionMethod(id as 'bluetooth' | 'wifi' | 'usb')}
              className={cn(
                'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors',
                connectionMethod === id
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <Icon className='h-6 w-6' />
              <span className='text-xs font-medium'>{label}</span>
            </button>
          ))}
        </div>

        {/* Connection Status */}
        {connectionStatus === 'connected' && connectedDevice ? (
          <div className='p-4 bg-green-50 border border-green-200 rounded-lg'>
            <div className='flex items-center gap-3'>
              <div className='w-3 h-3 bg-green-500 rounded-full animate-pulse' />
              <div className='flex-1'>
                <p className='font-medium text-green-800'>{connectedDevice.name}</p>
                <p className='text-sm text-green-600'>{connectedDevice.macAddress}</p>
              </div>
              <Badge variant='outline' className='bg-white'>
                {connectedDevice.protocol}
              </Badge>
            </div>
            <Button variant='outline' size='sm' className='w-full mt-3' onClick={onDisconnect}>
              <XCircle className='h-4 w-4 mr-2' />
              Disconnetti
            </Button>
          </div>
        ) : (
          <>
            {/* Scan Button */}
            <Button
              className='w-full'
              onClick={startScan}
              disabled={isScanning || connectionStatus === 'connecting'}
            >
              {isScanning ? (
                <>
                  <RefreshCw className='h-4 w-4 mr-2 animate-spin' />
                  Scansione in corso...
                </>
              ) : connectionStatus === 'connecting' ? (
                <>
                  <RefreshCw className='h-4 w-4 mr-2 animate-spin' />
                  Connessione...
                </>
              ) : (
                <>
                  <Search className='h-4 w-4 mr-2' />
                  Cerca Dispositivi
                </>
              )}
            </Button>

            {/* Device List */}
            {foundDevices.length > 0 && (
              <div className='space-y-2'>
                <p className='text-sm font-medium text-gray-600'>Dispositivi trovati:</p>
                {foundDevices.map(device => (
                  <button
                    key={device.id}
                    onClick={() => handleConnect(device)}
                    disabled={connectionStatus === 'connecting'}
                    className={cn(
                      'w-full p-3 rounded-lg border text-left transition-colors',
                      selectedDevice?.id === device.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-3'>
                        <div className='w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center'>
                          <Smartphone className='h-5 w-5 text-gray-600' />
                        </div>
                        <div>
                          <p className='font-medium'>{device.name}</p>
                          <p className='text-sm text-gray-500'>{device.macAddress}</p>
                        </div>
                      </div>
                      <Badge variant='outline'>{device.protocol}</Badge>
                    </div>
                    {device.firmwareVersion && (
                      <p className='text-xs text-gray-400 mt-2'>
                        Firmware: {device.firmwareVersion}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Instructions */}
        <div className='text-xs text-gray-500 space-y-1'>
          <p>1. Inserisci il dongle OBD nella porta del veicolo</p>
          <p>2. Accendi il quadro (senza avviare il motore)</p>
          <p>3. Cerca e seleziona il dispositivo</p>
          <p>4. Accetta l&apos;accoppiamento Bluetooth se richiesto</p>
        </div>
      </CardContent>
    </Card>
  );
}
