import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  CreateBookingDto,
  ReserveSlotDto,
  UpdateBookingDto,
  BookingResponseDto,
  ConflictResponseDto,
} from '../../dto/create-booking.dto';
import { BookingSource } from '@prisma/client';

describe('CreateBookingDto', () => {
  it('should validate with all required fields', async () => {
    const dto = plainToInstance(CreateBookingDto, {
      customerId: '550e8400-e29b-41d4-a716-446655440000',
      slotId: '550e8400-e29b-41d4-a716-446655440001',
      scheduledDate: '2024-01-15T09:00:00Z',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation without customerId', async () => {
    const dto = plainToInstance(CreateBookingDto, {
      slotId: '550e8400-e29b-41d4-a716-446655440001',
      scheduledDate: '2024-01-15T09:00:00Z',
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.property === 'customerId')).toBe(true);
  });

  it('should fail validation without slotId', async () => {
    const dto = plainToInstance(CreateBookingDto, {
      customerId: '550e8400-e29b-41d4-a716-446655440000',
      scheduledDate: '2024-01-15T09:00:00Z',
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.property === 'slotId')).toBe(true);
  });

  it('should fail validation without scheduledDate', async () => {
    const dto = plainToInstance(CreateBookingDto, {
      customerId: '550e8400-e29b-41d4-a716-446655440000',
      slotId: '550e8400-e29b-41d4-a716-446655440001',
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.property === 'scheduledDate')).toBe(true);
  });

  it('should fail validation with invalid UUID for customerId', async () => {
    const dto = plainToInstance(CreateBookingDto, {
      customerId: 'invalid-uuid',
      slotId: '550e8400-e29b-41d4-a716-446655440001',
      scheduledDate: '2024-01-15T09:00:00Z',
    });

    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'customerId')).toBe(true);
  });

  it('should fail validation with invalid UUID for slotId', async () => {
    const dto = plainToInstance(CreateBookingDto, {
      customerId: '550e8400-e29b-41d4-a716-446655440000',
      slotId: 'invalid-uuid',
      scheduledDate: '2024-01-15T09:00:00Z',
    });

    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'slotId')).toBe(true);
  });

  it('should validate with optional vehicleId', async () => {
    const dto = plainToInstance(CreateBookingDto, {
      customerId: '550e8400-e29b-41d4-a716-446655440000',
      slotId: '550e8400-e29b-41d4-a716-446655440001',
      scheduledDate: '2024-01-15T09:00:00Z',
      vehicleId: '550e8400-e29b-41d4-a716-446655440002',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation with invalid vehicleId UUID', async () => {
    const dto = plainToInstance(CreateBookingDto, {
      customerId: '550e8400-e29b-41d4-a716-446655440000',
      slotId: '550e8400-e29b-41d4-a716-446655440001',
      scheduledDate: '2024-01-15T09:00:00Z',
      vehicleId: 'invalid-uuid',
    });

    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'vehicleId')).toBe(true);
  });

  it('should validate with valid durationMinutes', async () => {
    const dto = plainToInstance(CreateBookingDto, {
      customerId: '550e8400-e29b-41d4-a716-446655440000',
      slotId: '550e8400-e29b-41d4-a716-446655440001',
      scheduledDate: '2024-01-15T09:00:00Z',
      durationMinutes: 60,
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation with durationMinutes below minimum', async () => {
    const dto = plainToInstance(CreateBookingDto, {
      customerId: '550e8400-e29b-41d4-a716-446655440000',
      slotId: '550e8400-e29b-41d4-a716-446655440001',
      scheduledDate: '2024-01-15T09:00:00Z',
      durationMinutes: 10,
    });

    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'durationMinutes')).toBe(true);
  });

  it('should fail validation with durationMinutes above maximum', async () => {
    const dto = plainToInstance(CreateBookingDto, {
      customerId: '550e8400-e29b-41d4-a716-446655440000',
      slotId: '550e8400-e29b-41d4-a716-446655440001',
      scheduledDate: '2024-01-15T09:00:00Z',
      durationMinutes: 500,
    });

    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'durationMinutes')).toBe(true);
  });

  it('should validate with valid serviceIds array', async () => {
    const dto = plainToInstance(CreateBookingDto, {
      customerId: '550e8400-e29b-41d4-a716-446655440000',
      slotId: '550e8400-e29b-41d4-a716-446655440001',
      scheduledDate: '2024-01-15T09:00:00Z',
      serviceIds: [
        '550e8400-e29b-41d4-a716-446655440003',
        '550e8400-e29b-41d4-a716-446655440004',
      ],
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation with invalid serviceIds', async () => {
    const dto = plainToInstance(CreateBookingDto, {
      customerId: '550e8400-e29b-41d4-a716-446655440000',
      slotId: '550e8400-e29b-41d4-a716-446655440001',
      scheduledDate: '2024-01-15T09:00:00Z',
      serviceIds: ['invalid-uuid'],
    });

    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'serviceIds')).toBe(true);
  });

  it('should validate with notes field', async () => {
    const dto = plainToInstance(CreateBookingDto, {
      customerId: '550e8400-e29b-41d4-a716-446655440000',
      slotId: '550e8400-e29b-41d4-a716-446655440001',
      scheduledDate: '2024-01-15T09:00:00Z',
      notes: 'Customer requested oil change',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should validate with valid source enum', async () => {
    const dto = plainToInstance(CreateBookingDto, {
      customerId: '550e8400-e29b-41d4-a716-446655440000',
      slotId: '550e8400-e29b-41d4-a716-446655440001',
      scheduledDate: '2024-01-15T09:00:00Z',
      source: BookingSource.WEB,
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation with invalid source', async () => {
    const dto = plainToInstance(CreateBookingDto, {
      customerId: '550e8400-e29b-41d4-a716-446655440000',
      slotId: '550e8400-e29b-41d4-a716-446655440001',
      scheduledDate: '2024-01-15T09:00:00Z',
      source: 'INVALID_SOURCE',
    });

    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'source')).toBe(true);
  });

  it('should validate with vapiCallId', async () => {
    const dto = plainToInstance(CreateBookingDto, {
      customerId: '550e8400-e29b-41d4-a716-446655440000',
      slotId: '550e8400-e29b-41d4-a716-446655440001',
      scheduledDate: '2024-01-15T09:00:00Z',
      vapiCallId: 'call_123456789',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation with invalid scheduledDate format', async () => {
    const dto = plainToInstance(CreateBookingDto, {
      customerId: '550e8400-e29b-41d4-a716-446655440000',
      slotId: '550e8400-e29b-41d4-a716-446655440001',
      scheduledDate: 'invalid-date',
    });

    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'scheduledDate')).toBe(true);
  });
});

