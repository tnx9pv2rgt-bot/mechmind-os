import { Injectable } from '@nestjs/common';

@Injectable()
export class LockMonitorService {
  async recordLockAcquisition(waitTimeMs: number): Promise<void> {
    // Record lock acquisition metric
  }

  async recordLockFailure(): Promise<void> {
    // Record lock failure metric
  }
}
