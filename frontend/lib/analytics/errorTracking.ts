/**
 * Error Tracking Integration
 *
 * Integrazione con Sentry/LogRocket per error tracking e performance monitoring
 */

// Tipi per gli errori
type ErrorLevel = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

interface ErrorContext {
  userId?: string;
  formStep?: number;
  formData?: Record<string, unknown>;
  componentStack?: string;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}

interface PerformanceMetrics {
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  fcp: number; // First Contentful Paint
  ttfb: number; // Time to First Byte
}

interface NetworkError {
  url: string;
  method: string;
  status?: number;
  statusText?: string;
  responseText?: string;
  duration: number;
}

// Interfaccia per Sentry SDK (dynamic import)
interface SentryScope {
  setUser: (user: { id: string; [key: string]: unknown }) => void;
  setTags: (tags: Record<string, string>) => void;
  setExtras: (extras: Record<string, unknown>) => void;
  setContext: (name: string, context: Record<string, unknown>) => void;
  setSpan: (transaction: SentryTransaction) => void;
}

interface SentryTransaction {
  name: string;
  startTimestamp: number;
  finish: (options?: { status: string }) => void;
  setData: (key: string, value: unknown) => void;
}

interface SentryEvent {
  exception?: unknown;
  request?: {
    data?: Record<string, unknown>;
    headers?: Record<string, string>;
    cookies?: Record<string, string>;
  };
  extra?: {
    formData?: Record<string, unknown>;
    [key: string]: unknown;
  };
  contexts?: Record<string, Record<string, unknown>>;
}

interface SentryLike {
  init: (config: Record<string, unknown>) => void;
  captureException: (error: Error, scope?: SentryScope) => string;
  captureMessage: (message: string, level?: string) => string;
  setUser: (user: { id: string; [key: string]: unknown }) => void;
  setContext: (name: string, context: Record<string, unknown>) => void;
  setTag: (key: string, value: string) => void;
  addBreadcrumb: (breadcrumb: Record<string, unknown>) => void;
  startTransaction: (options: { name: string; op: string }) => SentryTransaction;
  getCurrentHub: () => {
    configureScope: (callback: (scope: SentryScope) => void) => void;
  };
  replayIntegration: (config: Record<string, boolean>) => unknown;
  Scope: new () => SentryScope;
  close: () => void;
}

// Interfaccia per LogRocket SDK (dynamic import)
interface LogRocketNetworkRequest {
  headers: Record<string, string>;
  body?: string;
}

interface LogRocketNetworkResponse {
  headers: Record<string, string>;
  body?: string;
  status?: number;
}

interface LogRocketLike {
  init: (appId: string, config?: Record<string, unknown>) => void;
  captureException: (error: Error, context?: Record<string, unknown>) => void;
  captureMessage: (message: string, context?: Record<string, unknown>) => void;
  identify: (userId: string, traits?: Record<string, unknown>) => void;
  log: (message: string, data?: unknown) => void;
}

// Layout shift entry extends PerformanceEntry
interface LayoutShiftEntry extends PerformanceEntry {
  hadRecentInput: boolean;
  value: number;
}

// Provider di error tracking
interface ErrorTrackingProvider {
  init: (config: Record<string, unknown>) => void;
  captureException: (error: Error, context?: ErrorContext) => string | null;
  captureMessage: (message: string, level?: ErrorLevel, context?: ErrorContext) => string | null;
  setUser: (user: { id: string; email?: string; [key: string]: unknown }) => void;
  setContext: (name: string, context: Record<string, unknown>) => void;
  setTag: (key: string, value: string) => void;
  addBreadcrumb: (breadcrumb: {
    message: string;
    category?: string;
    level?: ErrorLevel;
    data?: Record<string, unknown>;
  }) => void;
  startTransaction: (name: string, op: string) => Transaction;
  close: () => void;
}

interface Transaction {
  name: string;
  op: string;
  startTimestamp: number;
  finish: (status?: string) => void;
  setData: (key: string, value: unknown) => void;
}

// Provider Sentry
class SentryProvider implements ErrorTrackingProvider {
  private Sentry: SentryLike | null = null;
  private initialized = false;

  async init(config: Record<string, unknown>): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const SentryModule = await import('@sentry/nextjs');
      this.Sentry = SentryModule as unknown as SentryLike;

