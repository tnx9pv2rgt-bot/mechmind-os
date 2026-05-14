/**
 * Tests for useBehavioralTracking hook (hooks/useBehavioralTracking.ts)
 * Tests: field tracking, mouse tracking, scroll tracking, abandonment detection, frustration detection.
 */

import { renderHook, act } from '@testing-library/react';
import { useBehavioralTracking } from '@/hooks/useBehavioralTracking';

// =============================================================================
// Mocks
// =============================================================================
jest.mock('@/lib/analytics/behavioral', () => ({
  behavioralTracker: {
    trackMouseMove: jest.fn(),
    trackClick: jest.fn(),
    trackFieldFocus: jest.fn(),
    trackFieldFirstInput: jest.fn(),
    trackFieldChange: jest.fn(),
    trackFieldBlur: jest.fn(),
    trackScroll: jest.fn(),
    getAbandonmentRisk: jest.fn(() => 'low'),
    getAbandonmentScore: jest.fn(() => 0),
    exportMetrics: jest.fn(() => ({})),
    getSummary: jest.fn(() => ({
      rageClicks: 0,
      fieldsWithHighHesitation: [],
      fieldsWithCorrections: {},
    })),
    setCurrentStep: jest.fn(),
    startBatchSending: jest.fn(),
    stopBatchSending: jest.fn(),
    reset: jest.fn(),
  },
}));

const mockTracker = require('@/lib/analytics/behavioral').behavioralTracker;

