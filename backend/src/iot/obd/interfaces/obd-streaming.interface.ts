/**
 * MechMind OS - OBD Streaming Interfaces
 */

export enum AdapterType {
  ELM327_USB = 'ELM327_USB',
  ELM327_BLUETOOTH = 'ELM327_BLUETOOTH',
  ELM327_WIFI = 'ELM327_WIFI',
  STN1110 = 'STN1110',
  STN2120 = 'STN2120',
  OBDLINK_MX = 'OBDLINK_MX',
  OBDLINK_LX = 'OBDLINK_LX',
  CUSTOM = 'CUSTOM',
}

export enum ObdProtocol {
  AUTO = 'AUTO',
  J1850_PWM = 'J1850_PWM',
  J1850_VPW = 'J1850_VPW',
  ISO9141_2 = 'ISO9141_2',
  ISO14230_4_KWP = 'ISO14230_4_KWP',
  ISO15765_4_CAN_11BIT = 'ISO15765_4_CAN_11BIT',
  ISO15765_4_CAN_29BIT = 'ISO15765_4_CAN_29BIT',
}

export interface ObdSensorData {
  timestamp?: Date;
  rpm?: number | null;
  speed?: number | null;
  coolantTemp?: number | null;
  throttlePos?: number | null;
  engineLoad?: number | null;
  fuelLevel?: number | null;
  fuelRate?: number | null;
  intakeTemp?: number | null;
  maf?: number | null;
  barometric?: number | null;
  intakeMap?: number | null;
  voltage?: number | null;
  runTime?: number | null;
  distance?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  rawData?: Record<string, any>;
}

export interface FreezeFrameData {
  id: string;
  deviceId: string;
  dtcCode: string;
  capturedAt: Date;
  data: {
    rpm?: number | null;
    speed?: number | null;
    coolantTemp?: number | null;
    throttlePos?: number | null;
    engineLoad?: number | null;
    intakeTemp?: number | null;
    mafRate?: number | null;
    fuelSystemStatus?: number | null;
    calculatedLoad?: number | null;
    absolutePressure?: number | null;
    timingAdvance?: number | null;
    intakeAirTemp?: number | null;
    airflowRate?: number | null;
    o2SensorVoltage?: number | null;
  };
  storedInDb: boolean;
}

export interface Mode06TestResult {
  testId: number;
  componentId: number;
  testName: string;
  value: number;
  minValue?: number;
  maxValue?: number;
  status: 'PASS' | 'FAIL' | 'INCOMPLETE';
  unit: string;
}

export interface Mode08EvapTest {
  id: string;
  deviceId: string;
  testType: 'LEAK' | 'PRESSURE' | 'VACUUM';
  startedAt: Date;
  completedAt?: Date;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'ABORTED';
  results: {
    pressure?: number;
    vacuum?: number;
    leakRate?: number;
    testDuration?: number;
    timestamp: Date;
  }[];
}

export interface ObdDataStream {
  id: string;
  deviceId: string;
  adapterType: AdapterType;
  protocol: ObdProtocol;
  isActive: boolean;
  startTime: Date;
  endTime?: Date;
  config: {
    sensors: string[];
    interval: number;
  };
  buffer: ObdSensorData[];
  stats: {
    packetsReceived: number;
    packetsLost: number;
    avgLatency: number;
  };
}

export interface ObdAdapterInfo {
  type: AdapterType;
  version: string;
  voltage: number;
  protocol: ObdProtocol;
  supportedPids: string[];
}

export interface ObdConnectionConfig {
  adapterType: AdapterType;
  connectionType: 'USB' | 'BLUETOOTH' | 'WIFI';
  deviceAddress?: string;
  baudRate?: number;
  protocol?: ObdProtocol;
  autoConnect?: boolean;
  timeout?: number;
}
