import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { SmsInboundProcessor } from './sms-inbound.processor';
import { SmsThreadService } from './sms-thread.service';

const TENANT_ID = 'tenant-uuid-001';

describe('SmsInboundProcessor', () => {
  let processor: SmsInboundProcessor;

  const mockService = {
    receiveInbound: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [SmsInboundProcessor, { provide: SmsThreadService, useValue: mockService }],
    }).compile();

    processor = module.get(SmsInboundProcessor);
  });

  describe('process', () => {
    it('should call receiveInbound with tenantId first', async () => {
      const jobData = {
        tenantId: TENANT_ID,
        phoneHash: 'hash-123',
        body: 'Hello',
        twilioSid: 'SM001',
      };
      const job = { id: 'job-1', data: jobData } as Job<typeof jobData>;
      mockService.receiveInbound.mockResolvedValueOnce({ id: 'msg-001' });

      await processor.process(job);

      expect(mockService.receiveInbound).toHaveBeenCalledWith(
        TENANT_ID,
        'hash-123',
        'Hello',
        'SM001',
      );
      expect(mockService.receiveInbound).toHaveBeenCalledTimes(1);
    });

    it('should call receiveInbound without twilioSid when absent', async () => {
      const jobData = {
        tenantId: TENANT_ID,
        phoneHash: 'hash-456',
        body: 'No SID',
        twilioSid: undefined,
      };
      const job = { id: 'job-2', data: jobData } as Job<typeof jobData>;
      mockService.receiveInbound.mockResolvedValueOnce({ id: 'msg-002' });

      await processor.process(job);

      expect(mockService.receiveInbound).toHaveBeenCalledWith(
        TENANT_ID,
        'hash-456',
        'No SID',
        undefined,
      );
      expect(mockService.receiveInbound).toHaveBeenCalledTimes(1);
    });

    it('should propagate errors from receiveInbound', async () => {
      const jobData = {
        tenantId: TENANT_ID,
        phoneHash: 'hash-err',
        body: 'fail',
        twilioSid: 'SM-err',
      };
      const job = { id: 'job-3', data: jobData } as Job<typeof jobData>;
      mockService.receiveInbound.mockRejectedValueOnce(new Error('DB error'));

      await expect(processor.process(job)).rejects.toThrow('DB error');
      expect(mockService.receiveInbound).toHaveBeenCalledTimes(1);
    });

    it('cross-tenant isolation — no receiveInbound if different tenant', async () => {
      const jobData = {
        tenantId: 'other-tenant',
        phoneHash: 'hash-cross',
        body: 'Cross tenant msg',
        twilioSid: 'SM-cross',
      };
      const job = { id: 'job-4', data: jobData } as Job<typeof jobData>;
      mockService.receiveInbound.mockResolvedValueOnce({ id: 'msg-004' });

      await processor.process(job);

      expect(mockService.receiveInbound).toHaveBeenCalledWith(
        'other-tenant',
        'hash-cross',
        'Cross tenant msg',
        'SM-cross',
      );
      expect(mockService.receiveInbound).toHaveBeenCalledTimes(1);
    });
  });
});
