import { InventoryAlertsScheduler } from './inventory-alerts.scheduler';
import { Queue } from 'bullmq';

describe('InventoryAlertsScheduler', () => {
  let scheduler: InventoryAlertsScheduler;
  let mockQueue: jest.Mocked<Pick<Queue, 'add'>>;

  beforeEach(() => {
    mockQueue = {
      add: jest.fn(),
    };
    scheduler = new InventoryAlertsScheduler(mockQueue as unknown as Queue);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(scheduler).toBeDefined();
  });

  describe('scheduleInventoryCheck', () => {
    it('should enqueue check-all job successfully', async () => {
      const mockJob = { id: 'job-001' };
      mockQueue.add.mockResolvedValueOnce(mockJob as never);

      await scheduler.scheduleInventoryCheck();

      expect(mockQueue.add).toHaveBeenCalledWith(
        'check-all',
        {},
        expect.objectContaining({
          removeOnComplete: { age: 3600 },
          removeOnFail: false,
          attempts: 1,
        }),
      );
    });

    it('should log job ID after successful enqueue', async () => {
      const mockJob = { id: 'job-abc-123' };
      mockQueue.add.mockResolvedValueOnce(mockJob as never);
      const logSpy = jest.spyOn(scheduler['logger'], 'log').mockImplementation();

      await scheduler.scheduleInventoryCheck();

      expect(logSpy).toHaveBeenCalledWith('Job enqueued with ID: job-abc-123');
      logSpy.mockRestore();
    });

    it('should handle queue.add failure with Error instance', async () => {
      const error = new Error('BullMQ unavailable');
      mockQueue.add.mockRejectedValueOnce(error);
      const errorSpy = jest.spyOn(scheduler['logger'], 'error').mockImplementation();

      await scheduler.scheduleInventoryCheck();

      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to enqueue inventory-alerts job:',
        'BullMQ unavailable',
      );
      errorSpy.mockRestore();
    });

    it('should handle queue.add failure with non-Error value', async () => {
      mockQueue.add.mockRejectedValueOnce('string error');
      const errorSpy = jest.spyOn(scheduler['logger'], 'error').mockImplementation();

      await scheduler.scheduleInventoryCheck();

      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to enqueue inventory-alerts job:',
        'Unknown error',
      );
      errorSpy.mockRestore();
    });

    it('should include exponential backoff config in job options', async () => {
      const mockJob = { id: 'job-002' };
      mockQueue.add.mockResolvedValueOnce(mockJob as never);

      await scheduler.scheduleInventoryCheck();

      expect(mockQueue.add).toHaveBeenCalledWith(
        'check-all',
        {},
        expect.objectContaining({
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        }),
      );
    });
  });
});
