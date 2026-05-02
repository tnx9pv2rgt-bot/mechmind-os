/**
 * MechMind OS - AI Scheduling: Optimize Day DTO
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class OptimizeDayDto {
  @ApiProperty({ description: 'Data da ottimizzare (ISO)', example: '2026-03-30' })
  @IsDateString()
  date!: string;
}

export interface ScheduleEntry {
  bookingId: string;
  startTime: string;
  endTime: string;
  serviceType: string;
  technicianId: string;
  technicianName: string;
  bayId: string;
}

export interface OptimizeDayResult {
  currentOrder: ScheduleEntry[];
  optimizedOrder: ScheduleEntry[];
  estimatedTimeSavedMinutes: number;
}

export interface CapacityDay {
  date: string;
  totalSlots: number;
  bookedSlots: number;
  utilizationPercent: number;
  availableTechnicians: number;
  availableBays: number;
}
