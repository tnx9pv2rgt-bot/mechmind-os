import pino, { Logger } from 'pino';

let rootLogger: Logger | null = null;

export function getLogger(name: string): Logger {
  if (!rootLogger) {
    rootLogger = pino({
      level: process.env.LOG_LEVEL ?? 'info',
      base: { pid: process.pid },
      timestamp: pino.stdTimeFunctions.isoTime,
      transport: process.stdout.isTTY
        ? {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'HH:MM:ss.l' },
          }
        : undefined,
    });
  }
  return rootLogger.child({ component: name });
}
