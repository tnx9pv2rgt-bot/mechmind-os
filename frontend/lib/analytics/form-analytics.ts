/**
 * Form Analytics System
 * Sistema completo di tracciamento per form con funnel, heatmap, A/B testing
 */

// ============================================
// TYPES
// ============================================

export interface FormEvent {
  formId: string;
  eventType: 'step_start' | 'step_complete' | 'field_error' | 'abandoned' | 'conversion' | 'experiment_assigned';
  timestamp: number;
  sessionId: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface StepEvent extends FormEvent {
  step: number;
  stepName?: string;
  timeSpent?: number;
}

export interface ErrorEvent extends FormEvent {
  field: string;
  error: string;
  step: number;
}

export interface AbandonmentEvent extends FormEvent {
  step: number;
  lastField: string;
  timeOnForm: number;
}

export interface ExperimentEvent extends FormEvent {
  experimentId: string;
  variant: 'A' | 'B';
}

export interface HeatmapData {
  x: number;
  y: number;
  element: string;
  timestamp: number;
  viewport: { width: number; height: number };
}

export interface AnalyticsMetrics {
  activeUsers: number;
  completionRate: number;
  avgTime: number;
  dropOffStep: number | null;
  errors: Array<{ field: string; count: number }>;
  funnelData: Array<{
    step: number;
    stepName: string;
    started: number;
    completed: number;
    dropOff: number;
  }>;
}

export interface ABTestConfig {
  experimentId: string;
  variantA: {
    headline: string;
    description?: string;
    cta?: string;
  };
  variantB: {
    headline: string;
    description?: string;
    cta?: string;
  };
  trafficSplit?: number; // Default 0.5 (50/50)
}

// ============================================
// SESSION MANAGEMENT
// ============================================

const generateSessionId = (): string => {
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const getSessionId = (): string => {
  if (typeof window === 'undefined') return '';
  
  let sessionId = sessionStorage.getItem('form_analytics_session_id');
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem('form_analytics_session_id', sessionId);
  }
  return sessionId;
};

// ============================================
// ANALYTICS ENGINE
// ============================================

class AnalyticsEngine {
  private eventQueue: FormEvent[] = [];
  private flushInterval: number = 5000; // 5 seconds
  private maxBatchSize: number = 50;
  private apiEndpoint: string;
  private isEnabled: boolean;

  constructor() {
    this.apiEndpoint = process.env.NEXT_PUBLIC_ANALYTICS_API || '/api/analytics';
    this.isEnabled = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true';
    
    if (this.isEnabled && typeof window !== 'undefined') {
      this.startFlushInterval();
      this.setupBeforeUnload();
    }
  }

  private startFlushInterval(): void {
    setInterval(() => this.flush(), this.flushInterval);
  }

  private setupBeforeUnload(): void {
    window.addEventListener('beforeunload', () => {
      if (this.eventQueue.length > 0) {
        this.flushSync();
      }
    });
  }

  track(event: FormEvent): void {
    if (!this.isEnabled) return;
    
    event.sessionId = getSessionId();
    event.timestamp = Date.now();
    
    this.eventQueue.push(event);
    
    if (this.eventQueue.length >= this.maxBatchSize) {
      this.flush();
    }
  }

  private async flush(): Promise<void> {
    if (this.eventQueue.length === 0) return;
    
    const events = [...this.eventQueue];
    this.eventQueue = [];
    
    try {
      await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
        keepalive: true,
      });
    } catch (error) {
      // Fallback: re-add failed events to queue (limit to prevent memory issues)
      this.eventQueue = [...events.slice(-20), ...this.eventQueue].slice(0, 100);
      console.warn('Analytics flush failed:', error);
    }
  }

  private flushSync(): void {
    // Synchronous flush for beforeunload
    const events = [...this.eventQueue];
    
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', this.apiEndpoint, false); // Synchronous
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(JSON.stringify({ events }));
    } catch (error) {
      console.warn('Sync analytics flush failed:', error);
    }
  }

  // Debug mode - log to console instead of sending
  enableDebugMode(): void {
    const originalTrack = this.track.bind(this);
    this.track = (event: FormEvent) => {
      console.log('[Analytics]', event);
      originalTrack(event);
    };
  }
}

