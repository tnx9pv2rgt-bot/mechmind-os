import { Injectable } from '@nestjs/common';
import { LoggerService } from './logger.service';

@Injectable()
export class LockMonitorService {
  private acquisitions = 0;
  private failures = 0;
  private totalWaitTimeMs = 0;

  constructor(private readonly logger: LoggerService) {}

  async recordLockAcquisition(waitTimeMs: number): Promise<void> {
    this.acquisitions++;
    this.totalWaitTimeMs += waitTimeMs;

    if (waitTimeMs > 5000) {
      this.logger.warn(
        `LockMonitor: slow lock acquisition (${waitTimeMs}ms). ` +
          `Total: ${this.acquisitions} acquired, ${this.failures} failed, ` +
          `avg wait: ${Math.round(this.totalWaitTimeMs / this.acquisitions)}ms`,
      );
    }
  }

  async recordLockFailure(): Promise<void> {
    this.failures++;
    this.logger.warn(
      `LockMonitor: lock acquisition failed. ` +
        `Total: ${this.acquisitions} acquired, ${this.failures} failed`,
    );
  }

  getMetrics(): { acquisitions: number; failures: number; avgWaitTimeMs: number } {
    return {
      acquisitions: this.acquisitions,
      failures: this.failures,
      avgWaitTimeMs:
        this.acquisitions > 0 ? Math.round(this.totalWaitTimeMs / this.acquisitions) : 0,
    };
  }
}
