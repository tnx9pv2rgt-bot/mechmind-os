import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  FindAvailableSlotsDto,
  CreateSlotDto,
  BookingSlotResponseDto,
  SlotAvailabilityResponseDto,
} from '../../dto/booking-slot.dto';

describe('FindAvailableSlotsDto', () => {
  it('should validate with required date field', async () => {
    const dto = plainToInstance(FindAvailableSlotsDto, {
      date: '2024-01-15',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation without date', async () => {
    const dto = plainToInstance(FindAvailableSlotsDto, {});

    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'date')).toBe(true);
  });

  it('should fail validation with invalid date format', async () => {
    const dto = plainToInstance(FindAvailableSlotsDto, {
      date: 'invalid-date',
    });

    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'date')).toBe(true);
  });

  it('should validate with valid ISO date string', async () => {
    const dto = plainToInstance(FindAvailableSlotsDto, {
      date: '2024-01-15T00:00:00.000Z',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should validate with optional serviceId', async () => {
    const dto = plainToInstance(FindAvailableSlotsDto, {
      date: '2024-01-15',
      serviceId: '550e8400-e29b-41d4-a716-446655440000',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation with invalid serviceId UUID', async () => {
    const dto = plainToInstance(FindAvailableSlotsDto, {
      date: '2024-01-15',
      serviceId: 'invalid-uuid',
    });

    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'serviceId')).toBe(true);
  });

  it('should validate with optional duration', async () => {
    const dto = plainToInstance(FindAvailableSlotsDto, {
      date: '2024-01-15',
      duration: 60,
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation with duration below minimum', async () => {
    const dto = plainToInstance(FindAvailableSlotsDto, {
      date: '2024-01-15',
      duration: 10,
    });

    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'duration')).toBe(true);
  });

  it('should fail validation with negative duration', async () => {
    const dto = plainToInstance(FindAvailableSlotsDto, {
      date: '2024-01-15',
      duration: -30,
    });

    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'duration')).toBe(true);
  });

  it('should fail validation with non-integer duration', async () => {
    const dto = plainToInstance(FindAvailableSlotsDto, {
      date: '2024-01-15',
      duration: 60.5,
    });

    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'duration')).toBe(true);
  });

  it('should validate with all optional fields', async () => {
    const dto = plainToInstance(FindAvailableSlotsDto, {
      date: '2024-01-15',
      serviceId: '550e8400-e29b-41d4-a716-446655440000',
      duration: 120,
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});

describe('CreateSlotDto', () => {
  it('should validate with all required fields', async () => {
    const dto = plainToInstance(CreateSlotDto, {
      startTime: '2024-01-15T09:00:00Z',
      endTime: '2024-01-15T10:00:00Z',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation without startTime', async () => {
    const dto = plainToInstance(CreateSlotDto, {
      endTime: '2024-01-15T10:00:00Z',
    });

    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'startTime')).toBe(true);
  });

  it('should fail validation without endTime', async () => {
    const dto = plainToInstance(CreateSlotDto, {
      startTime: '2024-01-15T09:00:00Z',
    });

    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'endTime')).toBe(true);
  });

  it('should fail validation with invalid startTime format', async () => {
    const dto = plainToInstance(CreateSlotDto, {
      startTime: 'invalid-date',
      endTime: '2024-01-15T10:00:00Z',
    });

    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'startTime')).toBe(true);
  });

  it('should fail validation with invalid endTime format', async () => {
    const dto = plainToInstance(CreateSlotDto, {
      startTime: '2024-01-15T09:00:00Z',
      endTime: 'invalid-date',
    });

    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'endTime')).toBe(true);
  });

  it('should validate with different ISO date formats', async () => {
    const dto = plainToInstance(CreateSlotDto, {
      startTime: '2024-01-15T09:00:00.000Z',
      endTime: '2024-01-15T10:00:00.000Z',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should validate with timezone offset format', async () => {
    const dto = plainToInstance(CreateSlotDto, {
      startTime: '2024-01-15T09:00:00+01:00',
      endTime: '2024-01-15T10:00:00+01:00',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});

describe('BookingSlotResponseDto', () => {
  it('should have correct structure', () => {
    const dto = new BookingSlotResponseDto();
    dto.id = '550e8400-e29b-41d4-a716-446655440000';
    dto.startTime = new Date('2024-01-15T09:00:00Z');
    dto.endTime = new Date('2024-01-15T10:00:00Z');
    dto.status = 'AVAILABLE';
    dto.createdAt = new Date('2024-01-01T00:00:00Z');

    expect(dto.id).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(dto.startTime).toBeInstanceOf(Date);
    expect(dto.endTime).toBeInstanceOf(Date);
    expect(dto.status).toBe('AVAILABLE');
    expect(dto.createdAt).toBeInstanceOf(Date);
  });

  it('should allow different status values', () => {
    const dto = new BookingSlotResponseDto();
    dto.id = 'slot-123';
    dto.startTime = new Date();
    dto.endTime = new Date();
    dto.createdAt = new Date();

    const statuses = ['AVAILABLE', 'BOOKED', 'BLOCKED', 'RESERVED'];
    statuses.forEach(status => {
      dto.status = status;
      expect(dto.status).toBe(status);
    });
  });
});

describe('SlotAvailabilityResponseDto', () => {
  it('should have correct structure', () => {
    const dto = new SlotAvailabilityResponseDto();
    dto.date = '2024-01-15';
    dto.availableSlots = [];
    dto.totalSlots = 8;
    dto.availableCount = 5;

    expect(dto.date).toBe('2024-01-15');
    expect(dto.availableSlots).toEqual([]);
    expect(dto.totalSlots).toBe(8);
    expect(dto.availableCount).toBe(5);
  });

  it('should contain array of BookingSlotResponseDto', () => {
    const slotDto = new BookingSlotResponseDto();
    slotDto.id = 'slot-123';
    slotDto.startTime = new Date('2024-01-15T09:00:00Z');
    slotDto.endTime = new Date('2024-01-15T10:00:00Z');
    slotDto.status = 'AVAILABLE';
    slotDto.createdAt = new Date();

    const dto = new SlotAvailabilityResponseDto();
    dto.date = '2024-01-15';
    dto.availableSlots = [slotDto];
    dto.totalSlots = 1;
    dto.availableCount = 1;

    expect(dto.availableSlots).toHaveLength(1);
    expect(dto.availableSlots[0]).toBeInstanceOf(BookingSlotResponseDto);
  });

  it('should handle empty available slots', () => {
    const dto = new SlotAvailabilityResponseDto();
    dto.date = '2024-01-15';
    dto.availableSlots = [];
    dto.totalSlots = 0;
    dto.availableCount = 0;

    expect(dto.availableSlots).toHaveLength(0);
    expect(dto.availableCount).toBe(0);
  });
});