export const analytics = new AnalyticsEngine();

// ============================================
// FORM FUNNEL TRACKING
// ============================================

export interface FormFunnelOptions {
  formId: string;
  totalSteps: number;
  stepNames?: string[];
}

export class FormFunnel {
  private formId: string;
  private startTime: number;
  private stepStartTime: number;
  private currentStep: number = 0;
  private stepCompletions: Map<number, boolean> = new Map();
  private totalSteps: number;
  private stepNames: string[];

  constructor(options: FormFunnelOptions) {
    this.formId = options.formId;
    this.totalSteps = options.totalSteps;
    this.stepNames = options.stepNames || [];
    this.startTime = Date.now();
    this.stepStartTime = this.startTime;
  }

  trackStepStart(step: number, stepName?: string): void {
    this.currentStep = step;
    this.stepStartTime = Date.now();
    
    analytics.track({
      formId: this.formId,
      eventType: 'step_start',
      timestamp: Date.now(),
      sessionId: getSessionId(),
      step,
      stepName: stepName || this.stepNames[step - 1] || `Step ${step}`,
    } as StepEvent);
  }

  trackStepComplete(step: number, stepName?: string): void {
    const timeSpent = Date.now() - this.stepStartTime;
    this.stepCompletions.set(step, true);
    
    analytics.track({
      formId: this.formId,
      eventType: 'step_complete',
      timestamp: Date.now(),
      sessionId: getSessionId(),
      step,
      stepName: stepName || this.stepNames[step - 1] || `Step ${step}`,
      timeSpent,
      conversionRate: this.calculateConversionRate(),
    } as StepEvent);
  }

  trackFieldError(field: string, error: string, step: number): void {
    analytics.track({
      formId: this.formId,
      eventType: 'field_error',
      timestamp: Date.now(),
      sessionId: getSessionId(),
      field,
      error,
      step,
    } as ErrorEvent);
  }

  trackAbandonment(lastField: string): void {
    const timeOnForm = Date.now() - this.startTime;
    
    analytics.track({
      formId: this.formId,
      eventType: 'abandoned',
      timestamp: Date.now(),
      sessionId: getSessionId(),
      step: this.currentStep,
      lastField,
      timeOnForm,
    } as AbandonmentEvent);
  }

  trackConversion(): void {
    const totalTime = Date.now() - this.startTime;
    
    analytics.track({
      formId: this.formId,
      eventType: 'conversion',
      timestamp: Date.now(),
      sessionId: getSessionId(),
      metadata: {
        totalTime,
        stepsCompleted: this.stepCompletions.size,
      },
    });
  }

  private calculateConversionRate(): number {
    if (this.currentStep === 0) return 0;
    const completedSteps = Array.from(this.stepCompletions.values()).filter(Boolean).length;
    return Math.round((completedSteps / this.currentStep) * 100);
  }

  getCurrentStep(): number {
    return this.currentStep;
  }

  getTimeOnForm(): number {
    return Date.now() - this.startTime;
  }
}

// ============================================
// HEATMAP DATA COLLECTION
// ============================================

export class HeatmapCollector {
  private clicks: HeatmapData[] = [];
  private intervalId: NodeJS.Timeout | null = null;
  private flushInterval: number = 10000; // 10 seconds
  private isActive: boolean = false;

  start(): () => void {
    if (typeof window === 'undefined' || this.isActive) return () => {};
    
    this.isActive = true;
    
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Skip clicks on the analytics dashboard itself
      if (target.closest('[data-analytics-dashboard]')) return;
      
      this.clicks.push({
        x: e.clientX,
        y: e.clientY,
        element: target.tagName.toLowerCase(),
        timestamp: Date.now(),
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
      });
    };