// =============================================================================
// Tests
// =============================================================================
describe('useBehavioralTracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('initializes with all expected methods', () => {
    const { result } = renderHook(() => useBehavioralTracking({ formId: 'test-form' }));

    expect(typeof result.current.trackClick).toBe('function');
    expect(typeof result.current.trackFieldFocus).toBe('function');
    expect(typeof result.current.trackFieldFirstInput).toBe('function');
    expect(typeof result.current.trackFieldChange).toBe('function');
    expect(typeof result.current.trackFieldBlur).toBe('function');
    expect(typeof result.current.trackScroll).toBe('function');
    expect(typeof result.current.getAbandonmentRisk).toBe('function');
    expect(typeof result.current.getAbandonmentScore).toBe('function');
    expect(typeof result.current.reset).toBe('function');
  });

  it('initializes with abandonment state', () => {
    mockTracker.getAbandonmentRisk.mockReturnValueOnce('low');
    mockTracker.getAbandonmentScore.mockReturnValueOnce(0);

    const { result } = renderHook(() => useBehavioralTracking({ formId: 'test-form' }));

    expect(result.current.abandonmentRisk).toBe('low');
    expect(result.current.abandonmentScore).toBe(0);
    expect(result.current.showAbandonmentModal).toBe(false);
  });

  it('starts batch sending on mount', () => {
    renderHook(() =>
      useBehavioralTracking({
        formId: 'test-form',
        endpoint: '/api/analytics/behavioral',
      })
    );

    expect(mockTracker.startBatchSending).toHaveBeenCalledWith(
      '/api/analytics/behavioral',
      'test-form'
    );
  });

  it('stops batch sending on unmount', () => {
    const { unmount } = renderHook(() => useBehavioralTracking({ formId: 'test-form' }));

    unmount();

    expect(mockTracker.stopBatchSending).toHaveBeenCalled();
  });

  it('trackClick delegates to tracker', () => {
    const { result } = renderHook(() => useBehavioralTracking({ formId: 'test-form' }));

    act(() => {
      result.current.trackClick('button-id');
    });

    expect(mockTracker.trackClick).toHaveBeenCalledWith('button-id', undefined);
  });

  it('trackFieldFocus delegates to tracker', () => {
    const { result } = renderHook(() => useBehavioralTracking({ formId: 'test-form' }));

    act(() => {
      result.current.trackFieldFocus('email');
    });

    expect(mockTracker.trackFieldFocus).toHaveBeenCalledWith('email');
  });

  it('trackFieldFirstInput delegates to tracker', () => {
    const { result } = renderHook(() => useBehavioralTracking({ formId: 'test-form' }));

    act(() => {
      result.current.trackFieldFirstInput('password');
    });

    expect(mockTracker.trackFieldFirstInput).toHaveBeenCalledWith('password');
  });

  it('trackFieldChange delegates to tracker with value', () => {
    const { result } = renderHook(() => useBehavioralTracking({ formId: 'test-form' }));

    act(() => {
      result.current.trackFieldChange('email', 'test@example.com');
    });

    expect(mockTracker.trackFieldChange).toHaveBeenCalledWith('email', 'test@example.com');
  });

  it('trackFieldBlur delegates to tracker', () => {
    const { result } = renderHook(() => useBehavioralTracking({ formId: 'test-form' }));

    act(() => {
      result.current.trackFieldBlur('email');
    });

    expect(mockTracker.trackFieldBlur).toHaveBeenCalledWith('email');
  });

  it('trackScroll delegates to tracker with depth percent', () => {
    const { result } = renderHook(() => useBehavioralTracking({ formId: 'test-form' }));

    act(() => {
      result.current.trackScroll(50);
    });

    expect(mockTracker.trackScroll).toHaveBeenCalledWith(50);
  });

  it('getAbandonmentRisk delegates to tracker', () => {
    mockTracker.getAbandonmentRisk.mockReturnValueOnce('high');

    const { result } = renderHook(() => useBehavioralTracking({ formId: 'test-form' }));

    const risk = result.current.getAbandonmentRisk();

    expect(risk).toBe('high');
    expect(mockTracker.getAbandonmentRisk).toHaveBeenCalled();
  });

  it('getAbandonmentScore delegates to tracker', () => {
    mockTracker.getAbandonmentScore.mockReturnValueOnce(75);

    const { result } = renderHook(() => useBehavioralTracking({ formId: 'test-form' }));

    const score = result.current.getAbandonmentScore();

    expect(score).toBe(75);
    expect(mockTracker.getAbandonmentScore).toHaveBeenCalled();
  });

  it('sets modal visibility when abandonment score reaches threshold', () => {
    mockTracker.getAbandonmentRisk.mockReturnValueOnce('high');
    mockTracker.getAbandonmentScore.mockReturnValueOnce(75);
    mockTracker.getSummary.mockReturnValueOnce({
      rageClicks: 0,
      fieldsWithHighHesitation: [],
      fieldsWithCorrections: {},
    });

    const { result } = renderHook(() =>
      useBehavioralTracking({
        formId: 'test-form',
        enableAbandonmentPrevention: true,
        abandonmentThreshold: 70,
      })
    );

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(result.current.showAbandonmentModal).toBe(true);
  });

  it('does not enable mouse tracking when trackMouse is false', () => {
    renderHook(() =>
      useBehavioralTracking({
        formId: 'test-form',
        trackMouse: false,
      })
    );

    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 100 }));
    });

    expect(mockTracker.trackMouseMove).not.toHaveBeenCalled();
  });

  it('enables mouse tracking when trackMouse is true', () => {
    renderHook(() =>
      useBehavioralTracking({
        formId: 'test-form',
        trackMouse: true,
      })
    );

    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 100 }));
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(mockTracker.trackMouseMove).toHaveBeenCalledWith(100, 100);
  });

  it('closeAbandonmentModal sets modal visibility to false', () => {
    const { result } = renderHook(() => useBehavioralTracking({ formId: 'test-form' }));

    act(() => {
      result.current.openAbandonmentModal();
    });

    expect(result.current.showAbandonmentModal).toBe(true);

    act(() => {
      result.current.closeAbandonmentModal();
    });

    expect(result.current.showAbandonmentModal).toBe(false);
  });

  it('reset clears all tracking data', () => {
    const { result } = renderHook(() => useBehavioralTracking({ formId: 'test-form' }));

    act(() => {
      result.current.reset();
    });

    expect(mockTracker.reset).toHaveBeenCalled();
    expect(result.current.abandonmentRisk).toBe('low');
    expect(result.current.abandonmentScore).toBe(0);
    expect(result.current.showAbandonmentModal).toBe(false);
  });

  it('exportMetrics delegates to tracker', () => {
    mockTracker.exportMetrics.mockReturnValueOnce({ clicks: 5 });

    const { result } = renderHook(() => useBehavioralTracking({ formId: 'test-form' }));

    const metrics = result.current.exportMetrics();

    expect(metrics).toEqual({ clicks: 5 });
    expect(mockTracker.exportMetrics).toHaveBeenCalled();
  });

  it('getSummary delegates to tracker', () => {
    mockTracker.getSummary.mockReturnValueOnce({
      rageClicks: 2,
      fieldsWithHighHesitation: ['email'],
      fieldsWithCorrections: { password: 3 },
    });

    const { result } = renderHook(() => useBehavioralTracking({ formId: 'test-form' }));

    const summary = result.current.getSummary();

    expect(summary.rageClicks).toBe(2);
    expect(mockTracker.getSummary).toHaveBeenCalled();
  });

  it('detects rage clicks when summary indicates them', () => {
    mockTracker.getSummary.mockReturnValueOnce({
      rageClicks: 1,
      fieldsWithHighHesitation: [],
      fieldsWithCorrections: {},
    });

    const onFrustrationDetected = jest.fn();

    renderHook(() =>
      useBehavioralTracking({
        formId: 'test-form',
        enableAbandonmentPrevention: true,
        onFrustrationDetected,
      })
    );

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(onFrustrationDetected).toHaveBeenCalledWith('rage_click');
  });

  it('calls onHighAbandonmentRisk callback when threshold exceeded', () => {
    mockTracker.getAbandonmentRisk.mockReturnValueOnce('high');
    mockTracker.getAbandonmentScore.mockReturnValueOnce(75);
    mockTracker.getSummary.mockReturnValueOnce({
      rageClicks: 0,
      fieldsWithHighHesitation: [],
      fieldsWithCorrections: {},
    });

    const onHighAbandonmentRisk = jest.fn();

    renderHook(() =>
      useBehavioralTracking({
        formId: 'test-form',
        enableAbandonmentPrevention: true,
        abandonmentThreshold: 70,
        onHighAbandonmentRisk,
      })
    );

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(onHighAbandonmentRisk).toHaveBeenCalledWith(75);
  });
});
