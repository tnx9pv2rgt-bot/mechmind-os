import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { QueueService, QueueJobData, JobOptions } from '../services/queue.service';
import { LoggerService } from '../services/logger.service';

describe('QueueService', () => {
  let service: QueueService;
  let bookingQueue: jest.Mocked<Queue>;
  let voiceQueue: jest.Mocked<Queue>;
  let notificationQueue: jest.Mocked<Queue>;
  let loggerService: jest.Mocked<LoggerService>;

  const createMockJob = (id: string, name: string, data: QueueJobData): Partial<Job> => ({
    id,
    name,
    data,
    retry: jest.fn().mockResolvedValue(undefined),
  });

  const createMockQueue = (name: string): jest.Mocked<Queue> => ({
    name,
    add: jest.fn(),
    getWaitingCount: jest.fn().mockResolvedValue(5),
    getActiveCount: jest.fn().mockResolvedValue(2),
    getCompletedCount: jest.fn().mockResolvedValue(100),
    getFailedCount: jest.fn().mockResolvedValue(3),
    getDelayedCount: jest.fn().mockResolvedValue(1),
    clean: jest.fn().mockResolvedValue([]),
    getFailed: jest.fn().mockResolvedValue([]),
    pause: jest.fn().mockResolvedValue(undefined),
    resume: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<Queue>);

  beforeEach(async () => {
    bookingQueue = createMockQueue('booking');
    voiceQueue = createMockQueue('voice');
    notificationQueue = createMockQueue('notification');

    loggerService = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
      setContext: jest.fn(),
    } as unknown as jest.Mocked<LoggerService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        {
          provide: getQueueToken('booking'),
          useValue: bookingQueue,
        },
        {
          provide: getQueueToken('voice'),
          useValue: voiceQueue,
        },
        {
          provide: getQueueToken('notification'),
          useValue: notificationQueue,
        },
        {
          provide: LoggerService,
          useValue: loggerService,
        },
      ],
    }).compile();

    service = module.get<QueueService>(QueueService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addBookingJob', () => {
    it('should add a job to booking queue', async () => {
      const jobData: QueueJobData = {
        type: 'create-booking',
        payload: { customerId: '123', slot: '10:00' },
        tenantId: 'tenant-1',
      };
      const mockJob = createMockJob('job-1', 'create-booking', jobData) as Job;
      bookingQueue.add.mockResolvedValue(mockJob as Job);

      const result = await service.addBookingJob('create-booking', jobData);

      expect(bookingQueue.add).toHaveBeenCalledWith(
        'create-booking',
        jobData,
        expect.objectContaining({
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
        }),
      );
      expect(result).toBe(mockJob);
      expect(loggerService.log).toHaveBeenCalledWith(
        `Added job job-1 (create-booking) to booking queue`,
      );
    });

    it('should add a job with custom options', async () => {
      const jobData: QueueJobData = {
        type: 'update-booking',
        payload: { bookingId: '456' },
      };
      const options: JobOptions = {
        delay: 5000,
        priority: 10,
        attempts: 5,
        backoff: { type: 'fixed', delay: 2000 },
        jobId: 'custom-job-id',
        removeOnComplete: true,
        removeOnFail: 10,
      };
      const mockJob = createMockJob('custom-job-id', 'update-booking', jobData) as Job;
      bookingQueue.add.mockResolvedValue(mockJob as Job);

      await service.addBookingJob('update-booking', jobData, options);

      expect(bookingQueue.add).toHaveBeenCalledWith('update-booking', jobData, {
        ...options,
        attempts: 5,
        backoff: { type: 'fixed', delay: 2000 },
      });
    });

    it('should handle job addition error', async () => {
      const jobData: QueueJobData = {
        type: 'create-booking',
        payload: {},
      };
      const error = new Error('Queue error');
      bookingQueue.add.mockRejectedValue(error);

      await expect(service.addBookingJob('create-booking', jobData)).rejects.toThrow('Queue error');
      expect(loggerService.error).toHaveBeenCalledWith(
        'Failed to add job to booking queue: Queue error',
      );
    });
  });

  describe('addVoiceJob', () => {
    it('should add a job to voice queue', async () => {
      const jobData: QueueJobData = {
        type: 'process-voice',
        payload: { audioUrl: 'http://example.com/audio.mp3' },
        tenantId: 'tenant-2',
      };
      const mockJob = createMockJob('voice-job-1', 'process-voice', jobData) as Job;
      voiceQueue.add.mockResolvedValue(mockJob as Job);

      const result = await service.addVoiceJob('process-voice', jobData);

      expect(voiceQueue.add).toHaveBeenCalled();
      expect(result).toBe(mockJob);
      expect(loggerService.log).toHaveBeenCalledWith(
        `Added job voice-job-1 (process-voice) to voice queue`,
      );
    });

    it('should add voice job with delay', async () => {
      const jobData: QueueJobData = {
        type: 'schedule-call',
        payload: { phoneNumber: '+1234567890' },
      };
      const options: JobOptions = { delay: 60000 };
      const mockJob = createMockJob('delayed-voice-job', 'schedule-call', jobData) as Job;
      voiceQueue.add.mockResolvedValue(mockJob as Job);

      await service.addVoiceJob('schedule-call', jobData, options);

      expect(voiceQueue.add).toHaveBeenCalledWith(
        'schedule-call',
        jobData,
        expect.objectContaining({ delay: 60000 }),
      );
    });
  });

  describe('addNotificationJob', () => {
    it('should add a job to notification queue', async () => {
      const jobData: QueueJobData = {
        type: 'send-email',
        payload: { to: 'user@example.com', subject: 'Test' },
        tenantId: 'tenant-3',
        metadata: { priority: 'high' },
      };
      const mockJob = createMockJob('notif-job-1', 'send-email', jobData) as Job;
      notificationQueue.add.mockResolvedValue(mockJob as Job);

      const result = await service.addNotificationJob('send-email', jobData);

      expect(notificationQueue.add).toHaveBeenCalled();
      expect(result).toBe(mockJob);
    });
  });

  describe('getQueueMetrics', () => {
    it('should get metrics for booking queue', async () => {
      const metrics = await service.getQueueMetrics('booking');

      expect(bookingQueue.getWaitingCount).toHaveBeenCalled();
      expect(bookingQueue.getActiveCount).toHaveBeenCalled();
      expect(bookingQueue.getCompletedCount).toHaveBeenCalled();
      expect(bookingQueue.getFailedCount).toHaveBeenCalled();
      expect(bookingQueue.getDelayedCount).toHaveBeenCalled();

      expect(metrics).toEqual({
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 1,
      });
    });

    it('should get metrics for voice queue', async () => {
      voiceQueue.getWaitingCount.mockResolvedValue(10);
      voiceQueue.getActiveCount.mockResolvedValue(3);
      voiceQueue.getCompletedCount.mockResolvedValue(50);
      voiceQueue.getFailedCount.mockResolvedValue(1);
      voiceQueue.getDelayedCount.mockResolvedValue(0);

      const metrics = await service.getQueueMetrics('voice');

      expect(metrics).toEqual({
        waiting: 10,
        active: 3,
        completed: 50,
        failed: 1,
        delayed: 0,
      });
    });

    it('should get metrics for notification queue', async () => {
      const metrics = await service.getQueueMetrics('notification');

      expect(notificationQueue.getWaitingCount).toHaveBeenCalled();
      expect(metrics.waiting).toBe(5);
    });
  });

  describe('cleanCompletedJobs', () => {
    it('should clean completed jobs with default olderThanHours', async () => {
      await service.cleanCompletedJobs('booking');

      expect(bookingQueue.clean).toHaveBeenCalledWith(
        expect.any(Number),
        1000,
        'completed',
      );
      expect(loggerService.log).toHaveBeenCalledWith(
        'Cleaned completed jobs from booking queue',
      );
    });

    it('should clean completed jobs with custom olderThanHours', async () => {
      await service.cleanCompletedJobs('voice', 48);

      const expectedTimestamp = Date.now() - 48 * 60 * 60 * 1000;
      expect(voiceQueue.clean).toHaveBeenCalledWith(
        expect.any(Number),
        1000,
        'completed',
      );
      
      const actualTimestamp = voiceQueue.clean.mock.calls[0][0] as number;
      expect(actualTimestamp).toBeGreaterThan(expectedTimestamp - 1000);
      expect(actualTimestamp).toBeLessThan(expectedTimestamp + 1000);
    });

    it('should clean notification queue', async () => {
      await service.cleanCompletedJobs('notification', 12);

      expect(notificationQueue.clean).toHaveBeenCalled();
      expect(loggerService.log).toHaveBeenCalledWith(
        'Cleaned completed jobs from notification queue',
      );
    });
  });

  describe('retryFailedJobs', () => {
    it('should retry failed jobs with default count', async () => {
      const failedJob1 = createMockJob('failed-1', 'job1', { type: 'test', payload: {} });
      const failedJob2 = createMockJob('failed-2', 'job2', { type: 'test', payload: {} });
      bookingQueue.getFailed.mockResolvedValue([failedJob1, failedJob2] as Job[]);

      const result = await service.retryFailedJobs('booking');

      expect(bookingQueue.getFailed).toHaveBeenCalled();
      expect(failedJob1.retry).toHaveBeenCalled();
      expect(failedJob2.retry).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('should retry only specified number of jobs', async () => {
      const failedJobs = Array.from({ length: 10 }, (_, i) =>
        createMockJob(`failed-${i}`, `job${i}`, { type: 'test', payload: {} }),
      );
      bookingQueue.getFailed.mockResolvedValue(failedJobs as Job[]);

      const result = await service.retryFailedJobs('booking', 5);

      expect(result).toHaveLength(5);
      expect(failedJobs[0].retry).toHaveBeenCalled();
      expect(failedJobs[4].retry).toHaveBeenCalled();
      expect(failedJobs[5].retry).not.toHaveBeenCalled();
    });

    it('should handle retry failure for individual jobs', async () => {
      const failedJob1 = createMockJob('failed-1', 'job1', { type: 'test', payload: {} });
      const failedJob2 = {
        ...createMockJob('failed-2', 'job2', { type: 'test', payload: {} }),
        retry: jest.fn().mockRejectedValue(new Error('Retry failed')),
      };
      bookingQueue.getFailed.mockResolvedValue([failedJob1, failedJob2] as Job[]);

      const result = await service.retryFailedJobs('booking');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('failed-1');
      expect(loggerService.error).toHaveBeenCalledWith(
        'Failed to retry job failed-2: Retry failed',
      );
    });

    it('should retry failed jobs for voice queue', async () => {
      const failedJob = createMockJob('voice-failed', 'voice-job', { type: 'test', payload: {} });
      voiceQueue.getFailed.mockResolvedValue([failedJob] as Job[]);

      await service.retryFailedJobs('voice');

      expect(voiceQueue.getFailed).toHaveBeenCalled();
    });
  });

  describe('pauseQueue', () => {
    it('should pause booking queue', async () => {
      await service.pauseQueue('booking');

      expect(bookingQueue.pause).toHaveBeenCalled();
      expect(loggerService.log).toHaveBeenCalledWith('Paused booking queue');
    });

    it('should pause voice queue', async () => {
      await service.pauseQueue('voice');

      expect(voiceQueue.pause).toHaveBeenCalled();
      expect(loggerService.log).toHaveBeenCalledWith('Paused voice queue');
    });

    it('should pause notification queue', async () => {
      await service.pauseQueue('notification');

      expect(notificationQueue.pause).toHaveBeenCalled();
      expect(loggerService.log).toHaveBeenCalledWith('Paused notification queue');
    });
  });

  describe('resumeQueue', () => {
    it('should resume booking queue', async () => {
      await service.resumeQueue('booking');

      expect(bookingQueue.resume).toHaveBeenCalled();
      expect(loggerService.log).toHaveBeenCalledWith('Resumed booking queue');
    });

    it('should resume voice queue', async () => {
      await service.resumeQueue('voice');

      expect(voiceQueue.resume).toHaveBeenCalled();
      expect(loggerService.log).toHaveBeenCalledWith('Resumed voice queue');
    });

    it('should resume notification queue', async () => {
      await service.resumeQueue('notification');

      expect(notificationQueue.resume).toHaveBeenCalled();
      expect(loggerService.log).toHaveBeenCalledWith('Resumed notification queue');
    });
  });

  describe('getQueue (private method)', () => {
    it('should throw error for unknown queue name', async () => {
      // Test the default case by calling a method that uses getQueue
      // We'll use a type assertion to bypass TypeScript's type checking
      await expect(service.getQueueMetrics('unknown' as any)).rejects.toThrow('Unknown queue: unknown');
    });
  });

  describe('constructor injection', () => {
    it('should inject all three queues', async () => {
      // Verify all three queues are properly injected by adding jobs
      const jobData: QueueJobData = { type: 'test', payload: {} };
      
      bookingQueue.add.mockResolvedValue({ id: '1' } as Job);
      voiceQueue.add.mockResolvedValue({ id: '2' } as Job);
      notificationQueue.add.mockResolvedValue({ id: '3' } as Job);

      await service.addBookingJob('test', jobData);
      await service.addVoiceJob('test', jobData);
      await service.addNotificationJob('test', jobData);

      expect(bookingQueue.add).toHaveBeenCalled();
      expect(voiceQueue.add).toHaveBeenCalled();
      expect(notificationQueue.add).toHaveBeenCalled();
    });
  });
});
