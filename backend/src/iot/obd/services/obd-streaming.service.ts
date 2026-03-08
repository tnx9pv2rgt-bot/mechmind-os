/**
 * MechMind OS - OBD Streaming Service
 * 
 * Real-time OBD data streaming via WebSocket
 * - Live sensor data streaming
 * - Freeze frame capture
 * - Mode $06 test results
 * - Mode $08 EVAP test support
 * - Time-series data optimization
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/services/prisma.service';
import { NotificationsService } from '../../../notifications/services/notifications.service';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import {
  ObdSensorData,
  FreezeFrameData,
  Mode06TestResult,
  Mode08EvapTest,
  ObdDataStream,
  AdapterType,
  ObdProtocol,
} from '../interfaces/obd-streaming.interface';

@Injectable()
export class ObdStreamingService {
  private readonly logger = new Logger(ObdStreamingService.name);
  private activeStreams = new Map<string, ObdDataStream>();
  
  // Sensor polling intervals (ms)
  private readonly SENSOR_INTERVALS = {
    CRITICAL: 100,   // RPM, Speed - 10Hz
    HIGH: 500,       // Coolant temp, Throttle - 2Hz
    MEDIUM: 1000,    // Other sensors - 1Hz
    LOW: 5000,       // Fuel level, etc - 0.2Hz
  };

  // OBD-II PIDs (Parameter IDs)
  private readonly PIDS = {
    // Real-time data
    RPM: '010C',
    SPEED: '010D',
    COOLANT_TEMP: '0105',
    THROTTLE_POS: '0111',
    ENGINE_LOAD: '0104',
    INTAKE_TEMP: '010F',
    MAF_RATE: '0110',
    FUEL_LEVEL: '012F',
    VOLTAGE: '0142',
    DISTANCE: '0131',
    RUN_TIME: '011F',
    
    // Freeze frame
    FREEZE_FRAME: '0202',
    
    // Mode $06
    MODE_06_REQUEST: '0600',
    
    // Mode $08
    MODE_08_REQUEST: '0800',
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  /**
   * Start real-time data streaming for a device
   */
  async startStreaming(
    deviceId: string,
    config: {
      adapterType: AdapterType;
      protocol?: ObdProtocol;
      sensors?: string[];
      interval?: number;
    },
  ): Promise<ObdDataStream> {
    const streamId = `stream:${deviceId}:${Date.now()}`;
    
    const stream: ObdDataStream = {
      id: streamId,
      deviceId,
      adapterType: config.adapterType,
      protocol: config.protocol || ObdProtocol.AUTO,
      isActive: true,
      startTime: new Date(),
      config: {
        sensors: config.sensors || this.getDefaultSensors(),
        interval: config.interval || this.SENSOR_INTERVALS.HIGH,
      },
      buffer: [],
      stats: {
        packetsReceived: 0,
        packetsLost: 0,
        avgLatency: 0,
      },
    };

    this.activeStreams.set(streamId, stream);
    
    // Store stream metadata in Redis
    await this.redis.setex(
      `obd:stream:${deviceId}`,
      3600, // 1 hour TTL
      JSON.stringify({
        streamId,
        startedAt: stream.startTime.toISOString(),
        config: stream.config,
      }),
    );

    this.logger.log(`Started OBD stream ${streamId} for device ${deviceId}`);
    
    return stream;
  }

  /**
   * Stop streaming session
   */
  async stopStreaming(streamId: string): Promise<void> {
    const stream = this.activeStreams.get(streamId);
    if (!stream) return;

    stream.isActive = false;
    stream.endTime = new Date();
    
    // Flush remaining buffer to time-series DB
    if (stream.buffer.length > 0) {
      await this.flushBuffer(streamId);
    }

    // Clear Redis
    await this.redis.del(`obd:stream:${stream.deviceId}`);
    
    this.activeStreams.delete(streamId);
    
    this.logger.log(`Stopped OBD stream ${streamId}`);
  }

  /**
   * Process incoming sensor data
   */
  async processSensorData(
    streamId: string,
    data: ObdSensorData,
  ): Promise<void> {
    const stream = this.activeStreams.get(streamId);
    if (!stream || !stream.isActive) return;

    // Add timestamp if missing
    if (!data.timestamp) {
      data.timestamp = new Date();
    }

    // Update stats
    stream.stats.packetsReceived++;
    
    // Add to buffer for batch processing
    stream.buffer.push(data);

    // Check for critical values
    await this.checkCriticalValues(stream.deviceId, data);

    // Publish to Redis for real-time subscribers
    await this.redis.publish(
      `obd:live:${stream.deviceId}`,
      JSON.stringify(data),
    );

    // Flush buffer if full
    if (stream.buffer.length >= 100) {
      await this.flushBuffer(streamId);
    }
  }

  /**
   * Capture freeze frame data
   */
  async captureFreezeFrame(
    deviceId: string,
    dtcCode: string,
  ): Promise<FreezeFrameData> {
    const device = await this.prisma.obdDevice.findUnique({
      where: { id: deviceId },
      include: { vehicle: true },
    });

    if (!device) {
      throw new Error('Device not found');
    }

    // In real implementation, this would query the OBD device
    // For now, return mock structure
    const freezeFrame: FreezeFrameData = {
      id: `ff:${deviceId}:${Date.now()}`,
      deviceId,
      dtcCode,
      capturedAt: new Date(),
      data: {
        rpm: await this.queryPid(deviceId, this.PIDS.RPM),
        speed: await this.queryPid(deviceId, this.PIDS.SPEED),
        coolantTemp: await this.queryPid(deviceId, this.PIDS.COOLANT_TEMP),
        throttlePos: await this.queryPid(deviceId, this.PIDS.THROTTLE_POS),
        engineLoad: await this.queryPid(deviceId, this.PIDS.ENGINE_LOAD),
        intakeTemp: await this.queryPid(deviceId, this.PIDS.INTAKE_TEMP),
        mafRate: await this.queryPid(deviceId, this.PIDS.MAF_RATE),
        fuelSystemStatus: await this.queryPid(deviceId, '0103'),
        calculatedLoad: await this.queryPid(deviceId, this.PIDS.ENGINE_LOAD),
        absolutePressure: await this.queryPid(deviceId, '010B'),
        timingAdvance: await this.queryPid(deviceId, '010E'),
        intakeAirTemp: await this.queryPid(deviceId, this.PIDS.INTAKE_TEMP),
        airflowRate: await this.queryPid(deviceId, this.PIDS.MAF_RATE),
        o2SensorVoltage: await this.queryPid(deviceId, '0114'),
      },
      storedInDb: false,
    };

    // Store freeze frame
    await this.prisma.obdFreezeFrame.create({
      data: {
        deviceId,
        dtcCode,
        data: freezeFrame.data as any,
        capturedAt: freezeFrame.capturedAt,
      },
    });

    freezeFrame.storedInDb = true;

    this.logger.log(`Captured freeze frame for ${dtcCode} on device ${deviceId}`);
    
    return freezeFrame;
  }

  /**
   * Get Mode $06 test results
   */
  async getMode06Tests(deviceId: string): Promise<Mode06TestResult[]> {
    const device = await this.prisma.obdDevice.findUnique({
      where: { id: deviceId },
    });

    if (!device) {
      throw new Error('Device not found');
    }

    // Query supported tests
    const supportedTestsNum = await this.queryPid(deviceId, this.PIDS.MODE_06_REQUEST);
    const supportedTests = supportedTestsNum !== null ? supportedTestsNum.toString(16) : null;
    
    const results: Mode06TestResult[] = [];
    
    // Parse supported tests and query each
    for (let testId = 0; testId < 255; testId++) {
      if (this.isTestSupported(supportedTests, testId)) {
        const testResult = await this.queryMode06Test(deviceId, testId);
        if (testResult) {
          results.push(testResult);
        }
      }
    }

    // Store results
    if (results.length > 0) {
      await this.prisma.obdMode06Result.createMany({
        data: results.map(r => ({
          deviceId,
          testId: r.testId.toString(),
          componentId: r.componentId?.toString(),
          testName: r.testName,
          value: r.value,
          minValue: r.minValue,
          maxValue: r.maxValue,
          status: r.status,
          unit: r.unit,
          recordedAt: new Date(),
        })),
      });
    }

    return results;
  }

  /**
   * Execute Mode $08 EVAP test
   */
  async executeEvapTest(
    deviceId: string,
    testType: 'LEAK' | 'PRESSURE' | 'VACUUM',
  ): Promise<Mode08EvapTest> {
    const device = await this.prisma.obdDevice.findUnique({
      where: { id: deviceId },
      include: { vehicle: true },
    });

    if (!device) {
      throw new Error('Device not found');
    }

    this.logger.log(`Starting EVAP ${testType} test on device ${deviceId}`);

    const test: Mode08EvapTest = {
      id: `evap:${deviceId}:${Date.now()}`,
      deviceId,
      testType,
      startedAt: new Date(),
      status: 'RUNNING',
      results: [],
    };

    // Store test record
    const dbTest = await this.prisma.obdEvapTest.create({
      data: {
        deviceId,
        testType,
        status: 'RUNNING',
        startedAt: test.startedAt,
      },
    });

    test.id = dbTest.id;

    // In real implementation, this would trigger the actual EVAP test
    // and monitor results via OBD commands
    
    return test;
  }

  /**
   * Get active stream for device
   */
  getActiveStream(deviceId: string): ObdDataStream | undefined {
    for (const stream of this.activeStreams.values()) {
      if (stream.deviceId === deviceId && stream.isActive) {
        return stream;
      }
    }
    return undefined;
  }

  /**
   * Get all active streams
   */
  getAllActiveStreams(): ObdDataStream[] {
    return Array.from(this.activeStreams.values()).filter(s => s.isActive);
  }

  /**
   * Get sensor history from time-series storage
   */
  async getSensorHistory(
    deviceId: string,
    sensor: string,
    from: Date,
    to: Date,
    aggregation?: 'avg' | 'min' | 'max' | 'count',
  ): Promise<{ timestamp: Date; value: number }[]> {
    // Query from time-series optimized storage
    // In production, this would query InfluxDB/TimescaleDB
    
    const cacheKey = `obd:history:${deviceId}:${sensor}:${from.getTime()}:${to.getTime()}`;
    const cached = await this.redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    // Query from database
    const readings = await this.prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('minute', "recordedAt") as timestamp,
        ${aggregation === 'avg' ? 'AVG' : aggregation === 'min' ? 'MIN' : aggregation === 'max' ? 'MAX' : 'COUNT'}("${sensor}") as value
      FROM "ObdReading"
      WHERE "deviceId" = ${deviceId}
        AND "recordedAt" >= ${from}
        AND "recordedAt" <= ${to}
      GROUP BY DATE_TRUNC('minute', "recordedAt")
      ORDER BY timestamp
    `;

    const result = (readings as any[]).map(r => ({
      timestamp: r.timestamp,
      value: Number(r.value),
    }));

    // Cache for 5 minutes
    await this.redis.setex(cacheKey, 300, JSON.stringify(result));

    return result;
  }

  /**
   * Apply data retention policy
   */
  async applyRetentionPolicy(deviceId: string, days: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Archive to cold storage before deletion
    const toArchive = await this.prisma.obdReading.findMany({
      where: {
        deviceId,
        recordedAt: { lt: cutoffDate },
      },
    });

    // Archive to S3 (mock implementation)
    if (toArchive.length > 0) {
      await this.archiveToColdStorage(deviceId, toArchive);
    }

    // Delete old records
    const result = await this.prisma.obdReading.deleteMany({
      where: {
        deviceId,
        recordedAt: { lt: cutoffDate },
      },
    });

    this.logger.log(`Applied retention policy for ${deviceId}: deleted ${result.count} records`);

    return result.count;
  }

  // ============== PRIVATE METHODS ==============

  private getDefaultSensors(): string[] {
    return [
      'rpm',
      'speed',
      'coolantTemp',
      'throttlePos',
      'engineLoad',
      'fuelLevel',
      'voltage',
    ];
  }

  private async queryPid(deviceId: string, pid: string): Promise<number | null> {
    // In real implementation, this would send OBD command via adapter
    // For now, return null (device will provide actual data)
    return null;
  }

  private async queryMode06Test(
    deviceId: string,
    testId: number,
  ): Promise<Mode06TestResult | null> {
    // Mock implementation - would query actual OBD device
    return null;
  }

  private isTestSupported(supportedMask: string | null, testId: number): boolean {
    if (!supportedMask) return false;
    // Parse bit mask to determine test support
    const byteIndex = Math.floor(testId / 8);
    const bitIndex = testId % 8;
    const byte = parseInt(supportedMask.substr(byteIndex * 2, 2), 16);
    return (byte & (1 << bitIndex)) !== 0;
  }

  private async checkCriticalValues(
    deviceId: string,
    data: ObdSensorData,
  ): Promise<void> {
    const alerts: string[] = [];

    if (data.coolantTemp && data.coolantTemp > 110) {
      alerts.push(`Critical coolant temperature: ${data.coolantTemp}°C`);
    }
    if (data.voltage && data.voltage < 11.0) {
      alerts.push(`Low battery voltage: ${data.voltage}V`);
    }
    if (data.rpm && data.rpm > 6000) {
      alerts.push(`High RPM: ${data.rpm}`);
    }

    if (alerts.length > 0) {
      const device = await this.prisma.obdDevice.findUnique({
        where: { id: deviceId },
        include: { tenant: true, vehicle: true },
      });

      if (device) {
        await this.notifications.sendToTenant(device.tenantId, {
          title: '⚠️ OBD Alert',
          body: `${device.vehicle?.make} ${device.vehicle?.model}: ${alerts.join(', ')}`,
          priority: 'high',
          data: {
            type: 'OBD_CRITICAL',
            deviceId,
            alerts,
          },
        });
      }
    }
  }

  private async flushBuffer(streamId: string): Promise<void> {
    const stream = this.activeStreams.get(streamId);
    if (!stream || stream.buffer.length === 0) return;

    const batch = stream.buffer.splice(0, stream.buffer.length);

    // Batch insert to database
    await this.prisma.obdReading.createMany({
      data: batch.map(data => ({
        deviceId: stream.deviceId,
        rpm: data.rpm,
        speed: data.speed,
        coolantTemp: data.coolantTemp,
        engineLoad: data.engineLoad,
        fuelLevel: data.fuelLevel,
        throttlePos: data.throttlePos,
        voltage: data.voltage,
        recordedAt: data.timestamp || new Date(),
      })),
      skipDuplicates: true,
    });

    // Also write to time-series optimized storage (Redis for recent, TimescaleDB for historical)
    const pipeline = this.redis.pipeline();
    
    for (const data of batch) {
      const key = `obd:ts:${stream.deviceId}:${data.timestamp?.getTime() || Date.now()}`;
      pipeline.setex(key, 86400, JSON.stringify(data)); // 24h TTL
    }
    
    await pipeline.exec();
  }

  private async archiveToColdStorage(
    deviceId: string,
    data: any[],
  ): Promise<void> {
    // In production, this would upload to S3 or similar
    this.logger.log(`Archiving ${data.length} records for ${deviceId} to cold storage`);
  }
}
