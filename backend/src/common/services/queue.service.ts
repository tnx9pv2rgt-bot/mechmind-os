import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { LoggerService } from './logger.service';

export interface QueueJobData {
  type: string;
  payload: Record<string, any>;
  tenantId?: string;
  metadata?: Record<string, any>;
}

export interface JobOptions {
  delay?: number;
  priority?: number;
  attempts?: number;
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
  jobId?: string;
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
}

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('booking') private readonly bookingQueue: Queue,
    @InjectQueue('voice') private readonly voiceQueue: Queue,
    @InjectQueue('notification') private readonly notificationQueue: Queue,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Add a job to the booking queue
   */
  async addBookingJob(
    jobName: string,
    data: QueueJobData,
    options?: JobOptions,
  ): Promise<Job<QueueJobData>> {
    return this.addJob(this.bookingQueue, jobName, data, options);
  }

  /**
   * Add a job to the voice queue
   */
  async addVoiceJob(
    jobName: string,
    data: QueueJobData,
    options?: JobOptions,
  ): Promise<Job<QueueJobData>> {
    return this.addJob(this.voiceQueue, jobName, data, options);
  }

  /**
   * Add a job to the notification queue
   */
  async addNotificationJob(
    jobName: string,
    data: QueueJobData,
    options?: JobOptions,
  ): Promise<Job<QueueJobData>> {
    return this.addJob(this.notificationQueue, jobName, data, options);
  }

  /**
   * Get queue metrics
   */
  async getQueueMetrics(queueName: 'booking' | 'voice' | 'notification'): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const queue = this.getQueue(queueName);

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  /**
   * Clean completed jobs from queue
   */
  async cleanCompletedJobs(
    queueName: 'booking' | 'voice' | 'notification',
    olderThanHours: number = 24,
  ): Promise<void> {
    const queue = this.getQueue(queueName);
    const timestamp = Date.now() - olderThanHours * 60 * 60 * 1000;

    await queue.clean(timestamp, 1000, 'completed');
    this.logger.log(`Cleaned completed jobs from ${queueName} queue`);
  }

  /**
   * Retry failed jobs
   */
  async retryFailedJobs(
    queueName: 'booking' | 'voice' | 'notification',
    count: number = 100,
  ): Promise<Job[]> {
    const queue = this.getQueue(queueName);
    const failedJobs = await queue.getFailed();

    const jobsToRetry = failedJobs.slice(0, count);
    const retriedJobs: Job[] = [];

    for (const job of jobsToRetry) {
      try {
        await job.retry();
        retriedJobs.push(job);
      } catch (error) {
        this.logger.error(`Failed to retry job ${job.id}: ${error.message}`);
      }
    }

    return retriedJobs;
  }

  /**
   * Pause a queue
   */
  async pauseQueue(queueName: 'booking' | 'voice' | 'notification'): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.pause();
    this.logger.log(`Paused ${queueName} queue`);
  }

  /**
   * Resume a queue
   */
  async resumeQueue(queueName: 'booking' | 'voice' | 'notification'): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.resume();
    this.logger.log(`Resumed ${queueName} queue`);
  }

  /**
   * Add job to queue with logging
   */
  private async addJob<T extends QueueJobData>(
    queue: Queue<T>,
    jobName: string,
    data: T,
    options?: JobOptions,
  ): Promise<Job<T>> {
    try {
      const job = await queue.add(jobName as any, data as any, {
        ...options,
        attempts: options?.attempts ?? 3,
        backoff: options?.backoff ?? {
          type: 'exponential',
          delay: 1000,
        },
      });

      this.logger.log(`Added job ${job.id} (${jobName}) to ${queue.name} queue`);
      return job;
    } catch (error) {
      this.logger.error(`Failed to add job to ${queue.name} queue: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get queue by name
   */
  private getQueue(name: 'booking' | 'voice' | 'notification'): Queue {
    switch (name) {
      case 'booking':
        return this.bookingQueue;
      case 'voice':
        return this.voiceQueue;
      case 'notification':
        return this.notificationQueue;
      default:
        throw new Error(`Unknown queue: ${name}`);
    }
  }
}
