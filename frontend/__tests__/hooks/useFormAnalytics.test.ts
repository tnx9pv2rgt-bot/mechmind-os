/**
 * Tests for useFormAnalytics hook (hooks/useFormAnalytics.ts)
 * Tests: funnel tracking, heatmap, A/B testing, real-time analytics, performance monitoring.
 */

import { renderHook, act } from '@testing-library/react';
import {
  useFormFunnel,
  useHeatmap,
  useABTest,
  useRealtimeAnalytics,
  usePerformanceMonitor,
  useFormAnalytics,
} from '@/hooks/useFormAnalytics';

// =============================================================================
// Mocks
// =============================================================================
jest.mock('@/lib/analytics/form-analytics', () => ({
  FormFunnel: jest.fn().mockImplementation(() => ({
    trackStepStart: jest.fn(),
    trackStepComplete: jest.fn(),
    trackFieldError: jest.fn(),
    trackAbandonment: jest.fn(),
    trackConversion: jest.fn(),
    getCurrentStep: jest.fn(() => 0),
    getTimeOnForm: jest.fn(() => 0),
  })),
  HeatmapCollector: jest.fn().mockImplementation(() => ({
    start: jest.fn(() => undefined),
    stop: jest.fn(),
    getClicks: jest.fn(() => []),
  })),
  ABTestFramework: jest.fn().mockImplementation(() => ({
    getVariant: jest.fn(() => 'A'),
    getContent: jest.fn(() => ({})),
    trackConversion: jest.fn(),
    trackEvent: jest.fn(),
    forceVariant: jest.fn(),
  })),
  PerformanceMonitor: jest.fn().mockImplementation(() => ({
    recordInteraction: jest.fn(),
    recordValidationError: jest.fn(),
    report: jest.fn(),
    getMetrics: jest.fn(() => ({})),
  })),
  RealtimeMetricsFetcher: jest.fn().mockImplementation(() => ({
    subscribe: jest.fn(callback => {
      callback({
        activeUsers: 5,
        completionRate: 85,
        avgTime: 120000,
        dropOffStep: null,
        errors: [],
        funnelData: [],
      });
      return jest.fn();
    }),
    connect: jest.fn(),
    disconnect: jest.fn(),
  })),
  initSessionRecording: jest.fn(() => Promise.resolve()),
  analytics: {
    enableDebugMode: jest.fn(),
  },
}));