describe('ReserveSlotDto', () => {
  it('should validate with required fields', async () => {
    const dto = plainToInstance(ReserveSlotDto, {
      slotId: '550e8400-e29b-41d4-a716-446655440001',
      customerId: '550e8400-e29b-41d4-a716-446655440000',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation without slotId', async () => {
    const dto = plainToInstance(ReserveSlotDto, {
      customerId: '550e8400-e29b-41d4-a716-446655440000',
    });

    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'slotId')).toBe(true);
  });

  it('should fail validation without customerId', async () => {
    const dto = plainToInstance(ReserveSlotDto, {
      slotId: '550e8400-e29b-41d4-a716-446655440001',
    });

    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'customerId')).toBe(true);
  });

  it('should validate with all optional fields', async () => {
    const dto = plainToInstance(ReserveSlotDto, {
      slotId: '550e8400-e29b-41d4-a716-446655440001',
      customerId: '550e8400-e29b-41d4-a716-446655440000',
      vehicleId: '550e8400-e29b-41d4-a716-446655440002',
      serviceIds: ['550e8400-e29b-41d4-a716-446655440003'],
      notes: 'Urgent repair needed',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail with invalid vehicleId UUID', async () => {
    const dto = plainToInstance(ReserveSlotDto, {
      slotId: '550e8400-e29b-41d4-a716-446655440001',
      customerId: '550e8400-e29b-41d4-a716-446655440000',
      vehicleId: 'invalid-uuid',
    });

    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'vehicleId')).toBe(true);
  });

  it('should fail with invalid serviceIds', async () => {
    const dto = plainToInstance(ReserveSlotDto, {
      slotId: '550e8400-e29b-41d4-a716-446655440001',
      customerId: '550e8400-e29b-41d4-a716-446655440000',
      serviceIds: ['invalid-uuid'],
    });

    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'serviceIds')).toBe(true);
  });
});

