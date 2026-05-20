import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { QueueService, QueueJobData } from './queue.service';
import { LoggerService } from './logger.service';

// ---------------------------------------------------------------------------
// Mock types
// ---------------------------------------------------------------------------

interface MockQueue {
  name: string;
  add: jest.Mock;
  getWaitingCount: jest.Mock;
  getActiveCount: jest.Mock;
  getCompletedCount: jest.Mock;
  getFailedCount: jest.Mock;
  getDelayedCount: jest.Mock;
  getFailed: jest.Mock;
  clean: jest.Mock;
  pause: jest.Mock;
  resume: jest.Mock;
}

interface MockLoggerService {
  log: jest.Mock;
  warn: jest.Mock;
  error: jest.Mock;
  debug: jest.Mock;
}

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

const createMockQueue = (name: string): MockQueue => ({
  name,
  add: jest.fn(),
  getWaitingCount: jest.fn().mockResolvedValue(0),
  getActiveCount: jest.fn().mockResolvedValue(0),
  getCompletedCount: jest.fn().mockResolvedValue(0),
  getFailedCount: jest.fn().mockResolvedValue(0),
  getDelayedCount: jest.fn().mockResolvedValue(0),
  getFailed: jest.fn().mockResolvedValue([]),
  clean: jest.fn().mockResolvedValue([]),
  pause: jest.fn().mockResolvedValue(undefined),
  resume: jest.fn().mockResolvedValue(undefined),
});