    window.addEventListener('click', handleClick, { passive: true });
    
    // Flush periodically
    this.intervalId = setInterval(() => {
      this.flush();
    }, this.flushInterval);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('click', handleClick);
      if (this.intervalId) clearInterval(this.intervalId);
    };
  }

  private async flush(): Promise<void> {
    if (this.clicks.length === 0) return;
    
    const batch = [...this.clicks];
    this.clicks = [];
    
    try {
      await fetch('/api/analytics/heatmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          clicks: batch,
          sessionId: getSessionId(),
          url: window.location.pathname,
        }),
      });
    } catch (error) {
      // Re-add failed clicks
      this.clicks = [...batch.slice(-50), ...this.clicks].slice(0, 100);
    }
  }

  stop(): void {
    this.isActive = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  getClicks(): HeatmapData[] {
    return [...this.clicks];
  }
}

// ============================================
// A/B TESTING FRAMEWORK
// ============================================

export class ABTestFramework {
  private experimentId: string;
  private variant: 'A' | 'B' | null = null;
  private config: ABTestConfig;

  constructor(config: ABTestConfig) {
    this.config = {
      trafficSplit: 0.5,
      ...config,
    };
    this.experimentId = config.experimentId;
    this.assignVariant();
  }

  private assignVariant(): void {
    if (typeof window === 'undefined') {
      this.variant = 'A';
      return;
    }

    const storageKey = `exp:${this.experimentId}`;
    const assigned = localStorage.getItem(storageKey) as 'A' | 'B' | null;
    
    if (assigned) {
      this.variant = assigned;
    } else {
      const randomValue = Math.random();
      const newVariant = randomValue > (this.config.trafficSplit || 0.5) ? 'A' : 'B';
      localStorage.setItem(storageKey, newVariant);
      this.variant = newVariant;
      
      // Track assignment
      analytics.track({
        formId: this.experimentId,
        eventType: 'experiment_assigned',
        timestamp: Date.now(),
        sessionId: getSessionId(),
        experimentId: this.experimentId,
        variant: newVariant,
      } as ExperimentEvent);
    }
  }

  getVariant(): 'A' | 'B' {
    return this.variant || 'A';
  }

  getContent(): ABTestConfig['variantA'] | ABTestConfig['variantB'] {
    return this.variant === 'A' ? this.config.variantA : this.config.variantB;
  }

  trackConversion(metadata?: Record<string, unknown>): void {
    if (!this.variant) return;
    
    analytics.track({
      formId: this.experimentId,
      eventType: 'conversion',
      timestamp: Date.now(),
      sessionId: getSessionId(),
      metadata: {
        experimentId: this.experimentId,
        variant: this.variant,
        ...metadata,
      },
    });
  }

  trackEvent(eventName: string, metadata?: Record<string, unknown>): void {
    if (!this.variant) return;
    
    analytics.track({
      formId: this.experimentId,
      eventType: 'experiment_assigned',
      timestamp: Date.now(),
      sessionId: getSessionId(),
      metadata: {
        experimentId: this.experimentId,
        variant: this.variant,
        eventName,
        ...metadata,
      },
    });
  }

  // Force variant (useful for testing)
  forceVariant(variant: 'A' | 'B'): void {
    this.variant = variant;
    localStorage.setItem(`exp:${this.experimentId}`, variant);
  }
}

// ============================================
// SESSION RECORDING (LogRocket Integration)
// ============================================

export interface SessionRecordingConfig {
  logRocketId?: string;
  fullStoryId?: string;
  sentryDsn?: string;
  userId?: string;
  userEmail?: string;
  userTraits?: Record<string, unknown>;
}