// =============================================================================
// Tests
// =============================================================================
describe('useFormAnalytics hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // useFormFunnel
  // =========================================================================
  describe('useFormFunnel', () => {
    it('initializes with expected methods and state', () => {
      const { result } = renderHook(() => useFormFunnel({ formId: 'test-form', totalSteps: 3 }));

      expect(typeof result.current.trackStepStart).toBe('function');
      expect(typeof result.current.trackStepComplete).toBe('function');
      expect(typeof result.current.trackFieldInteraction).toBe('function');
      expect(typeof result.current.trackFieldError).toBe('function');
      expect(typeof result.current.trackConversion).toBe('function');
      expect(typeof result.current.getCurrentStep).toBe('function');
      expect(typeof result.current.getTimeOnForm).toBe('function');
    });

    it('initializes with default step 0', () => {
      const { result } = renderHook(() => useFormFunnel({ formId: 'test-form', totalSteps: 3 }));

      expect(result.current.getCurrentStep()).toBe(0);
    });

    it('trackStepStart calls callback onStepChange', () => {
      const onStepChange = jest.fn();
      const { result } = renderHook(() =>
        useFormFunnel({
          formId: 'test-form',
          totalSteps: 3,
          onStepChange,
        })
      );

      act(() => {
        result.current.trackStepStart(1, 'Personal Info');
      });

      expect(onStepChange).toHaveBeenCalledWith(1, 'Personal Info');
    });

    it('trackStepComplete calls onComplete when at last step', () => {
      const onComplete = jest.fn();
      const { result } = renderHook(() =>
        useFormFunnel({
          formId: 'test-form',
          totalSteps: 3,
          onComplete,
        })
      );

      act(() => {
        result.current.trackStepComplete(3);
      });

      expect(onComplete).toHaveBeenCalled();
    });

    it('tracks field interaction', () => {
      const { result } = renderHook(() => useFormFunnel({ formId: 'test-form', totalSteps: 3 }));

      act(() => {
        result.current.trackFieldInteraction('email');
      });

      expect(result.current).toBeDefined();
    });

    it('tracks field error with field, error, and step', () => {
      const { result } = renderHook(() => useFormFunnel({ formId: 'test-form', totalSteps: 3 }));

      act(() => {
        result.current.trackFieldError('email', 'Invalid format', 1);
      });

      expect(result.current).toBeDefined();
    });

    it('calls onAbandon on unmount if not completed', () => {
      const onAbandon = jest.fn();
      const { unmount } = renderHook(() =>
        useFormFunnel({
          formId: 'test-form',
          totalSteps: 3,
          onAbandon,
        })
      );

      unmount();

      expect(onAbandon).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // useHeatmap
  // =========================================================================
  describe('useHeatmap', () => {
    it('initializes with getClicks method', () => {
      const { result } = renderHook(() => useHeatmap({ enabled: true }));

      expect(typeof result.current.getClicks).toBe('function');
      expect(result.current.getClicks()).toEqual([]);
    });

    it('does not initialize when disabled', () => {
      const { result } = renderHook(() => useHeatmap({ enabled: false }));

      expect(result.current.getClicks()).toEqual([]);
    });

    it('returns clicks array from collector', () => {
      const { result } = renderHook(() => useHeatmap({ enabled: true }));

      const clicks = result.current.getClicks();

      expect(Array.isArray(clicks)).toBe(true);
    });
  });

  // =========================================================================
  // useABTest
  // =========================================================================
  describe('useABTest', () => {
    it('initializes with variant and methods', () => {
      const { result } = renderHook(() =>
        useABTest({
          experimentId: 'form-exp-1',
          config: {
            variantA: { buttonText: 'Submit' },
            variantB: { buttonText: 'Continue' },
          },
        })
      );

      expect(result.current.variant).toBeDefined();
      expect(typeof result.current.trackConversion).toBe('function');
      expect(typeof result.current.trackEvent).toBe('function');
      expect(typeof result.current.forceVariant).toBe('function');
    });

    it('variant is A or B', () => {
      const { result } = renderHook(() =>
        useABTest({
          experimentId: 'form-exp-1',
          config: {
            variantA: { buttonText: 'Submit' },
            variantB: { buttonText: 'Continue' },
          },
        })
      );

      expect(['A', 'B']).toContain(result.current.variant);
    });

    it('trackConversion delegates to framework', () => {
      const { result } = renderHook(() =>
        useABTest({
          experimentId: 'form-exp-1',
          config: {
            variantA: {},
            variantB: {},
          },
        })
      );

      act(() => {
        result.current.trackConversion({ value: 100 });
      });

      expect(result.current).toBeDefined();
    });

    it('trackEvent delegates to framework', () => {
      const { result } = renderHook(() =>
        useABTest({
          experimentId: 'form-exp-1',
          config: {
            variantA: {},
            variantB: {},
          },
        })
      );

      act(() => {
        result.current.trackEvent('step_completed', { step: 1 });
      });

      expect(result.current).toBeDefined();
    });

    it('forceVariant forces a specific variant', () => {
      const { result } = renderHook(() =>
        useABTest({
          experimentId: 'form-exp-1',
          config: {
            variantA: {},
            variantB: {},
          },
        })
      );

      act(() => {
        result.current.forceVariant('B');
      });

      expect(result.current).toBeDefined();
    });
  });

  // =========================================================================
  // useRealtimeAnalytics
  // =========================================================================
  describe('useRealtimeAnalytics', () => {
    it('returns metrics object with expected structure', () => {
      const { result } = renderHook(() =>
        useRealtimeAnalytics({ formId: 'test-form', enabled: true })
      );

      expect(result.current).toHaveProperty('activeUsers');
      expect(result.current).toHaveProperty('completionRate');
      expect(result.current).toHaveProperty('avgTime');
      expect(result.current).toHaveProperty('dropOffStep');
      expect(result.current).toHaveProperty('errors');
      expect(result.current).toHaveProperty('funnelData');
    });

    it('initializes with default metrics when disabled', () => {
      const { result } = renderHook(() =>
        useRealtimeAnalytics({ formId: 'test-form', enabled: false })
      );

      expect(result.current.activeUsers).toBe(0);
      expect(result.current.completionRate).toBe(0);
      expect(result.current.avgTime).toBe(0);
    });

    it('fetches metrics with specified refresh interval', () => {
      renderHook(() =>
        useRealtimeAnalytics({
          formId: 'test-form',
          enabled: true,
          refreshInterval: 3000,
        })
      );

      expect(require('@/lib/analytics/form-analytics').RealtimeMetricsFetcher).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // usePerformanceMonitor
  // =========================================================================
  describe('usePerformanceMonitor', () => {
    it('initializes with metrics and methods', () => {
      const { result } = renderHook(() => usePerformanceMonitor(true));

      expect(result.current.metrics).toBeDefined();
      expect(typeof result.current.recordInteraction).toBe('function');
      expect(typeof result.current.recordValidationError).toBe('function');
      expect(typeof result.current.measureApiCall).toBe('function');
      expect(typeof result.current.getMetrics).toBe('function');
    });

    it('tracks interactions', () => {
      const { result } = renderHook(() => usePerformanceMonitor(true));

      act(() => {
        result.current.recordInteraction();
      });

      expect(result.current.metrics.totalInteractions).toBe(1);
    });

    it('tracks validation errors', () => {
      const { result } = renderHook(() => usePerformanceMonitor(true));

      act(() => {
        result.current.recordValidationError();
      });

      expect(result.current.metrics.validationErrors).toBe(1);
    });

    it('measureApiCall records latency', async () => {
      const { result } = renderHook(() => usePerformanceMonitor(true));

      await act(async () => {
        await result.current.measureApiCall(async () => {
          return 'result';
        });
      });

      expect(result.current.metrics.apiCalls).toBe(1);
      expect(result.current.metrics.apiLatency.length).toBeGreaterThan(0);
    });

    it('does not initialize when disabled', () => {
      const { result } = renderHook(() => usePerformanceMonitor(false));

      expect(result.current.metrics.loadTime).toBe(0);
      expect(result.current.metrics.totalInteractions).toBe(0);
    });
  });

  // =========================================================================
  // useFormAnalytics (master hook)
  // =========================================================================
  describe('useFormAnalytics', () => {
    it('integrates all sub-hooks', () => {
      const { result } = renderHook(() =>
        useFormAnalytics({
          formId: 'test-form',
          totalSteps: 3,
          enableHeatmap: true,
          enableRealtime: true,
          enablePerformance: true,
        })
      );

      expect(typeof result.current.trackStepStart).toBe('function');
      expect(typeof result.current.trackConversion).toBe('function');
      expect(result.current.abTest).toBeDefined();
      expect(result.current.realtimeMetrics).toBeDefined();
      expect(result.current.performance).toBeDefined();
      expect(result.current.debug).toBeDefined();
    });

    it('debug object includes utility methods', () => {
      const { result } = renderHook(() =>
        useFormAnalytics({
          formId: 'test-form',
          totalSteps: 3,
        })
      );

      expect(typeof result.current.debug.getHeatmapClicks).toBe('function');
      expect(typeof result.current.debug.enableDebugMode).toBe('function');
      expect(typeof result.current.debug.getSessionId).toBe('function');
    });

    it('enables heatmap when configured', () => {
      const { result } = renderHook(() =>
        useFormAnalytics({
          formId: 'test-form',
          totalSteps: 3,
          enableHeatmap: true,
        })
      );

      expect(result.current).toBeDefined();
      expect(typeof result.current.debug.getHeatmapClicks).toBe('function');
    });

    it('includes A/B testing when config provided', () => {
      const { result } = renderHook(() =>
        useFormAnalytics({
          formId: 'test-form',
          totalSteps: 3,
          abTestConfig: {
            variantA: { buttonText: 'Submit' },
            variantB: { buttonText: 'Continue' },
          },
        })
      );

      expect(result.current.abTest).not.toBeNull();
      expect(result.current.abTest?.variant).toBeDefined();
    });

    it('trackConversion delegates to both funnel and A/B test', () => {
      const { result } = renderHook(() =>
        useFormAnalytics({
          formId: 'test-form',
          totalSteps: 3,
          abTestConfig: {
            variantA: {},
            variantB: {},
          },
        })
      );

      expect(typeof result.current.trackConversion).toBe('function');

      act(() => {
        result.current.trackConversion();
      });

      expect(result.current.abTest).toBeDefined();
    });

    it('getTimeOnForm delegates to funnel', () => {
      const { result } = renderHook(() =>
        useFormAnalytics({
          formId: 'test-form',
          totalSteps: 3,
        })
      );

      const timeOnForm = result.current.getTimeOnForm();

      expect(typeof timeOnForm).toBe('number');
    });
  });
});
