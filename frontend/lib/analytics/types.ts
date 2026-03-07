/**
 * Analytics Types
 * 
 * Tipi TypeScript globali per il modulo analytics
 */

// Estensioni window per provider esterni
declare global {
  interface Window {
    // Segment Analytics
    analytics?: {
      identify: (userId: string, traits?: Record<string, unknown>) => void;
      track: (event: string, properties?: Record<string, unknown>) => void;
      page: (name?: string, properties?: Record<string, unknown>) => void;
      group: (groupId: string, traits?: Record<string, unknown>) => void;
      reset: () => void;
      ready: (callback: () => void) => void;
      initialized?: boolean;
      invoked?: boolean;
      methods?: string[];
      push?: (args: unknown[]) => void;
      factory?: (method: string) => (...args: unknown[]) => void;
      load?: (key: string, options?: Record<string, unknown>) => void;
      _writeKey?: string;
      SNIPPET_VERSION?: string;
    };

    // Mixpanel
    mixpanel?: {
      identify: (userId: string) => void;
      track: (event: string, properties?: Record<string, unknown>) => void;
      people: {
        set: (properties: Record<string, unknown>) => void;
        set_once: (properties: Record<string, unknown>) => void;
        increment: (property: string, value?: number) => void;
        append: (property: string, value: unknown) => void;
        union: (property: string, values: unknown[]) => void;
      };
      reset: () => void;
      set_group: (groupKey: string, groupId: string, traits?: Record<string, unknown>) => void;
      init: (token: string, config?: Record<string, unknown>) => void;
      __SV?: number;
      _i?: unknown[];
    };

    // LogRocket
    LogRocket?: {
      init: (appId: string, config?: Record<string, unknown>) => void;
      identify: (userId: string, traits?: Record<string, unknown>) => void;
      captureException: (error: Error, options?: Record<string, unknown>) => void;
      captureMessage: (message: string, options?: Record<string, unknown>) => void;
      log: (message: string, data?: unknown) => void;
      track: (event: string, properties?: Record<string, unknown>) => void;
      getSessionURL?: () => string;
    };

    // Sentry
    Sentry?: {
      init: (config: Record<string, unknown>) => void;
      captureException: (error: Error, scope?: unknown) => string;
      captureMessage: (message: string, level?: string, scope?: unknown) => string;
      setUser: (user: { id: string; email?: string }) => void;
      setContext: (name: string, context: Record<string, unknown>) => void;
      setTag: (key: string, value: string) => void;
      addBreadcrumb: (breadcrumb: Record<string, unknown>) => void;
      startTransaction: (context: Record<string, unknown>) => {
        finish: (status?: string) => void;
        setData: (key: string, value: unknown) => void;
        startTimestamp: number;
      };
      close: () => void;
      getCurrentHub: () => {
        configureScope: (callback: (scope: unknown) => void) => void;
      };
      Scope: new () => {
        setUser: (user: { id: string }) => void;
        setTags: (tags: Record<string, string>) => void;
        setExtras: (extras: Record<string, unknown>) => void;
      };
    };

    // Performance Observer
    PerformanceObserver?: {
      new (callback: (list: PerformanceObserverEntryList) => void): PerformanceObserver;
      supportedEntryTypes?: string[];
    };
  }
}

// Analytics Event Types
export interface AnalyticsEvent {
  event: string;
  properties?: Record<string, unknown>;
  timestamp: number;
  sessionId: string;
  userId?: string;
}

export interface FormAnalyticsEvent extends AnalyticsEvent {
  formId: string;
  step?: number;
  field?: string;
  error?: string;
}

// Funnel Types
export interface FunnelStep {
  id: number;
  name: string;
  title?: string;
  fields: string[];
}

export interface FunnelConfig {
  steps: FunnelStep[];
  trackOnComplete?: boolean;
  trackOnAbandon?: boolean;
  exitIntentThreshold?: number;
}

// Heatmap Types
export interface HeatmapConfig {
  trackClicks?: boolean;
  trackScroll?: boolean;
  trackMouseMove?: boolean;
  trackFocus?: boolean;
  sampleRate?: number;
  maxPoints?: number;
}

// A/B Test Types
export interface ABTestConfig {
  id: string;
  name: string;
  type: 'copy' | 'layout' | 'color' | 'cta' | 'steps';
  variants: Array<{
    id: string;
    name: string;
    weight: number;
    config: Record<string, unknown>;
  }>;
  trafficAllocation: number;
}

// Error Tracking Types
export interface ErrorContext {
  userId?: string;
  formId?: string;
  step?: number;
  field?: string;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 's' | 'bytes' | 'count';
  timestamp: number;
}

// Dashboard Types
export interface DashboardMetric {
  id: string;
  name: string;
  value: number | string;
  change?: number;
  changeType?: 'positive' | 'negative' | 'neutral';
  sparkline?: number[];
}

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'heatmap';
  title: string;
  data: unknown;
  config?: Record<string, unknown>;
}

// Esporta per essere usato come module augmentation
export {};
