/**
 * MechMind OS - OBD Service
 * 
 * Manages OBD device connections and data:
 * - Device registration and pairing
 * - Real-time sensor data collection
 * - Trouble code (DTC) management
 * - Vehicle health reports
 * - Predictive maintenance alerts
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import {
  RegisterDeviceDto,
  UpdateDeviceDto,
  ObdReadingDto,
  TroubleCodeDto,
  ClearTroubleCodesDto,
  ObdDeviceResponseDto,
  ObdReadingResponseDto,
  TroubleCodeResponseDto,
  VehicleHealthReportDto,
} from '../dto/obd.dto';
import { TroubleCodeSeverity } from '@prisma/client';

@Injectable()
export class ObdService {
  // DTC severity mapping based on code prefixes
  private readonly DTC_SEVERITY_MAP: Record<string, TroubleCodeSeverity> = {
    'P01': TroubleCodeSeverity.MEDIUM, // Fuel and Air Metering
    'P02': TroubleCodeSeverity.HIGH,   // Fuel and Air Metering (Injector Circuit)
    'P03': TroubleCodeSeverity.HIGH,   // Ignition System
    'P04': TroubleCodeSeverity.MEDIUM, // Auxiliary Emissions Controls
    'P05': TroubleCodeSeverity.LOW,    // Vehicle Speed Controls
    'P06': TroubleCodeSeverity.HIGH,   // Computer Output Circuit
    'P07': TroubleCodeSeverity.MEDIUM, // Transmission
    'P08': TroubleCodeSeverity.HIGH,   // Transmission
    'P0A': TroubleCodeSeverity.HIGH,   // Hybrid Powertrain
    'B00': TroubleCodeSeverity.MEDIUM, // Body
    'C00': TroubleCodeSeverity.HIGH,   // Chassis (ABS, etc.)
    'U00': TroubleCodeSeverity.HIGH,   // Network
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Register a new OBD device
   */
  async registerDevice(tenantId: string, dto: RegisterDeviceDto): Promise<ObdDeviceResponseDto> {
    const device = await this.prisma.obdDevice.create({
      data: {
        tenantId,
        serialNumber: dto.serialNumber,
        name: dto.name,
        model: dto.model ?? '',
        vehicleId: dto.vehicleId,
        isActive: true,
      },
      include: { vehicle: true },
    });

    return this.mapDeviceToDto(device);
  }

  /**
   * Get device by ID
   */
  async getDevice(tenantId: string, deviceId: string): Promise<ObdDeviceResponseDto> {
    const device = await this.prisma.obdDevice.findFirst({
      where: { id: deviceId, tenantId },
      include: { vehicle: true },
    });

    if (!device) {
      throw new NotFoundException('OBD device not found');
    }

    return this.mapDeviceToDto(device);
  }

  /**
   * List all devices for tenant
   */
  async listDevices(tenantId: string, vehicleId?: string): Promise<ObdDeviceResponseDto[]> {
    const devices = await this.prisma.obdDevice.findMany({
      where: { 
        tenantId,
        ...(vehicleId && { vehicleId }),
      },
      include: { vehicle: true },
      orderBy: { lastConnected: 'desc' },
    });

    return devices.map(d => this.mapDeviceToDto(d));
  }

  /**
   * Update device
   */
  async updateDevice(
    tenantId: string,
    deviceId: string,
    dto: UpdateDeviceDto,
  ): Promise<ObdDeviceResponseDto> {
    const device = await this.prisma.obdDevice.update({
      where: { id: deviceId, tenantId },
      data: dto,
      include: { vehicle: true },
    });

    return this.mapDeviceToDto(device);
  }

  /**
   * Record OBD reading
   */
  async recordReading(dto: ObdReadingDto, tenantId: string): Promise<ObdReadingResponseDto> {
    const reading = await this.prisma.obdReading.create({
      data: {
        tenantId,
        deviceId: dto.deviceId,
        rpm: dto.rpm,
        speed: dto.speed,
        coolantTemp: dto.coolantTemp,
        engineLoad: dto.engineLoad,
        fuelLevel: dto.fuelLevel,
        fuelRate: dto.fuelRate,
        intakeTemp: dto.intakeTemp,
        maf: dto.maf,
        barometric: dto.barometric,
        intakeMap: dto.intakeMap,
        throttlePos: dto.throttlePos,
        voltage: dto.voltage,
        runTime: dto.runTime,
        distance: dto.distance,
        rawData: dto.rawData,
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });

    // Update device last connected
    await this.prisma.obdDevice.update({
      where: { id: dto.deviceId },
      data: { lastConnected: new Date() },
    });

    // Check for anomalies
    await this.checkAnomalies(dto.deviceId, dto);

    return this.mapReadingToDto(reading);
  }

  /**
   * Get readings for device/vehicle
   */
  async getReadings(
    tenantId: string,
    filters: { deviceId?: string; vehicleId?: string; from?: Date; to?: Date; limit?: number },
  ): Promise<ObdReadingResponseDto[]> {
    const readings = await this.prisma.obdReading.findMany({
      where: {
        device: { tenantId },
        ...(filters.deviceId && { deviceId: filters.deviceId }),
        ...(filters.vehicleId && { device: { vehicleId: filters.vehicleId } }),
        ...(filters.from && { recordedAt: { gte: filters.from } }),
        ...(filters.to && { recordedAt: { lte: filters.to } }),
      },
      orderBy: { recordedAt: 'desc' },
      take: filters.limit || 100,
    });

    return readings.map(r => this.mapReadingToDto(r));
  }

  /**
   * Get latest reading
   */
  async getLatestReading(tenantId: string, deviceId: string): Promise<ObdReadingResponseDto | null> {
    const reading = await this.prisma.obdReading.findFirst({
      where: { deviceId, device: { tenantId } },
      orderBy: { recordedAt: 'desc' },
    });

    return reading ? this.mapReadingToDto(reading) : null;
  }

  /**
   * Record trouble codes
   */
  async recordTroubleCodes(deviceId: string, codes: TroubleCodeDto[], tenantId: string): Promise<void> {
    const device = await this.prisma.obdDevice.findUnique({
      where: { id: deviceId },
      include: { tenant: true, vehicle: true },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    // Get latest reading for snapshot
    const latestReading = await this.prisma.obdReading.findFirst({
      where: { deviceId },
      orderBy: { recordedAt: 'desc' },
    });

    for (const code of codes) {
      // Determine severity if not provided
      const severity = code.severity || this.getSeverityFromCode(code.code);

      // Check if code already exists
      const existing = await this.prisma.obdTroubleCode.findFirst({
        where: { deviceId, code: code.code, isActive: true },
      });

      if (existing) {
        // Update last seen
        await this.prisma.obdTroubleCode.update({
          where: { id: existing.id },
          data: { lastSeenAt: new Date() },
        });
      } else {
        // Create new code
        const newCode = await this.prisma.obdTroubleCode.create({
          data: {
            deviceId,
            code: code.code,
            category: code.category || this.getCategoryFromCode(code.code),
            severity,
            description: code.description,
            symptoms: code.symptoms,
            causes: code.causes,
            isPending: code.isPending ?? false,
            isPermanent: code.isPermanent ?? false,
            readingSnapshot: latestReading?.rawData ?? undefined,
          },
        });

        // Notify if critical
        if (severity === TroubleCodeSeverity.CRITICAL || severity === TroubleCodeSeverity.HIGH) {
          await this.notifications.sendToTenant(device.tenantId, {
            title: `Vehicle Alert: ${code.code}`,
            body: `${device.vehicle?.make} ${device.vehicle?.model}: ${code.description}`,
            priority: severity === TroubleCodeSeverity.CRITICAL ? 'high' : 'normal',
            data: {
              type: 'OBD_TROUBLE_CODE',
              codeId: newCode.id,
              vehicleId: device.vehicleId,
              deviceId,
            },
          });
        }
      }
    }
  }

  /**
   * Get trouble codes
   */
  async getTroubleCodes(
    tenantId: string,
    filters: { deviceId?: string; vehicleId?: string; active?: boolean },
  ): Promise<TroubleCodeResponseDto[]> {
    const codes = await this.prisma.obdTroubleCode.findMany({
      where: {
        device: { tenantId },
        ...(filters.deviceId && { deviceId: filters.deviceId }),
        ...(filters.vehicleId && { device: { vehicleId: filters.vehicleId } }),
        ...(filters.active !== undefined && { isActive: filters.active }),
      },
      orderBy: [{ severity: 'desc' }, { firstSeenAt: 'desc' }],
    });

    return codes.map(c => this.mapTroubleCodeToDto(c));
  }

  /**
   * Clear trouble codes
   */
  async clearTroubleCodes(
    tenantId: string,
    deviceId: string,
    dto: ClearTroubleCodesDto,
  ): Promise<void> {
    await this.prisma.obdTroubleCode.updateMany({
      where: { deviceId, device: { tenantId }, isActive: true },
      data: {
        isActive: false,
        clearedAt: new Date(),
        clearedBy: dto.clearedBy,
      },
    });
  }

  /**
   * Generate vehicle health report
   */
  async generateHealthReport(tenantId: string, vehicleId: string): Promise<VehicleHealthReportDto> {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, customer: { tenantId } },
      include: {
        obdDevices: {
          include: {
            readings: { orderBy: { recordedAt: 'desc' }, take: 1 },
            dtcs: { where: { isActive: true } },
          },
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    // Aggregate data from all devices
    const allReadings = vehicle.obdDevices.flatMap(d => d.readings);
    const allCodes = vehicle.obdDevices.flatMap(d => d.dtcs);
    
    const latestReading = allReadings.sort(
      (a, b) => b.recordedAt.getTime() - a.recordedAt.getTime()
    )[0];

    const activeCodes = allCodes.filter(c => c.isActive && !c.isPending).length;
    const pendingCodes = allCodes.filter(c => c.isActive && c.isPending).length;

    // Calculate health score
    let score = 100;
    const recommendations: string[] = [];

    // Deduct for trouble codes
    allCodes.forEach(code => {
      if (!code.isActive) return;
      
      switch (code.severity) {
        case TroubleCodeSeverity.CRITICAL:
          score -= 30;
          recommendations.push(`CRITICAL: ${code.code} - ${code.description}. Immediate attention required.`);
          break;
        case TroubleCodeSeverity.HIGH:
          score -= 15;
          recommendations.push(`HIGH: ${code.code} - ${code.description}. Schedule service soon.`);
          break;
        case TroubleCodeSeverity.MEDIUM:
          score -= 5;
          recommendations.push(`MEDIUM: ${code.code} - ${code.description}. Monitor and address when possible.`);
          break;
        case TroubleCodeSeverity.LOW:
          score -= 2;
          recommendations.push(`LOW: ${code.code} - ${code.description}. Minor issue.`);
          break;
      }
    });

    // Check sensor readings
    if (latestReading) {
      if (latestReading.coolantTemp && latestReading.coolantTemp > 100) {
        score -= 20;
        recommendations.push('Engine overheating detected. Check cooling system immediately.');
      }
      if (latestReading.voltage && latestReading.voltage < 12.0) {
        score -= 10;
        recommendations.push('Low battery voltage. Have battery tested.');
      }
      if (latestReading.engineLoad && latestReading.engineLoad > 90) {
        recommendations.push('High engine load detected. Check for transmission issues.');
      }
    }

    // Ensure score is within bounds
    score = Math.max(0, Math.min(100, score));

    // Determine status
    let overallStatus: VehicleHealthReportDto['overallStatus'];
    if (score >= 90) overallStatus = 'EXCELLENT';
    else if (score >= 75) overallStatus = 'GOOD';
    else if (score >= 50) overallStatus = 'FAIR';
    else if (score >= 25) overallStatus = 'POOR';
    else overallStatus = 'CRITICAL';

    return {
      vehicleId,
      vehicleInfo: `${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})`,
      overallStatus,
      score,
      activeCodes,
      pendingCodes,
      lastReading: latestReading ? this.mapReadingToDto(latestReading) : undefined,
      recommendations: recommendations.length > 0 ? recommendations : ['No issues detected. Vehicle is in good condition.'],
    };
  }

  // ============== PRIVATE METHODS ==============

  private getSeverityFromCode(code: string): TroubleCodeSeverity {
    const prefix = code.substring(0, 3).toUpperCase();
    return this.DTC_SEVERITY_MAP[prefix] || TroubleCodeSeverity.MEDIUM;
  }

  private getCategoryFromCode(code: string): string {
    const type = code.charAt(0);
    switch (type) {
      case 'P': return 'POWERTRAIN';
      case 'B': return 'BODY';
      case 'C': return 'CHASSIS';
      case 'U': return 'NETWORK';
      default: return 'UNKNOWN';
    }
  }

  private async checkAnomalies(deviceId: string, reading: ObdReadingDto): Promise<void> {
    // Check for critical values
    if (reading.coolantTemp && reading.coolantTemp > 110) {
      const device = await this.prisma.obdDevice.findUnique({
        where: { id: deviceId },
        include: { tenant: true },
      });
      
      if (device) {
        await this.notifications.sendToTenant(device.tenantId, {
          title: '⚠️ Critical Engine Temperature',
          body: `Engine temperature: ${reading.coolantTemp}°C. Immediate attention required.`,
          priority: 'high',
          data: { type: 'CRITICAL_TEMP', deviceId, reading },
        });
      }
    }
  }

  private mapDeviceToDto(device: any): ObdDeviceResponseDto {
    return {
      id: device.id,
      serialNumber: device.serialNumber,
      name: device.name ?? undefined,
      model: device.model ?? undefined,
      isActive: device.isActive,
      lastConnected: device.lastConnected ?? undefined,
      batteryLevel: device.batteryLevel ?? undefined,
      vehicle: device.vehicle ? {
        id: device.vehicle.id,
        make: device.vehicle.make,
        model: device.vehicle.model,
        licensePlate: device.vehicle.licensePlate,
      } : undefined,
    };
  }

  private mapReadingToDto(reading: any): ObdReadingResponseDto {
    return {
      id: reading.id,
      recordedAt: reading.recordedAt,
      rpm: reading.rpm ?? undefined,
      speed: reading.speed ?? undefined,
      coolantTemp: reading.coolantTemp ?? undefined,
      engineLoad: reading.engineLoad ?? undefined,
      fuelLevel: reading.fuelLevel ?? undefined,
      fuelRate: reading.fuelRate ?? undefined,
      throttlePos: reading.throttlePos ?? undefined,
      voltage: reading.voltage ?? undefined,
      latitude: reading.latitude ?? undefined,
      longitude: reading.longitude ?? undefined,
    };
  }

  private mapTroubleCodeToDto(code: any): TroubleCodeResponseDto {
    return {
      id: code.id,
      code: code.code,
      category: code.category,
      severity: code.severity,
      description: code.description,
      symptoms: code.symptoms ?? undefined,
      causes: code.causes ?? undefined,
      isActive: code.isActive,
      isPending: code.isPending,
      firstSeenAt: code.firstSeenAt,
      lastSeenAt: code.lastSeenAt,
      clearedAt: code.clearedAt ?? undefined,
    };
  }
}