      this.Sentry.init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        environment: process.env.NODE_ENV,
        tracesSampleRate: 1.0,
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
        integrations: [
          this.Sentry.replayIntegration({
            maskAllText: false,
            maskAllInputs: false,
            blockAllMedia: false,
          }),
        ],
        beforeSend: (event: SentryEvent) => {
          // Filtra dati sensibili
          if (event.exception) {
            this.sanitizeEvent(event);
          }
          return event;
        },
        ...config,
      });

      this.initialized = true;
    } catch (error) {
      console.warn('Sentry initialization failed:', error);
    }
  }

  private sanitizeEvent(event: SentryEvent): void {
    // Rimuovi dati sensibili dagli eventi
    const sensitiveFields = ['password', 'token', 'ssn', 'creditCard', 'vatNumber'];

    if (event.request?.data) {
      const requestData = event.request.data;
      sensitiveFields.forEach(field => {
        delete requestData[field];
      });
    }

    if (event.extra?.formData) {
      const formData = event.extra.formData;
      sensitiveFields.forEach(field => {
        delete formData[field];
      });
    }
  }

  captureException(error: Error, context?: ErrorContext): string | null {
    if (!this.initialized || !this.Sentry) return null;

    const scope = new this.Sentry.Scope();

    if (context) {
      if (context.userId) scope.setUser({ id: context.userId });
      if (context.tags) scope.setTags(context.tags);
      if (context.extra) scope.setExtras(context.extra);
      if (context.formStep !== undefined) {
        scope.setContext('form', { step: context.formStep });
      }
    }

    return this.Sentry.captureException(error, scope);
  }

  captureMessage(
    message: string,
    level: ErrorLevel = 'info',
    context?: ErrorContext
  ): string | null {
    if (!this.initialized || !this.Sentry) return null;

    const scope = new this.Sentry.Scope();

    if (context) {
      if (context.userId) scope.setUser({ id: context.userId });
      if (context.tags) scope.setTags(context.tags);
      if (context.extra) scope.setExtras(context.extra);
    }

    return this.Sentry.captureMessage(message, level);
  }

  setUser(user: { id: string; email?: string; [key: string]: unknown }): void {
    if (!this.initialized || !this.Sentry) return;
    this.Sentry.setUser(user);
  }

  setContext(name: string, context: Record<string, unknown>): void {
    if (!this.initialized || !this.Sentry) return;
    this.Sentry.setContext(name, context);
  }

  setTag(key: string, value: string): void {
    if (!this.initialized || !this.Sentry) return;
    this.Sentry.setTag(key, value);
  }

  addBreadcrumb(breadcrumb: {
    message: string;
    category?: string;
    level?: ErrorLevel;
    data?: Record<string, unknown>;
  }): void {
    if (!this.initialized || !this.Sentry) return;
    this.Sentry.addBreadcrumb(breadcrumb);
  }

  startTransaction(name: string, op: string): Transaction {
    if (!this.initialized || !this.Sentry) {
      return {
        name,
        op,
        startTimestamp: Date.now(),
        finish: () => {},
        setData: () => {},
      };
    }

    const transaction = this.Sentry.startTransaction({ name, op });
    this.Sentry.getCurrentHub().configureScope((scope: SentryScope) => {
      scope.setSpan(transaction);
    });

    return {
      name,
      op,
      startTimestamp: transaction.startTimestamp,
      finish: (status?: string) => transaction.finish(status ? { status } : undefined),
      setData: (key: string, value: unknown) => transaction.setData(key, value),
    };
  }

  close(): void {
    if (!this.initialized || !this.Sentry) return;
    this.Sentry.close();
  }
}

// Provider LogRocket
class LogRocketProvider implements ErrorTrackingProvider {
  private LogRocket: LogRocketLike | null = null;
  private initialized = false;

  async init(config: Record<string, unknown>): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const LogRocketModule = await import('logrocket');
      this.LogRocket = LogRocketModule.default as unknown as LogRocketLike;

      this.LogRocket.init(process.env.NEXT_PUBLIC_LOGROCKET_APP_ID || '', {
        network: {
          requestSanitizer: (request: LogRocketNetworkRequest) => {
            // Sanitizza richieste
            if (request.headers) {
              delete request.headers['Authorization'];
            }
            return request;
          },
          responseSanitizer: (response: LogRocketNetworkResponse) => {
            return response;
          },
        },
        console: {
          shouldCaptureConsoleLog: true,
        },
        ...config,
      });

