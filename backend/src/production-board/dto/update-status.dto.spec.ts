import { validate } from 'class-validator';
import { UpdateJobStatusDto } from './update-status.dto';

describe('UpdateJobStatusDto Validation', () => {
  it('should validate correct status string', async () => {
    const dto = new UpdateJobStatusDto();
    dto.status = 'IN_PROGRESS';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should validate COMPLETED status', async () => {
    const dto = new UpdateJobStatusDto();
    dto.status = 'COMPLETED';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should validate WAITING_PARTS status', async () => {
    const dto = new UpdateJobStatusDto();
    dto.status = 'WAITING_PARTS';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should validate PENDING status', async () => {
    const dto = new UpdateJobStatusDto();
    dto.status = 'PENDING';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should validate CHECKED_IN status', async () => {
    const dto = new UpdateJobStatusDto();
    dto.status = 'CHECKED_IN';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should reject invalid status OPEN (not in allowed list)', async () => {
    const dto = new UpdateJobStatusDto();
    dto.status = 'OPEN';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should validate QUALITY_CHECK status', async () => {
    const dto = new UpdateJobStatusDto();
    dto.status = 'QUALITY_CHECK';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should validate READY status', async () => {
    const dto = new UpdateJobStatusDto();
    dto.status = 'READY';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should validate INVOICED status', async () => {
    const dto = new UpdateJobStatusDto();
    dto.status = 'INVOICED';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should reject non-string status', async () => {
    const dto = new UpdateJobStatusDto();
    (dto.status as unknown) = 123;

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject empty string status', async () => {
    const dto = new UpdateJobStatusDto();
    dto.status = '';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
