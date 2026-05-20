import { validate } from 'class-validator';
import { MoveJobDto } from './move-job.dto';

describe('MoveJobDto Validation', () => {
  it('should validate correct UUID format for all fields', async () => {
    const dto = new MoveJobDto();
    dto.workOrderId = '550e8400-e29b-41d4-a716-446655440000';
    dto.fromBayId = '550e8400-e29b-41d4-a716-446655440001';
    dto.toBayId = '550e8400-e29b-41d4-a716-446655440002';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should reject invalid UUID format for workOrderId', async () => {
    const dto = new MoveJobDto();
    dto.workOrderId = 'invalid';
    dto.fromBayId = '550e8400-e29b-41d4-a716-446655440001';
    dto.toBayId = '550e8400-e29b-41d4-a716-446655440002';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('workOrderId');
  });

  it('should reject non-string workOrderId', async () => {
    const dto = new MoveJobDto();
    (dto.workOrderId as unknown) = null;
    dto.fromBayId = '550e8400-e29b-41d4-a716-446655440001';
    dto.toBayId = '550e8400-e29b-41d4-a716-446655440002';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject invalid UUID format for fromBayId', async () => {
    const dto = new MoveJobDto();
    dto.workOrderId = '550e8400-e29b-41d4-a716-446655440000';
    dto.fromBayId = 'not-uuid';
    dto.toBayId = '550e8400-e29b-41d4-a716-446655440002';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('fromBayId');
  });

  it('should reject non-string fromBayId', async () => {
    const dto = new MoveJobDto();
    dto.workOrderId = '550e8400-e29b-41d4-a716-446655440000';
    (dto.fromBayId as unknown) = 123.45;
    dto.toBayId = '550e8400-e29b-41d4-a716-446655440002';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject invalid UUID format for toBayId', async () => {
    const dto = new MoveJobDto();
    dto.workOrderId = '550e8400-e29b-41d4-a716-446655440000';
    dto.fromBayId = '550e8400-e29b-41d4-a716-446655440001';
    dto.toBayId = 'invalid-uuid-format';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('toBayId');
  });

  it('should reject non-string toBayId', async () => {
    const dto = new MoveJobDto();
    dto.workOrderId = '550e8400-e29b-41d4-a716-446655440000';
    dto.fromBayId = '550e8400-e29b-41d4-a716-446655440001';
    (dto.toBayId as unknown) = { id: 'bay-999' };

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