export const initSessionRecording = async (config: SessionRecordingConfig): Promise<void> => {
  if (typeof window === 'undefined') return;

  // LogRocket
  if (config.logRocketId) {
    try {
      const LogRocket = (await import('logrocket')).default;
      LogRocket.init(config.logRocketId);
      
      if (config.userId) {
        LogRocket.identify(config.userId, {
          ...(config.userEmail ? { email: config.userEmail } : {}),
          ...config.userTraits,
        });
      }
    } catch (error) {
      console.warn('Failed to initialize LogRocket:', error);
    }
  }

  // FullStory (alternative)
  if (config.fullStoryId) {
    try {
      // FullStory init script
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://edge.fullstory.com/s/fs.js`;
      script.setAttribute('data-org', config.fullStoryId);
      document.head.appendChild(script);
    } catch (error) {
      console.warn('Failed to initialize FullStory:', error);
    }
  }
};

// ============================================
// REAL-TIME METRICS FETCHER
// ============================================

export class RealtimeMetricsFetcher {
  private ws: WebSocket | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private listeners: Set<(metrics: AnalyticsMetrics) => void> = new Set();
  private formId: string;

  constructor(formId: string) {
    this.formId = formId;
  }

  connect(): void {
    // Try WebSocket first
    if (typeof WebSocket !== 'undefined') {
      try {
        this.ws = new WebSocket(`wss://api.mechmind.com/analytics?formId=${this.formId}`);
        
        this.ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          this.notifyListeners(data);
        };

        this.ws.onclose = () => {
          // Fallback to polling
          this.startPolling();
        };

        this.ws.onerror = () => {
          this.ws?.close();
        };
      } catch {
        this.startPolling();
      }
    } else {
      this.startPolling();
    }
  }

  private startPolling(): void {
    this.pollingInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/analytics/metrics?formId=${this.formId}`);
        const data = await response.json();
        this.notifyListeners(data);
      } catch (error) {
        console.warn('Failed to fetch metrics:', error);
      }
    }, 5000);
  }

  private notifyListeners(metrics: AnalyticsMetrics): void {
    this.listeners.forEach(listener => listener(metrics));
  }

  subscribe(callback: (metrics: AnalyticsMetrics) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  disconnect(): void {
    this.ws?.close();
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
  }
}

// ============================================
// PERFORMANCE MONITORING
// ============================================

export interface FormPerformanceMetrics {
  loadTime: number;
  firstInteractionTime: number | null;
  totalInteractions: number;
  validationErrors: number;
  apiCalls: number;
  apiLatency: number[];
}

export class PerformanceMonitor {
  private metrics: FormPerformanceMetrics = {
    loadTime: 0,
    firstInteractionTime: null,
    totalInteractions: 0,
    validationErrors: 0,
    apiCalls: 0,
    apiLatency: [],
  };
  private loadStartTime: number;

  constructor() {
    this.loadStartTime = performance.now();
    this.recordLoadTime();
  }

  private recordLoadTime(): void {
    window.addEventListener('load', () => {
      this.metrics.loadTime = performance.now() - this.loadStartTime;
    });
  }

  recordInteraction(): void {
    this.metrics.totalInteractions++;
    if (this.metrics.firstInteractionTime === null) {
      this.metrics.firstInteractionTime = performance.now() - this.loadStartTime;
    }
  }

  recordValidationError(): void {
    this.metrics.validationErrors++;
  }

  async measureApiCall<T>(fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    this.metrics.apiCalls++;
    
    try {
      const result = await fn();
      this.metrics.apiLatency.push(performance.now() - start);
      return result;
    } catch (error) {
      this.metrics.apiLatency.push(performance.now() - start);
      throw error;
    }
  }

  getMetrics(): FormPerformanceMetrics {
    return { ...this.metrics };
  }

  report(): void {
    const avgLatency = this.metrics.apiLatency.length > 0
      ? this.metrics.apiLatency.reduce((a, b) => a + b, 0) / this.metrics.apiLatency.length
      : 0;

    analytics.track({
      formId: 'performance',
      eventType: 'conversion',
      timestamp: Date.now(),
      sessionId: getSessionId(),
      metadata: {
        ...this.metrics,
        avgApiLatency: avgLatency,
      },
    });
  }
}
