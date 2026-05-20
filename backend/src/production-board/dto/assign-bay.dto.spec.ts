import { validate } from 'class-validator';
import { AssignBayDto } from './assign-bay.dto';

describe('AssignBayDto Validation', () => {
  it('should validate correct UUID format for workOrderId', async () => {
    const dto = new AssignBayDto();
    dto.workOrderId = '550e8400-e29b-41d4-a716-446655440000';
    dto.bayId = '550e8400-e29b-41d4-a716-446655440001';
    dto.technicianId = '550e8400-e29b-41d4-a716-446655440002';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should reject invalid UUID format for workOrderId', async () => {
    const dto = new AssignBayDto();
    dto.workOrderId = 'not-a-uuid';
    dto.bayId = '550e8400-e29b-41d4-a716-446655440001';
    dto.technicianId = '550e8400-e29b-41d4-a716-446655440002';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('workOrderId');
  });

  it('should reject non-string workOrderId', async () => {
    const dto = new AssignBayDto();
    (dto.workOrderId as unknown) = 123;
    dto.bayId = '550e8400-e29b-41d4-a716-446655440001';
    dto.technicianId = '550e8400-e29b-41d4-a716-446655440002';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject invalid UUID format for bayId', async () => {
    const dto = new AssignBayDto();
    dto.workOrderId = '550e8400-e29b-41d4-a716-446655440000';
    dto.bayId = 'invalid-uuid';
    dto.technicianId = '550e8400-e29b-41d4-a716-446655440002';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('bayId');
  });

  it('should reject non-string bayId', async () => {
    const dto = new AssignBayDto();
    dto.workOrderId = '550e8400-e29b-41d4-a716-446655440000';
    (dto.bayId as unknown) = { id: 'bay-001' };
    dto.technicianId = '550e8400-e29b-41d4-a716-446655440002';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject invalid UUID format for technicianId', async () => {
    const dto = new AssignBayDto();
    dto.workOrderId = '550e8400-e29b-41d4-a716-446655440000';
    dto.bayId = '550e8400-e29b-41d4-a716-446655440001';
    dto.technicianId = 'not-uuid';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('technicianId');
  });

  it('should reject non-string technicianId', async () => {
    const dto = new AssignBayDto();
    dto.workOrderId = '550e8400-e29b-41d4-a716-446655440000';
    dto.bayId = '550e8400-e29b-41d4-a716-446655440001';
    (dto.technicianId as unknown) = true;

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
