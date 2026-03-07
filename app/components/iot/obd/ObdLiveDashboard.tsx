'use client';

import React, { useState, useEffect } from 'react';
import { useObdStreaming } from '../../../hooks/useObdStreaming';
import { ObdSensorData } from '../../../lib/iot/obd-websocket';
import { 
  Activity, 
  Thermometer, 
  Gauge, 
  Zap, 
  Fuel,
  Timer,
  AlertTriangle,
  Play,
  Square
} from 'lucide-react';

interface ObdLiveDashboardProps {
  serverUrl: string;
  token: string;
  deviceId: string;
}

interface GaugeProps {
  value: number | undefined;
  min: number;
  max: number;
  label: string;
  unit: string;
  icon: React.ReactNode;
  warningThreshold?: number;
  criticalThreshold?: number;
}

const CircularGauge: React.FC<GaugeProps> = ({
  value,
  min,
  max,
  label,
  unit,
  icon,
  warningThreshold,
  criticalThreshold,
}) => {
  const percentage = value !== undefined 
    ? Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
    : 0;
  
  const getColor = () => {
    if (criticalThreshold !== undefined && value !== undefined && value >= criticalThreshold) {
      return 'text-red-500';
    }
    if (warningThreshold !== undefined && value !== undefined && value >= warningThreshold) {
      return 'text-amber-500';
    }
    return 'text-emerald-500';
  };

  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center p-4 bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={`${getColor()} transition-all duration-300`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`${getColor()}`}>{icon}</div>
          <span className="text-2xl font-bold text-slate-800">
            {value !== undefined ? value.toFixed(0) : '--'}
          </span>
          <span className="text-xs text-slate-500">{unit}</span>
        </div>
      </div>
      <span className="mt-2 text-sm font-medium text-slate-600">{label}</span>
    </div>
  );
};

const LinearGauge: React.FC<GaugeProps> = ({
  value,
  min,
  max,
  label,
  unit,
  warningThreshold,
  criticalThreshold,
}) => {
  const percentage = value !== undefined 
    ? Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
    : 0;

  const getColor = () => {
    if (criticalThreshold !== undefined && value !== undefined && value >= criticalThreshold) {
      return 'bg-red-500';
    }
    if (warningThreshold !== undefined && value !== undefined && value >= warningThreshold) {
      return 'bg-amber-500';
    }
    return 'bg-emerald-500';
  };

  return (
    <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-slate-600">{label}</span>
        <span className="text-lg font-bold text-slate-800">
          {value !== undefined ? `${value.toFixed(1)} ${unit}` : `-- ${unit}`}
        </span>
      </div>
      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${getColor()} transition-all duration-300 rounded-full`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export const ObdLiveDashboard: React.FC<ObdLiveDashboardProps> = ({
  serverUrl,
  token,
  deviceId,
}) => {
  const {
    isConnected,
    isStreaming,
    currentData,
    history,
    error,
    connect,
    disconnect,
    startStreaming,
    stopStreaming,
    subscribeDevice,
  } = useObdStreaming({ serverUrl, token, autoConnect: true });

  const [selectedSensors, setSelectedSensors] = useState<string[]>([
    'rpm',
    'speed',
    'coolantTemp',
    'throttlePos',
    'engineLoad',
    'fuelLevel',
    'voltage',
  ]);

  useEffect(() => {
    if (isConnected) {
      subscribeDevice(deviceId);
    }
  }, [isConnected, deviceId, subscribeDevice]);

  const handleStartStreaming = async () => {
    await startStreaming({
      deviceId,
      adapterType: 'ELM327_BLUETOOTH',
      sensors: selectedSensors,
      interval: 500,
    });
  };

  // Calculate statistics
  const stats = {
    avgRpm: history.length > 0 
      ? history.reduce((sum, d) => sum + (d.rpm || 0), 0) / history.length 
      : 0,
    maxSpeed: history.length > 0 
      ? Math.max(...history.map(d => d.speed || 0)) 
      : 0,
    avgCoolantTemp: history.length > 0 
      ? history.reduce((sum, d) => sum + (d.coolantTemp || 0), 0) / history.length 
      : 0,
  };

  // Check for alerts
  const alerts: string[] = [];
  if (currentData?.coolantTemp && currentData.coolantTemp > 100) {
    alerts.push('High coolant temperature detected!');
  }
  if (currentData?.voltage && currentData.voltage < 12.0) {
    alerts.push('Low battery voltage');
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">OBD Live Dashboard</h1>
          <p className="text-slate-500">Real-time vehicle diagnostics</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
            <span className="text-sm text-slate-600">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <button
            onClick={isStreaming ? stopStreaming : handleStartStreaming}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              isStreaming
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-emerald-500 text-white hover:bg-emerald-600'
            }`}
          >
            {isStreaming ? <Square size={18} /> : <Play size={18} />}
            {isStreaming ? 'Stop Streaming' : 'Start Streaming'}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {alerts.map((alert, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700"
            >
              <AlertTriangle size={20} />
              <span>{alert}</span>
            </div>
          ))}
        </div>
      )}

      {/* Main Gauges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <CircularGauge
          value={currentData?.rpm}
          min={0}
          max={8000}
          label="Engine RPM"
          unit="rpm"
          icon={<Activity size={24} />}
          warningThreshold={5500}
          criticalThreshold={6500}
        />
        <CircularGauge
          value={currentData?.speed}
          min={0}
          max={240}
          label="Speed"
          unit="km/h"
          icon={<Gauge size={24} />}
        />
        <CircularGauge
          value={currentData?.coolantTemp}
          min={0}
          max={130}
          label="Coolant Temp"
          unit="°C"
          icon={<Thermometer size={24} />}
          warningThreshold={95}
          criticalThreshold={105}
        />
        <CircularGauge
          value={currentData?.throttlePos}
          min={0}
          max={100}
          label="Throttle"
          unit="%"
          icon={<Zap size={24} />}
        />
      </div>

      {/* Secondary Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <LinearGauge
          value={currentData?.engineLoad}
          min={0}
          max={100}
          label="Engine Load"
          unit="%"
          warningThreshold={80}
        />
        <LinearGauge
          value={currentData?.fuelLevel}
          min={0}
          max={100}
          label="Fuel Level"
          unit="%"
          icon={<Fuel size={20} />}
        />
        <LinearGauge
          value={currentData?.voltage}
          min={10}
          max={16}
          label="Battery Voltage"
          unit="V"
          icon={<Zap size={20} />}
          warningThreshold={12.5}
        />
      </div>

      {/* Session Statistics */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Timer size={20} />
          Session Statistics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 rounded-lg">
            <span className="text-sm text-slate-500">Average RPM</span>
            <p className="text-2xl font-bold text-slate-800">{stats.avgRpm.toFixed(0)}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg">
            <span className="text-sm text-slate-500">Max Speed</span>
            <p className="text-2xl font-bold text-slate-800">{stats.maxSpeed.toFixed(0)} km/h</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg">
            <span className="text-sm text-slate-500">Avg Coolant Temp</span>
            <p className="text-2xl font-bold text-slate-800">{stats.avgCoolantTemp.toFixed(1)} °C</p>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <p className="font-medium">Error: {error.message}</p>
        </div>
      )}
    </div>
  );
};

export default ObdLiveDashboard;
