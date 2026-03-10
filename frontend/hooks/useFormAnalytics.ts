/**
 * useFormAnalytics Hook
 * Hook React completo per il tracciamento avanzato dei form
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import {
  FormFunnel,
  HeatmapCollector,
  ABTestFramework,
  PerformanceMonitor,
  RealtimeMetricsFetcher,
  initSessionRecording,
  analytics,
  type FormFunnelOptions,
  type ABTestConfig,
  type SessionRecordingConfig,
  type AnalyticsMetrics,
  type FormPerformanceMetrics,
} from '../lib/analytics/form-analytics';

// Re-export types for consumers
export type { AnalyticsMetrics, FormPerformanceMetrics } from '../lib/analytics/form-analytics';

// ============================================
// USE FORM FUNNEL
// ============================================

export interface UseFormFunnelOptions extends FormFunnelOptions {
  onStepChange?: (step: number, stepName?: string) => void;
  onComplete?: () => void;
  onAbandon?: (step: number, lastField: string) => void;
}

export const useFormFunnel = (options: UseFormFunnelOptions) => {
  const funnelRef = useRef<FormFunnel | null>(null);
  const lastFieldRef = useRef<string>('');
  const isCompleteRef = useRef(false);

  // Initialize funnel
  if (!funnelRef.current) {
    funnelRef.current = new FormFunnel(options);
  }

  const trackStepStart = useCallback((step: number, stepName?: string) => {
    funnelRef.current?.trackStepStart(step, stepName);
    options.onStepChange?.(step, stepName);
  }, [options.onStepChange]);

  const trackStepComplete = useCallback((step: number, stepName?: string) => {
    funnelRef.current?.trackStepComplete(step, stepName);
    
    if (step === options.totalSteps) {
      isCompleteRef.current = true;
      options.onComplete?.();
    }
  }, [options.totalSteps, options.onComplete]);

  const trackFieldInteraction = useCallback((fieldName: string) => {
    lastFieldRef.current = fieldName;
  }, []);

  const trackFieldError = useCallback((field: string, error: string, step: number) => {
    funnelRef.current?.trackFieldError(field, error, step);
  }, []);

  const trackConversion = useCallback(() => {
    funnelRef.current?.trackConversion();
    isCompleteRef.current = true;
  }, []);

  // Track abandonment on unmount if not completed
  useEffect(() => {
    return () => {
      if (!isCompleteRef.current && funnelRef.current) {
        funnelRef.current.trackAbandonment(lastFieldRef.current);
        options.onAbandon?.(
          funnelRef.current.getCurrentStep(),
          lastFieldRef.current
        );
      }
    };
  }, [options.onAbandon]);

  return {
    trackStepStart,
    trackStepComplete,
    trackFieldInteraction,
    trackFieldError,
    trackConversion,
    getCurrentStep: () => funnelRef.current?.getCurrentStep() || 0,
    getTimeOnForm: () => funnelRef.current?.getTimeOnForm() || 0,
  };
};

// ============================================
// USE HEATMAP
// ============================================

export interface UseHeatmapOptions {
  enabled?: boolean;
  formId?: string;
}

export const useHeatmap = (options: UseHeatmapOptions = {}) => {
  const { enabled = true, formId } = options;
  const collectorRef = useRef<HeatmapCollector | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    collectorRef.current = new HeatmapCollector();
    const cleanup = collectorRef.current.start();

    return () => {
      cleanup?.();
      collectorRef.current?.stop();
    };
  }, [enabled]);

  const getClicks = useCallback(() => {
    return collectorRef.current?.getClicks() || [];
  }, []);

  return { getClicks };
};

// ============================================
// USE A/B TEST
// ============================================

export interface UseABTestOptions {
  experimentId: string;
  config?: Omit<ABTestConfig, 'experimentId'>;
}

export interface UseABTestReturn {
  variant: 'A' | 'B';
  content: ABTestConfig['variantA'] | ABTestConfig['variantB'];
  trackConversion: (metadata?: Record<string, unknown>) => void;
  trackEvent: (eventName: string, metadata?: Record<string, unknown>) => void;
  forceVariant: (variant: 'A' | 'B') => void;
}

export const useABTest = (options: UseABTestOptions): UseABTestReturn => {
  const abTestRef = useRef<ABTestFramework | null>(null);
  const [, forceRender] = useState({});

  // Initialize A/B test
  if (!abTestRef.current) {
    abTestRef.current = new ABTestFramework({
      experimentId: options.experimentId,
      ...options.config,
    } as ABTestConfig);
  }

  const variant = abTestRef.current.getVariant();
  const content = abTestRef.current.getContent();

  const trackConversion = useCallback((metadata?: Record<string, unknown>) => {
    abTestRef.current?.trackConversion(metadata);
  }, []);

  const trackEvent = useCallback((eventName: string, metadata?: Record<string, unknown>) => {
    abTestRef.current?.trackEvent(eventName, metadata);
  }, []);

  const forceVariant = useCallback((newVariant: 'A' | 'B') => {
    abTestRef.current?.forceVariant(newVariant);
    forceRender({}); // Trigger re-render
  }, []);

  return {
    variant,
    content,
    trackConversion,
    trackEvent,
    forceVariant,
  };
};

// ============================================
// USE REAL-TIME ANALYTICS
// ============================================

export interface UseRealtimeAnalyticsOptions {
  formId: string;
  enabled?: boolean;
  refreshInterval?: number;
}

export const useRealtimeAnalytics = (options: UseRealtimeAnalyticsOptions) => {
  const { formId, enabled = true, refreshInterval = 5000 } = options;
  const [metrics, setMetrics] = useState<AnalyticsMetrics>({
    activeUsers: 0,
    completionRate: 0,
    avgTime: 0,
    dropOffStep: null,
    errors: [],
    funnelData: [],
  });
  const fetcherRef = useRef<RealtimeMetricsFetcher | null>(null);

  useEffect(() => {
    if (!enabled) return;

    fetcherRef.current = new RealtimeMetricsFetcher(formId);
    
    const unsubscribe = fetcherRef.current.subscribe((newMetrics) => {
      setMetrics(newMetrics);
    });

    fetcherRef.current.connect();

    return () => {
      unsubscribe();
      fetcherRef.current?.disconnect();
    };
  }, [formId, enabled, refreshInterval]);

  return metrics;
};

// ============================================
// USE PERFORMANCE MONITOR
// ============================================

export const usePerformanceMonitor = (enabled: boolean = true) => {
  const monitorRef = useRef<PerformanceMonitor | null>(null);
  const [metrics, setMetrics] = useState<FormPerformanceMetrics>({
    loadTime: 0,
    firstInteractionTime: null,
    totalInteractions: 0,
    validationErrors: 0,
    apiCalls: 0,
    apiLatency: [],
  });

  useEffect(() => {
    if (!enabled) return;

    monitorRef.current = new PerformanceMonitor();

    return () => {
      monitorRef.current?.report();
    };
  }, [enabled]);

  const recordInteraction = useCallback(() => {
    monitorRef.current?.recordInteraction();
    setMetrics(prev => ({
      ...prev,
      totalInteractions: prev.totalInteractions + 1,
    }));
  }, []);

  const recordValidationError = useCallback(() => {
    monitorRef.current?.recordValidationError();
    setMetrics(prev => ({
      ...prev,
      validationErrors: prev.validationErrors + 1,
    }));
  }, []);

  const measureApiCall = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    const start = performance.now();
    
    try {
      const result = await fn();
      const latency = performance.now() - start;
      
      setMetrics(prev => ({
        ...prev,
        apiCalls: prev.apiCalls + 1,
        apiLatency: [...prev.apiLatency, latency].slice(-10), // Keep last 10
      }));
      
      return result;
    } catch (error) {
      const latency = performance.now() - start;
      
      setMetrics(prev => ({
        ...prev,
        apiCalls: prev.apiCalls + 1,
        apiLatency: [...prev.apiLatency, latency].slice(-10),
      }));
      
      throw error;
    }
  }, []);

  const getMetrics = useCallback(() => {
    return monitorRef.current?.getMetrics() || metrics;
  }, [metrics]);

  return {
    metrics,
    recordInteraction,
    recordValidationError,
    measureApiCall,
    getMetrics,
  };
};

// ============================================
// USE SESSION RECORDING
// ============================================

export const useSessionRecording = (config: SessionRecordingConfig) => {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    initSessionRecording(config).then(() => {
      setIsInitialized(true);
    });
  }, [config.logRocketId, config.fullStoryId, config.userId]);

  return { isInitialized };
};

// ============================================
// USE FORM ANALYTICS (MASTER HOOK)
// ============================================

export interface UseFormAnalyticsOptions {
  formId: string;
  totalSteps: number;
  stepNames?: string[];
  enableHeatmap?: boolean;
  enableRealtime?: boolean;
  enablePerformance?: boolean;
  abTestConfig?: Omit<ABTestConfig, 'experimentId'>;
  sessionRecording?: SessionRecordingConfig;
  onStepChange?: (step: number, stepName?: string) => void;
  onComplete?: () => void;
  onAbandon?: (step: number, lastField: string) => void;
}

export interface UseFormAnalyticsReturn {
  // Funnel tracking
  trackStepStart: (step: number, stepName?: string) => void;
  trackStepComplete: (step: number, stepName?: string) => void;
  trackFieldInteraction: (fieldName: string) => void;
  trackFieldError: (field: string, error: string, step: number) => void;
  trackConversion: () => void;
  getCurrentStep: () => number;
  getTimeOnForm: () => number;

  // A/B Testing
  abTest: UseABTestReturn | null;

  // Real-time metrics
  realtimeMetrics: AnalyticsMetrics;

  // Performance
  performance: ReturnType<typeof usePerformanceMonitor>;

  // Debug
  debug: {
    getHeatmapClicks: () => Array<{ x: number; y: number; element: string; timestamp: number }>;
    enableDebugMode: () => void;
    getSessionId: () => string;
  };
}

export const useFormAnalytics = (options: UseFormAnalyticsOptions): UseFormAnalyticsReturn => {
  const {
    formId,
    totalSteps,
    stepNames,
    enableHeatmap = true,
    enableRealtime = true,
    enablePerformance = true,
    abTestConfig,
    sessionRecording,
    onStepChange,
    onComplete,
    onAbandon,
  } = options;

  // Initialize all sub-hooks
  const funnel = useFormFunnel({
    formId,
    totalSteps,
    stepNames,
    onStepChange,
    onComplete,
    onAbandon,
  });

  const heatmap = useHeatmap({
    enabled: enableHeatmap,
    formId,
  });

  const abTest = abTestConfig
    ? useABTest({ experimentId: formId, config: abTestConfig })
    : null;

  const realtimeMetrics = useRealtimeAnalytics({
    formId,
    enabled: enableRealtime,
  });

  const performance = usePerformanceMonitor(enablePerformance);

  // Session recording
  useSessionRecording(sessionRecording || {});

  // Debug utilities
  const debug = {
    getHeatmapClicks: heatmap.getClicks,
    enableDebugMode: () => analytics.enableDebugMode(),
    getSessionId: () => {
      if (typeof window === 'undefined') return '';
      return sessionStorage.getItem('form_analytics_session_id') || '';
    },
  };

  return {
    // Funnel tracking methods
    trackStepStart: funnel.trackStepStart,
    trackStepComplete: funnel.trackStepComplete,
    trackFieldInteraction: funnel.trackFieldInteraction,
    trackFieldError: funnel.trackFieldError,
    trackConversion: () => {
      funnel.trackConversion();
      abTest?.trackConversion();
    },
    getCurrentStep: funnel.getCurrentStep,
    getTimeOnForm: funnel.getTimeOnForm,

    // A/B Testing
    abTest,

    // Real-time metrics
    realtimeMetrics,

    // Performance
    performance,

    // Debug
    debug,
  };
};

export default useFormAnalytics;
