/**
 * POSIX signal handling: register cleanup callbacks that run exactly
 * once on SIGINT/SIGTERM/uncaughtException, then re-raise the signal
 * so exit codes stay correct for CI systems.
 */

import { getLogger } from './logger';

const log = getLogger('signal');

type Cleanup = () => Promise<void> | void;

const cleanups: Cleanup[] = [];
let installed = false;

export function onShutdown(cleanup: Cleanup): void {
  cleanups.push(cleanup);
  if (!installed) install();
}

function install(): void {
  installed = true;
  const handler = (signal: string) => {
    void runCleanups().finally(() => {
      log.warn({ signal }, 'shutting down');
      process.exit(signal === 'SIGINT' ? 130 : signal === 'SIGTERM' ? 143 : 1);
    });
  };
  process.once('SIGINT', () => handler('SIGINT'));
  process.once('SIGTERM', () => handler('SIGTERM'));
  process.once('uncaughtException', (err) => {
    log.error({ err }, 'uncaught exception');
    handler('UNCAUGHT');
  });
  process.once('unhandledRejection', (reason) => {
    log.error({ reason }, 'unhandled rejection');
    handler('UNHANDLED');
  });
}

async function runCleanups(): Promise<void> {
  for (const c of cleanups.splice(0)) {
    try {
      await c();
    } catch (err) {
      log.error({ err }, 'cleanup failed');
    }
  }
}
