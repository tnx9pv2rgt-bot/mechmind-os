import { Injectable, OnApplicationShutdown, INestApplication } from '@nestjs/common';
import { LoggerService } from './logger.service';

/**
 * Tracks application shutdown state for readiness probes.
 * When SIGTERM is received, isShuttingDown becomes true BEFORE
 * connections are drained — this tells the load balancer to stop
 * sending new traffic immediately.
 */
@Injectable()
export class ShutdownService implements OnApplicationShutdown {
  private shuttingDown = false;
  private app: INestApplication | null = null;

  constructor(private readonly logger: LoggerService) {}

  setApp(app: INestApplication): void {
    this.app = app;
  }

  get isShuttingDown(): boolean {
    return this.shuttingDown;
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.shuttingDown = true;
    
    let signalName: string;
    if (signal) {
      signalName = signal;
    } else {
      signalName = 'unknown';
    }
    
    this.logger.log(
      `Shutdown initiated (signal: ${signalName}). Readiness probe now returns 503.`,
    );
  }
}