      this.initialized = true;
    } catch (error) {
      console.warn('LogRocket initialization failed:', error);
    }
  }

  captureException(error: Error, context?: ErrorContext): string | null {
    if (!this.initialized || !this.LogRocket) return null;

    this.LogRocket.captureException(error, {
      tags: context?.tags,
      extra: {
        ...context?.extra,
        formStep: context?.formStep,
      },
    });

    return null;
  }

  captureMessage(
    message: string,
    level: ErrorLevel = 'info',
    context?: ErrorContext
  ): string | null {
    if (!this.initialized || !this.LogRocket) return null;

    this.LogRocket.captureMessage(message, {
      level,
      tags: context?.tags,
      extra: context?.extra,
    });

    return null;
  }

  setUser(user: { id: string; email?: string; [key: string]: unknown }): void {
    if (!this.initialized || !this.LogRocket) return;
    this.LogRocket.identify(user.id, user);
  }

  setContext(name: string, context: Record<string, unknown>): void {
    if (!this.initialized || !this.LogRocket) return;
    this.LogRocket.log(`${name}:`, context);
  }

  setTag(key: string, value: string): void {
    // LogRocket non ha setTag nativo
  }

  addBreadcrumb(breadcrumb: {
    message: string;
    category?: string;
    level?: ErrorLevel;
    data?: Record<string, unknown>;
  }): void {
    if (!this.initialized || !this.LogRocket) return;
    this.LogRocket.log(`[${breadcrumb.category}] ${breadcrumb.message}`, breadcrumb.data);
  }

  startTransaction(name: string, op: string): Transaction {
    if (!this.initialized || !this.LogRocket) {
      return {
        name,
        op,
        startTimestamp: Date.now(),
        finish: () => {},
        setData: () => {},
      };
    }

    const startTime = Date.now();

    return {
      name,
      op,
      startTimestamp: startTime,
      finish: (status?: string) => {
        const duration = Date.now() - startTime;
        this.LogRocket?.log(`Transaction ${name} finished`, { duration, status });
      },
      setData: (key: string, value: unknown) => {
        this.LogRocket?.log(`Transaction ${name} data`, { [key]: value });
      },
    };
  }

  close(): void {
    // LogRocket non ha un metodo close
  }
}

// Classe principale ErrorTracker
class ErrorTracker {
  private providers: ErrorTrackingProvider[] = [];
  private initialized = false;
  private performanceMetrics: Partial<PerformanceMetrics> = {};
  private errorCount = 0;
  private observers: PerformanceObserver[] = [];

  async init(): Promise<void> {
    if (this.initialized || typeof window === 'undefined') return;

    // Inizializza Sentry se configurato
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      const sentry = new SentryProvider();
      await sentry.init({});
      this.providers.push(sentry);
    }

    // Inizializza LogRocket se configurato
    if (process.env.NEXT_PUBLIC_LOGROCKET_APP_ID) {
      const logrocket = new LogRocketProvider();
      await logrocket.init({});
      this.providers.push(logrocket);
    }

    // Setup global error handlers
    this.setupErrorHandlers();

    // Setup performance monitoring
    this.setupPerformanceMonitoring();