describe('UpdateBookingDto', () => {
  it('should validate empty DTO (all fields optional)', async () => {
    const dto = plainToInstance(UpdateBookingDto, {});

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should validate with status', async () => {
    const dto = plainToInstance(UpdateBookingDto, {
      status: 'CONFIRMED',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should validate with scheduledDate', async () => {
    const dto = plainToInstance(UpdateBookingDto, {
      scheduledDate: '2024-01-15T14:00:00Z',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail with invalid scheduledDate', async () => {
    const dto = plainToInstance(UpdateBookingDto, {
      scheduledDate: 'invalid-date',
    });

    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'scheduledDate')).toBe(true);
  });

  it('should validate with notes', async () => {
    const dto = plainToInstance(UpdateBookingDto, {
      notes: 'Updated notes',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should validate with all fields', async () => {
    const dto = plainToInstance(UpdateBookingDto, {
      status: 'COMPLETED',
      scheduledDate: '2024-01-20T10:00:00Z',
      notes: 'Service completed successfully',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});

describe('BookingResponseDto', () => {
  it('should have correct structure', () => {
    const dto = new BookingResponseDto();
    dto.id = '550e8400-e29b-41d4-a716-446655440000';
    dto.status = 'CONFIRMED';
    dto.scheduledDate = new Date('2024-01-15T09:00:00Z');
    dto.durationMinutes = 60;
    dto.source = 'WEB';
    dto.createdAt = new Date('2024-01-10T08:30:00Z');

    expect(dto.id).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(dto.status).toBe('CONFIRMED');
    expect(dto.scheduledDate).toBeInstanceOf(Date);
    expect(dto.durationMinutes).toBe(60);
    expect(dto.source).toBe('WEB');
    expect(dto.createdAt).toBeInstanceOf(Date);
  });

  it('should allow optional customer field', () => {
    const dto = new BookingResponseDto();
    dto.id = 'booking-123';
    dto.status = 'CONFIRMED';
    dto.scheduledDate = new Date();
    dto.durationMinutes = 60;
    dto.source = 'WEB';
    dto.createdAt = new Date();
    dto.customer = {
      id: 'customer-123',
      firstName: 'John',
      lastName: 'Doe',
      phone: '1234567890',
    };

    expect(dto.customer).toBeDefined();
    expect(dto.customer.firstName).toBe('John');
  });

  it('should allow optional vehicle field', () => {
    const dto = new BookingResponseDto();
    dto.id = 'booking-123';
    dto.status = 'CONFIRMED';
    dto.scheduledDate = new Date();
    dto.durationMinutes = 60;
    dto.source = 'WEB';
    dto.createdAt = new Date();
    dto.vehicle = {
      id: 'vehicle-123',
      licensePlate: 'ABC123',
      make: 'Toyota',
      model: 'Camry',
    };

    expect(dto.vehicle).toBeDefined();
    expect(dto.vehicle.licensePlate).toBe('ABC123');
  });

  it('should allow optional services field', () => {
    const dto = new BookingResponseDto();
    dto.id = 'booking-123';
    dto.status = 'CONFIRMED';
    dto.scheduledDate = new Date();
    dto.durationMinutes = 60;
    dto.source = 'WEB';
    dto.createdAt = new Date();
    dto.services = [
      {
        id: 'service-123',
        name: 'Oil Change',
        price: 50.00,
      },
    ];

    expect(dto.services).toHaveLength(1);
    expect(dto.services[0].name).toBe('Oil Change');
  });
});

describe('ConflictResponseDto', () => {
  it('should have correct structure', () => {
    const dto = new ConflictResponseDto();
    dto.statusCode = 409;
    dto.message = 'Slot already reserved';
    dto.error = 'CONFLICT';
    dto.retryInfo = {
      retryAfter: 5000,
      queuePosition: 1,
    };

    expect(dto.statusCode).toBe(409);
    expect(dto.message).toBe('Slot already reserved');
    expect(dto.error).toBe('CONFLICT');
    expect(dto.retryInfo).toEqual({
      retryAfter: 5000,
      queuePosition: 1,
    });
  });

  it('should allow optional retryInfo', () => {
    const dto = new ConflictResponseDto();
    dto.statusCode = 409;
    dto.message = 'Slot already reserved';
    dto.error = 'CONFLICT';

    expect(dto.retryInfo).toBeUndefined();
  });
});
