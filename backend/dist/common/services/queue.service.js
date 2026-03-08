"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const logger_service_1 = require("./logger.service");
let QueueService = class QueueService {
    constructor(bookingQueue, voiceQueue, notificationQueue, logger) {
        this.bookingQueue = bookingQueue;
        this.voiceQueue = voiceQueue;
        this.notificationQueue = notificationQueue;
        this.logger = logger;
    }
    async addBookingJob(jobName, data, options) {
        return this.addJob(this.bookingQueue, jobName, data, options);
    }
    async addVoiceJob(jobName, data, options) {
        return this.addJob(this.voiceQueue, jobName, data, options);
    }
    async addNotificationJob(jobName, data, options) {
        return this.addJob(this.notificationQueue, jobName, data, options);
    }
    async getQueueMetrics(queueName) {
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
    async cleanCompletedJobs(queueName, olderThanHours = 24) {
        const queue = this.getQueue(queueName);
        const timestamp = Date.now() - olderThanHours * 60 * 60 * 1000;
        await queue.clean(timestamp, 1000, 'completed');
        this.logger.log(`Cleaned completed jobs from ${queueName} queue`);
    }
    async retryFailedJobs(queueName, count = 100) {
        const queue = this.getQueue(queueName);
        const failedJobs = await queue.getFailed();
        const jobsToRetry = failedJobs.slice(0, count);
        const retriedJobs = [];
        for (const job of jobsToRetry) {
            try {
                await job.retry();
                retriedJobs.push(job);
            }
            catch (error) {
                this.logger.error(`Failed to retry job ${job.id}: ${error.message}`);
            }
        }
        return retriedJobs;
    }
    async pauseQueue(queueName) {
        const queue = this.getQueue(queueName);
        await queue.pause();
        this.logger.log(`Paused ${queueName} queue`);
    }
    async resumeQueue(queueName) {
        const queue = this.getQueue(queueName);
        await queue.resume();
        this.logger.log(`Resumed ${queueName} queue`);
    }
    async addJob(queue, jobName, data, options) {
        try {
            const job = await queue.add(jobName, data, {
                ...options,
                attempts: options?.attempts ?? 3,
                backoff: options?.backoff ?? {
                    type: 'exponential',
                    delay: 1000,
                },
            });
            this.logger.log(`Added job ${job.id} (${jobName}) to ${queue.name} queue`);
            return job;
        }
        catch (error) {
            this.logger.error(`Failed to add job to ${queue.name} queue: ${error.message}`);
            throw error;
        }
    }
    getQueue(name) {
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
};
exports.QueueService = QueueService;
exports.QueueService = QueueService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bullmq_1.InjectQueue)('booking')),
    __param(1, (0, bullmq_1.InjectQueue)('voice')),
    __param(2, (0, bullmq_1.InjectQueue)('notification')),
    __metadata("design:paramtypes", [bullmq_2.Queue,
        bullmq_2.Queue,
        bullmq_2.Queue,
        logger_service_1.LoggerService])
], QueueService);
