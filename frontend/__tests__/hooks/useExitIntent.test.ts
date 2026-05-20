/**
 * Tests for useExitIntent hook (hooks/form-persistence/useExitIntent.ts)
 * Tests: initial state, activate/deactivate, manual trigger, reset, callbacks, maxTriggers.
 */

import { renderHook, act } from '@testing-library/react';
import { useExitIntent } from '@/hooks/form-persistence/useExitIntent';

// =============================================================================
// Tests
// =============================================================================
describe('useExitIntent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useExitIntent());

    expect(result.current.isTriggered).toBe(false);
    expect(result.current.triggerCount).toBe(0);
    expect(result.current.isActive).toBe(false); // active only after activationDelay
    expect(typeof result.current.trigger).toBe('function');
    expect(typeof result.current.reset).toBe('function');
    expect(typeof result.current.activate).toBe('function');
    expect(typeof result.current.deactivate).toBe('function');
  });

  it('activate sets isActive to true', () => {
    const { result } = renderHook(() => useExitIntent());

    act(() => {
      result.current.activate();
    });

    expect(result.current.isActive).toBe(true);
  });

  it('deactivate sets isActive to false', () => {
    const { result } = renderHook(() => useExitIntent());

    act(() => {
      result.current.activate();
    });
    expect(result.current.isActive).toBe(true);

    act(() => {
      result.current.deactivate();
    });

    expect(result.current.isActive).toBe(false);
  });

  it('manual trigger fires after activation', () => {
    const { result } = renderHook(() => useExitIntent());

    act(() => {
      result.current.activate();
    });

    act(() => {
      result.current.trigger();
    });

    expect(result.current.isTriggered).toBe(true);
    expect(result.current.triggerCount).toBe(1);
  });

  it('trigger does nothing before activation', () => {
    const { result } = renderHook(() => useExitIntent());

    // Don't activate — trigger should be blocked
    act(() => {
      result.current.trigger();
    });

    expect(result.current.isTriggered).toBe(false);
    expect(result.current.triggerCount).toBe(0);
  });

  it('onExitIntent callback is called when triggered', () => {
    const onExitIntent = jest.fn();
    const { result } = renderHook(() => useExitIntent({ onExitIntent }));

    act(() => {
      result.current.activate();
      result.current.trigger();
    });

    expect(onExitIntent).toHaveBeenCalledTimes(1);
    expect(result.current.isTriggered).toBe(true);
  });

  it('reset clears triggered state and counter', () => {
    const { result } = renderHook(() => useExitIntent());

    act(() => {
      result.current.activate();
      result.current.trigger();
    });

    expect(result.current.isTriggered).toBe(true);
    expect(result.current.triggerCount).toBe(1);

    act(() => {
      result.current.reset();
    });

    expect(result.current.isTriggered).toBe(false);
    expect(result.current.triggerCount).toBe(0);
  });

  it('maxTriggers limits number of triggers', () => {
    const onExitIntent = jest.fn();
    const { result } = renderHook(() =>
      useExitIntent({ maxTriggers: 1, cooldown: 0, onExitIntent })
    );

    act(() => {
      result.current.activate();
    });

    // First trigger — allowed
    act(() => {
      result.current.trigger();
    });
    expect(onExitIntent).toHaveBeenCalledTimes(1);

    // Second trigger — blocked by maxTriggers
    act(() => {
      result.current.trigger();
    });
    expect(onExitIntent).toHaveBeenCalledTimes(1);
  });

  it('activates automatically after activationDelay', () => {
    const { result } = renderHook(() => useExitIntent({ activationDelay: 2000 }));

    expect(result.current.isActive).toBe(false);

    act(() => {
      jest.advanceTimersByTime(2100);
    });

    expect(result.current.isActive).toBe(true);
  });

  it('trigger fires onExitIntent only when active', () => {
    const onExitIntent = jest.fn();
    const { result } = renderHook(() => useExitIntent({ onExitIntent, activationDelay: 3000 }));

    // Not yet active
    act(() => {
      result.current.trigger();
    });
    expect(onExitIntent).not.toHaveBeenCalled();

    // Activate via timer
    act(() => {
      jest.advanceTimersByTime(3100);
    });

    // Now trigger works
    act(() => {
      result.current.trigger();
    });
    expect(onExitIntent).toHaveBeenCalledTimes(1);
  });
});