    this.initialized = true;
  }

  private setupErrorHandlers(): void {
    if (typeof window === 'undefined') return;

    // Global error handler
    window.addEventListener('error', event => {
      this.captureException(event.error, {
        tags: { type: 'unhandled' },
        extra: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    });

    // Unhandled promise rejection
    window.addEventListener('unhandledrejection', event => {
      const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));

      this.captureException(error, {
        tags: { type: 'unhandledrejection' },
      });
    });

    // Intercept fetch per errori di rete
    this.interceptFetch();

    // Intercept console.error
    this.interceptConsoleError();
  }

  private interceptFetch(): void {
    if (typeof window === 'undefined') return;

    const originalFetch = window.fetch;
    const self = this;

    window.fetch = async function (...args) {
      const startTime = Date.now();
      const [url, options] = args;
      const method = options?.method || 'GET';

      try {
        const response = await originalFetch.apply(this, args);
        const duration = Date.now() - startTime;

        if (!response.ok) {
          const networkError: NetworkError = {
            url: String(url),
            method,
            status: response.status,
            statusText: response.statusText,
            duration,
          };

          self.captureNetworkError(networkError);
        }

        return response;
      } catch (error) {
        const duration = Date.now() - startTime;

        self.captureNetworkError({
          url: String(url),
          method,
          duration,
        });

        throw error;
      }
    };
  }

  private interceptConsoleError(): void {
    if (typeof window === 'undefined') return;

    const originalConsoleError = console.error;
    const self = this;

    console.error = function (...args) {
      // Non tracciare errori di React in development
      const isReactError = args.some(arg => typeof arg === 'string' && arg.includes('Warning:'));

      if (!isReactError) {
        const errorMessage = args
          .map(arg => (arg instanceof Error ? arg.message : String(arg)))
          .join(' ');

        self.captureMessage(errorMessage, 'error', {
          tags: { source: 'console' },
        });
      }

      originalConsoleError.apply(this, args);
    };
  }

  private setupPerformanceMonitoring(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    // LCP
    const lcpObserver = new PerformanceObserver(list => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.performanceMetrics.lcp = lastEntry.startTime;
    });

    try {
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);
    } catch (e) {
      // LCP non supportato
    }

    // FID
    const fidObserver = new PerformanceObserver(list => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        if (entry.entryType === 'first-input') {
          const eventEntry = entry as unknown as { processingStart: number; startTime: number };
          this.performanceMetrics.fid = eventEntry.processingStart - eventEntry.startTime;
        }
      });
    });

    try {
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);
    } catch (e) {
      // FID non supportato
    }

    // CLS
    let clsValue = 0;
    const clsObserver = new PerformanceObserver(list => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        const layoutShift = entry as LayoutShiftEntry;
        if (!layoutShift.hadRecentInput) {
          clsValue += layoutShift.value;
        }
      });
      this.performanceMetrics.cls = clsValue;
    });

    try {
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);
    } catch (e) {
      // CLS non supportato
    }

    // FCP e TTFB
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming;
      if (navigation) {
        this.performanceMetrics.ttfb = navigation.responseStart - navigation.startTime;
      }

      const paintEntries = performance.getEntriesByType('paint');
      paintEntries.forEach(entry => {
        if (entry.name === 'first-contentful-paint') {
          this.performanceMetrics.fcp = entry.startTime;
        }
      });
    });
  }

  // Metodi pubblici
  captureException(error: Error, context?: ErrorContext): void {
    this.errorCount++;
    this.providers.forEach(provider => {
      provider.captureException(error, context);
    });
  }

  captureMessage(message: string, level: ErrorLevel = 'info', context?: ErrorContext): void {
    this.providers.forEach(provider => {
      provider.captureMessage(message, level, context);
    });
  }

  captureNetworkError(error: NetworkError): void {
    this.captureMessage(`Network Error: ${error.method} ${error.url}`, 'error', {
      tags: { type: 'network', status: String(error.status) },
      extra: { ...error },
    });
  }

  captureValidationError(field: string, error: string, formStep?: number): void {
    this.captureMessage(`Validation Error: ${field}`, 'warning', {
      tags: { type: 'validation' },
      extra: { field, error, formStep },
    });
  }

  setUser(user: { id: string; email?: string; [key: string]: unknown }): void {
    this.providers.forEach(provider => {
      provider.setUser(user);
    });
  }

  setContext(name: string, context: Record<string, unknown>): void {
    this.providers.forEach(provider => {
      provider.setContext(name, context);
    });
  }

  setTag(key: string, value: string): void {
    this.providers.forEach(provider => {
      provider.setTag(key, value);
    });
  }

  addBreadcrumb(message: string, category?: string, data?: Record<string, unknown>): void {
    this.providers.forEach(provider => {
      provider.addBreadcrumb({ message, category, data });
    });
  }

  startTransaction(name: string, op: string): Transaction {
    // Usa il primo provider disponibile
    if (this.providers.length > 0) {
      return this.providers[0].startTransaction(name, op);
    }

    return {
      name,
      op,
      startTimestamp: Date.now(),
      finish: () => {},
      setData: () => {},
    };
  }

  // Form specific methods
  setFormContext(step: number, data?: Record<string, unknown>): void {
    this.setContext('form', { step, ...data });
    this.setTag('form_step', String(step));
  }

  trackFormError(error: Error, step: number, field?: string): void {
    this.captureException(error, {
      formStep: step,
      tags: { type: 'form_error', ...(field ? { field } : {}) },
    });
  }

  // Performance
  getPerformanceMetrics(): Partial<PerformanceMetrics> {
    return { ...this.performanceMetrics };
  }

  getErrorCount(): number {
    return this.errorCount;
  }

  destroy(): void {
    this.observers.forEach(obs => obs.disconnect());
    this.observers = [];
  }

  close(): void {
    this.destroy();
    this.providers.forEach(provider => provider.close());
  }
}

// Esporta singleton
export const errorTracker = new ErrorTracker();

// Hook per React
export function useErrorTracker() {
  return errorTracker;
}

// Error Boundary helper
export function captureReactError(error: Error, errorInfo: { componentStack: string }): void {
  errorTracker.captureException(error, {
    componentStack: errorInfo.componentStack,
    tags: { type: 'react' },
  });
}

// Tipi esportati
export type {
  ErrorLevel,
  ErrorContext,
  PerformanceMetrics,
  NetworkError,
  ErrorTrackingProvider,
  Transaction,
};
