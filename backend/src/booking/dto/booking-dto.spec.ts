import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { BookingSource } from '@prisma/client';
import { FindAvailableSlotsDto, CreateSlotDto } from './booking-slot.dto';
import { RescheduleBookingDto } from './reschedule-booking.dto';
import {
  CreateBookingDto,
  ReserveSlotDto,
  UpdateBookingDto,
  CalendarQueryDto,
} from './create-booking.dto';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_DATE = '2026-04-01T09:00:00Z';

describe('Booking DTOs validation', () => {
  describe('RescheduleBookingDto', () => {
    it('should pass with all fields valid', async () => {
      const dto = plainToInstance(RescheduleBookingDto, {
        newDate: VALID_DATE,
        newSlotId: VALID_UUID,
        reason: 'Customer request',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass without optional fields', async () => {
      const dto = plainToInstance(RescheduleBookingDto, { newDate: VALID_DATE });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail when newDate is missing', async () => {
      const dto = plainToInstance(RescheduleBookingDto, { newSlotId: VALID_UUID });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'newDate')).toBe(true);
    });

    it('should fail when newDate is not a date string', async () => {
      const dto = plainToInstance(RescheduleBookingDto, { newDate: 'not-a-date' });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'newDate')).toBe(true);
    });

    it('should fail when newSlotId is not a valid UUID', async () => {
      const dto = plainToInstance(RescheduleBookingDto, {
        newDate: VALID_DATE,
        newSlotId: 'not-a-uuid',
      });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'newSlotId')).toBe(true);
    });
  });

  describe('FindAvailableSlotsDto', () => {
    it('should pass with all fields valid', async () => {
      const dto = plainToInstance(FindAvailableSlotsDto, {
        date: '2026-04-01',
        serviceId: VALID_UUID,
        duration: 60,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with only required date', async () => {
      const dto = plainToInstance(FindAvailableSlotsDto, { date: '2026-04-01' });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail when date is missing', async () => {
      const dto = plainToInstance(FindAvailableSlotsDto, { serviceId: VALID_UUID });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'date')).toBe(true);
    });

    it('should fail when serviceId is not a UUID', async () => {
      const dto = plainToInstance(FindAvailableSlotsDto, {
        date: '2026-04-01',
        serviceId: 'invalid-uuid',
      });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'serviceId')).toBe(true);
    });

    it('should fail when duration is below minimum', async () => {
      const dto = plainToInstance(FindAvailableSlotsDto, {
        date: '2026-04-01',
        duration: 5,
      });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'duration')).toBe(true);
    });
  });

  describe('CreateSlotDto', () => {
    it('should pass with valid start and end times', async () => {
      const dto = plainToInstance(CreateSlotDto, {
        startTime: '2026-04-01T09:00:00Z',
        endTime: '2026-04-01T10:00:00Z',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail when startTime is missing', async () => {
      const dto = plainToInstance(CreateSlotDto, { endTime: '2026-04-01T10:00:00Z' });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'startTime')).toBe(true);
    });

    it('should fail when endTime is not a date string', async () => {
      const dto = plainToInstance(CreateSlotDto, {
        startTime: '2026-04-01T09:00:00Z',
        endTime: 'not-a-date',
      });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'endTime')).toBe(true);
    });
  });

  describe('CreateBookingDto', () => {
    it('should pass with all required fields', async () => {
      const dto = plainToInstance(CreateBookingDto, {
        customerId: VALID_UUID,
        slotId: VALID_UUID,
        scheduledDate: VALID_DATE,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with all optional fields', async () => {
      const dto = plainToInstance(CreateBookingDto, {
        customerId: VALID_UUID,
        vehicleId: VALID_UUID,
        slotId: VALID_UUID,
        scheduledDate: VALID_DATE,
        durationMinutes: 60,
        serviceIds: [VALID_UUID],
        notes: 'Test notes',
        source: BookingSource.WEB,
        vapiCallId: 'call_123',
        technicianId: 'tech-001',
        liftPosition: 'Ponte A',
        idempotencyKey: 'idem-key-123',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail when customerId is missing', async () => {
      const dto = plainToInstance(CreateBookingDto, {
        slotId: VALID_UUID,
        scheduledDate: VALID_DATE,
      });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'customerId')).toBe(true);
    });

    it('should fail when customerId is not a UUID', async () => {
      const dto = plainToInstance(CreateBookingDto, {
        customerId: 'not-uuid',
        slotId: VALID_UUID,
        scheduledDate: VALID_DATE,
      });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'customerId')).toBe(true);
    });

    it('should fail when vehicleId is not a UUID', async () => {
      const dto = plainToInstance(CreateBookingDto, {
        customerId: VALID_UUID,
        vehicleId: 'invalid',
        slotId: VALID_UUID,
        scheduledDate: VALID_DATE,
      });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'vehicleId')).toBe(true);
    });

    it('should fail when durationMinutes is below minimum', async () => {
      const dto = plainToInstance(CreateBookingDto, {
        customerId: VALID_UUID,
        slotId: VALID_UUID,
        scheduledDate: VALID_DATE,
        durationMinutes: 10,
      });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'durationMinutes')).toBe(true);
    });

    it('should fail when durationMinutes exceeds maximum', async () => {
      const dto = plainToInstance(CreateBookingDto, {
        customerId: VALID_UUID,
        slotId: VALID_UUID,
        scheduledDate: VALID_DATE,
        durationMinutes: 500,
      });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'durationMinutes')).toBe(true);
    });

    it('should fail when serviceIds contains invalid UUIDs', async () => {
      const dto = plainToInstance(CreateBookingDto, {
        customerId: VALID_UUID,
        slotId: VALID_UUID,
        scheduledDate: VALID_DATE,
        serviceIds: ['not-a-uuid'],
      });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'serviceIds')).toBe(true);
    });

    it('should fail when source is not a valid enum', async () => {
      const dto = plainToInstance(CreateBookingDto, {
        customerId: VALID_UUID,
        slotId: VALID_UUID,
        scheduledDate: VALID_DATE,
        source: 'INVALID_SOURCE',
      });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'source')).toBe(true);
    });
  });

  describe('ReserveSlotDto', () => {
    it('should pass with required fields', async () => {
      const dto = plainToInstance(ReserveSlotDto, {
        slotId: VALID_UUID,
        customerId: VALID_UUID,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with all optional fields', async () => {
      const dto = plainToInstance(ReserveSlotDto, {
        slotId: VALID_UUID,
        customerId: VALID_UUID,
        vehicleId: VALID_UUID,
        serviceIds: [VALID_UUID],
        notes: 'Urgent repair',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail when slotId is not a UUID', async () => {
      const dto = plainToInstance(ReserveSlotDto, {
        slotId: 'invalid',
        customerId: VALID_UUID,
      });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'slotId')).toBe(true);
    });

    it('should fail when vehicleId is provided but invalid', async () => {
      const dto = plainToInstance(ReserveSlotDto, {
        slotId: VALID_UUID,
        customerId: VALID_UUID,
        vehicleId: 'invalid',
      });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'vehicleId')).toBe(true);
    });
  });

  describe('UpdateBookingDto', () => {
    it('should pass with all fields empty (all optional)', async () => {
      const dto = plainToInstance(UpdateBookingDto, {});
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with valid status', async () => {
      const dto = plainToInstance(UpdateBookingDto, { status: 'CONFIRMED' });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with valid scheduledDate', async () => {
      const dto = plainToInstance(UpdateBookingDto, { scheduledDate: VALID_DATE });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail when scheduledDate is not a date string', async () => {
      const dto = plainToInstance(UpdateBookingDto, { scheduledDate: 'not-a-date' });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'scheduledDate')).toBe(true);
    });
  });

  describe('CalendarQueryDto', () => {
    it('should pass with valid from and to dates', async () => {
      const dto = plainToInstance(CalendarQueryDto, {
        from: '2026-03-01T00:00:00.000Z',
        to: '2026-03-31T23:59:59.000Z',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with optional bayId', async () => {
      const dto = plainToInstance(CalendarQueryDto, {
        from: '2026-03-01T00:00:00.000Z',
        to: '2026-03-31T23:59:59.000Z',
        bayId: 'bay-1',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail when from is missing', async () => {
      const dto = plainToInstance(CalendarQueryDto, { to: '2026-03-31T23:59:59.000Z' });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'from')).toBe(true);
    });

    it('should fail when to is not a date string', async () => {
      const dto = plainToInstance(CalendarQueryDto, {
        from: '2026-03-01T00:00:00.000Z',
        to: 'invalid',
      });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'to')).toBe(true);
    });
  });
});