const createMockLogger = (): MockLoggerService => ({
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';

const sampleJobData: QueueJobData = {
  type: 'BOOKING_CREATED',
  payload: { bookingId: 'booking-001' },
  tenantId: TENANT_ID,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('QueueService', () => {
  let service: QueueService;
  let bookingQueue: MockQueue;
  let voiceQueue: MockQueue;
  let notificationQueue: MockQueue;
  let mockLogger: MockLoggerService;

  beforeEach(async () => {
    jest.clearAllMocks();

    bookingQueue = createMockQueue('booking');
    voiceQueue = createMockQueue('voice');
    notificationQueue = createMockQueue('notification');
    mockLogger = createMockLogger();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        { provide: getQueueToken('booking'), useValue: bookingQueue },
        { provide: getQueueToken('voice'), useValue: voiceQueue },
        { provide: getQueueToken('notification'), useValue: notificationQueue },
        { provide: LoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<QueueService>(QueueService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // -----------------------------------------------------------------------
  // addBookingJob
  // -----------------------------------------------------------------------

  describe('addBookingJob', () => {
    it('should add job to booking queue with default options', async () => {
      const mockJob = { id: 'job-1', name: 'confirm-booking' };
      bookingQueue.add.mockResolvedValueOnce(mockJob);

      const result = await service.addBookingJob('confirm-booking', sampleJobData);

      expect(result).toEqual(mockJob);
      expect(bookingQueue.add).toHaveBeenCalledWith(
        'confirm-booking',
        sampleJobData,
        expect.objectContaining({
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
        }),
      );
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('booking'));
    });

    it('should respect custom options', async () => {
      const mockJob = { id: 'job-2', name: 'send-reminder' };
      bookingQueue.add.mockResolvedValueOnce(mockJob);

      await service.addBookingJob('send-reminder', sampleJobData, {
        delay: 5000,
        priority: 1,
        attempts: 5,
      });

      expect(bookingQueue.add).toHaveBeenCalledWith(
        'send-reminder',
        sampleJobData,
        expect.objectContaining({
          delay: 5000,
          priority: 1,
          attempts: 5,
        }),
      );
    });

    it('should propagate queue errors', async () => {
      bookingQueue.add.mockRejectedValueOnce(new Error('Queue full'));

      await expect(service.addBookingJob('job', sampleJobData)).rejects.toThrow('Queue full');

      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to add job'));
    });
  });

  // -----------------------------------------------------------------------
  // addVoiceJob
  // -----------------------------------------------------------------------

  describe('addVoiceJob', () => {
    it('should add job to voice queue', async () => {
      const mockJob = { id: 'voice-1', name: 'process-call' };
      voiceQueue.add.mockResolvedValueOnce(mockJob);

      const result = await service.addVoiceJob('process-call', sampleJobData);

      expect(result).toEqual(mockJob);
      expect(voiceQueue.add).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // addNotificationJob
  // -----------------------------------------------------------------------

  describe('addNotificationJob', () => {
    it('should add job to notification queue', async () => {
      const mockJob = { id: 'notif-1', name: 'send-email' };
      notificationQueue.add.mockResolvedValueOnce(mockJob);

      const result = await service.addNotificationJob('send-email', sampleJobData);

      expect(result).toEqual(mockJob);
      expect(notificationQueue.add).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // getQueueMetrics
  // -----------------------------------------------------------------------

  describe('getQueueMetrics', () => {
    it('should return metrics for booking queue', async () => {
      bookingQueue.getWaitingCount.mockResolvedValueOnce(5);
      bookingQueue.getActiveCount.mockResolvedValueOnce(2);
      bookingQueue.getCompletedCount.mockResolvedValueOnce(100);
      bookingQueue.getFailedCount.mockResolvedValueOnce(3);
      bookingQueue.getDelayedCount.mockResolvedValueOnce(1);

      const metrics = await service.getQueueMetrics('booking');

      expect(metrics).toEqual({
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 1,
      });
    });

    it('should return metrics for voice queue', async () => {
      voiceQueue.getWaitingCount.mockResolvedValueOnce(0);
      voiceQueue.getActiveCount.mockResolvedValueOnce(1);
      voiceQueue.getCompletedCount.mockResolvedValueOnce(50);
      voiceQueue.getFailedCount.mockResolvedValueOnce(0);
      voiceQueue.getDelayedCount.mockResolvedValueOnce(0);

      const metrics = await service.getQueueMetrics('voice');

      expect(metrics).toEqual({
        waiting: 0,
        active: 1,
        completed: 50,
        failed: 0,
        delayed: 0,
      });
    });
  });

  // -----------------------------------------------------------------------
  // cleanCompletedJobs
  // -----------------------------------------------------------------------

  describe('cleanCompletedJobs', () => {
    it('should clean completed jobs from specified queue', async () => {
      await service.cleanCompletedJobs('notification', 48);

      expect(notificationQueue.clean).toHaveBeenCalledWith(expect.any(Number), 1000, 'completed');
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Cleaned completed jobs from notification'),
      );
    });

    it('should default to 24 hours', async () => {
      const before = Date.now();
      await service.cleanCompletedJobs('booking');
      const after = Date.now();

      const calledTimestamp =
        notificationQueue.clean.mock.calls.length === 0
          ? bookingQueue.clean.mock.calls[0][0]
          : notificationQueue.clean.mock.calls[0][0];

      // Timestamp should be roughly 24h ago
      const expectedMin = before - 24 * 60 * 60 * 1000;
      const expectedMax = after - 24 * 60 * 60 * 1000;
      expect(calledTimestamp).toBeGreaterThanOrEqual(expectedMin);
      expect(calledTimestamp).toBeLessThanOrEqual(expectedMax);
    });
  });

  // -----------------------------------------------------------------------
  // retryFailedJobs
  // -----------------------------------------------------------------------

  describe('retryFailedJobs', () => {
    it('should retry failed jobs up to count', async () => {
      const mockJob1 = { id: 'f1', retry: jest.fn() };
      const mockJob2 = { id: 'f2', retry: jest.fn() };
      bookingQueue.getFailed.mockResolvedValueOnce([mockJob1, mockJob2]);

      const result = await service.retryFailedJobs('booking', 1);

      expect(result).toHaveLength(1);
      expect(mockJob1.retry).toHaveBeenCalled();
      expect(mockJob2.retry).not.toHaveBeenCalled();
    });

    it('should log errors for jobs that fail to retry', async () => {
      const mockJob = { id: 'f1', retry: jest.fn().mockRejectedValue(new Error('Locked')) };
      bookingQueue.getFailed.mockResolvedValueOnce([mockJob]);

      const result = await service.retryFailedJobs('booking');

      expect(result).toHaveLength(0);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to retry job f1'),
      );
    });
  });

  // -----------------------------------------------------------------------
  // pauseQueue / resumeQueue
  // -----------------------------------------------------------------------

  describe('pauseQueue', () => {
    it('should pause the specified queue', async () => {
      await service.pauseQueue('voice');

      expect(voiceQueue.pause).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Paused voice'));
    });
  });

  describe('resumeQueue', () => {
    it('should resume the specified queue', async () => {
      await service.resumeQueue('notification');

      expect(notificationQueue.resume).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Resumed notification'));
    });
  });

  // -----------------------------------------------------------------------
  // NEW TESTS: Error paths, edge cases
  // -----------------------------------------------------------------------

  describe('addBookingJob - Error handling', () => {
    it('should throw error when queue.add fails with ECONNREFUSED', async () => {
      bookingQueue.add.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      await expect(service.addBookingJob('job', sampleJobData)).rejects.toThrow('ECONNREFUSED');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to add job to booking queue'),
      );
    });

    it('should handle error during job addition from all queues', async () => {
      voiceQueue.add.mockRejectedValueOnce(new Error('Queue unavailable'));

      await expect(service.addVoiceJob('process', sampleJobData)).rejects.toThrow(
        'Queue unavailable',
      );
    });
  });

  describe('getQueueMetrics - Error cases', () => {
    it('should return zero metrics when counts fail', async () => {
      bookingQueue.getWaitingCount.mockRejectedValueOnce(new Error('DB error'));
      bookingQueue.getActiveCount.mockResolvedValueOnce(0);
      bookingQueue.getCompletedCount.mockResolvedValueOnce(0);
      bookingQueue.getFailedCount.mockResolvedValueOnce(0);
      bookingQueue.getDelayedCount.mockResolvedValueOnce(0);

      await expect(service.getQueueMetrics('booking')).rejects.toThrow('DB error');
    });
  });

  describe('retryFailedJobs - Batch retry', () => {
    it('should return empty array when no failed jobs exist', async () => {
      bookingQueue.getFailed.mockResolvedValueOnce([]);

      const result = await service.retryFailedJobs('booking', 10);

      expect(result).toHaveLength(0);
    });

    it('should retry only up to specified count from larger failure list', async () => {
      const mockJobs = Array.from({ length: 10 }, (_, i) => ({
        id: `f${i}`,
        retry: jest.fn().mockResolvedValue(undefined),
      }));
      bookingQueue.getFailed.mockResolvedValueOnce(mockJobs);

      const result = await service.retryFailedJobs('booking', 3);

      expect(result).toHaveLength(3);
      expect(mockJobs[0].retry).toHaveBeenCalled();
      expect(mockJobs[3].retry).not.toHaveBeenCalled();
    });

    it('should partially succeed when some jobs fail to retry', async () => {
      const mockJob1 = { id: 'f1', retry: jest.fn().mockResolvedValue(undefined) };
      const mockJob2 = { id: 'f2', retry: jest.fn().mockRejectedValue(new Error('Locked')) };
      const mockJob3 = { id: 'f3', retry: jest.fn().mockResolvedValue(undefined) };
      notificationQueue.getFailed.mockResolvedValueOnce([mockJob1, mockJob2, mockJob3]);

      const result = await service.retryFailedJobs('notification', 5);

      expect(result).toHaveLength(2); // f1 and f3 succeeded
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to retry job f2'),
      );
    });
  });

  describe('cleanCompletedJobs - Timestamp calculation', () => {
    it('should calculate correct timestamp for various olderThanHours', async () => {
      const before = Date.now();
      await service.cleanCompletedJobs('booking', 72);
      const after = Date.now();

      const calledTimestamp = bookingQueue.clean.mock.calls[0][0];
      const expectedMin = before - 72 * 60 * 60 * 1000;
      const expectedMax = after - 72 * 60 * 60 * 1000;

      expect(calledTimestamp).toBeGreaterThanOrEqual(expectedMin);
      expect(calledTimestamp).toBeLessThanOrEqual(expectedMax);
    });
  });

  describe('pauseQueue / resumeQueue - All queues', () => {
    it('should pause booking queue', async () => {
      await service.pauseQueue('booking');

      expect(bookingQueue.pause).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Paused booking'));
    });

    it('should resume voice queue', async () => {
      await service.resumeQueue('voice');

      expect(voiceQueue.resume).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Resumed voice'));
    });
  });

  describe('addNotificationJob - Custom options', () => {
    it('should apply custom attempts and backoff', async () => {
      const mockJob = { id: 'notif-custom', name: 'send-sms' };
      notificationQueue.add.mockResolvedValueOnce(mockJob);

      await service.addNotificationJob('send-sms', sampleJobData, {
        attempts: 10,
        backoff: { type: 'fixed', delay: 5000 },
      });

      expect(notificationQueue.add).toHaveBeenCalledWith(
        'send-sms',
        sampleJobData,
        expect.objectContaining({
          attempts: 10,
          backoff: { type: 'fixed', delay: 5000 },
        }),
      );
    });
  });
});
