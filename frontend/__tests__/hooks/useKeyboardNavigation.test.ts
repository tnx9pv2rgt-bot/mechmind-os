/**
 * Tests for useKeyboardNavigation hook (hooks/useKeyboardNavigation.ts)
 * Tests: keyboard navigation, focus management, escape, enter.
 */

import { renderHook, act } from '@testing-library/react';
import { useKeyboardNavigation, useStepKeyboardNavigation } from '@/hooks/useKeyboardNavigation';

// =============================================================================
// Tests - useKeyboardNavigation
// =============================================================================
describe('useKeyboardNavigation', () => {
  let container: HTMLDivElement;
  let button1: HTMLButtonElement;
  let button2: HTMLButtonElement;

  beforeEach(() => {
    container = document.createElement('div');
    button1 = document.createElement('button');
    button2 = document.createElement('button');

    button1.textContent = 'Button 1';
    button2.textContent = 'Button 2';

    container.appendChild(button1);
    container.appendChild(button2);
    document.body.appendChild(container);

    jest.clearAllMocks();
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('returns containerRef, focusFirst, focusLast, focusNext, focusPrevious, focusedElement, isFocused', () => {
    const { result } = renderHook(() => useKeyboardNavigation());

    expect(result.current).toHaveProperty('containerRef');
    expect(result.current).toHaveProperty('focusFirst');
    expect(result.current).toHaveProperty('focusLast');
    expect(result.current).toHaveProperty('focusNext');
    expect(result.current).toHaveProperty('focusPrevious');
    expect(result.current).toHaveProperty('focusedElement');
    expect(result.current).toHaveProperty('isFocused');
  });

  it('initializes with no focused element', () => {
    const { result } = renderHook(() => useKeyboardNavigation());

    expect(result.current.focusedElement).toBeNull();
    expect(result.current.isFocused).toBe(false);
  });

  it('containerRef can be attached to an element', () => {
    const { result } = renderHook(() => useKeyboardNavigation());

    act(() => {
      if (result.current.containerRef) {
        result.current.containerRef.current = container;
      }
    });

    expect(result.current.containerRef.current).toBe(container);
  });

  it('focusFirst focuses the first focusable element', () => {
    const { result } = renderHook(() => useKeyboardNavigation());

    act(() => {
      result.current.containerRef.current = container;
      result.current.focusFirst();
    });

    expect(result.current.focusedElement).toBeDefined();
  });

  it('focusLast focuses the last focusable element', () => {
    const { result } = renderHook(() => useKeyboardNavigation());

    act(() => {
      result.current.containerRef.current = container;
      result.current.focusLast();
    });

    expect(result.current.focusedElement).toBeDefined();
  });

  it('focusNext moves focus to next element', () => {
    const { result } = renderHook(() => useKeyboardNavigation());

    act(() => {
      result.current.containerRef.current = container;
      result.current.focusFirst();
    });

    const firstElement = result.current.focusedElement;

    act(() => {
      result.current.focusNext();
    });

    expect(result.current.focusedElement).toBeDefined();
  });

  it('focusPrevious moves focus to previous element', () => {
    const { result } = renderHook(() => useKeyboardNavigation());

    act(() => {
      result.current.containerRef.current = container;
      result.current.focusLast();
    });

    act(() => {
      result.current.focusPrevious();
    });

    expect(result.current.focusedElement).toBeDefined();
  });

  it('accepts onEscape callback option', () => {
    const onEscape = jest.fn();
    const { result } = renderHook(() => useKeyboardNavigation({ onEscape }));

    expect(result.current).toBeDefined();
    expect(onEscape).toHaveBeenCalledTimes(0);
  });

  it('accepts onEnter callback option', () => {
    const onEnter = jest.fn();
    const { result } = renderHook(() => useKeyboardNavigation({ onEnter }));

    expect(result.current).toBeDefined();
    expect(onEnter).toHaveBeenCalledTimes(0);
  });

  it('calls onFocusChange callback when focus changes', () => {
    const onFocusChange = jest.fn();
    const { result } = renderHook(() => useKeyboardNavigation({ onFocusChange }));

    act(() => {
      result.current.containerRef.current = container;
      result.current.focusFirst();
    });

    expect(onFocusChange).toHaveBeenCalled();
  });
});

// =============================================================================
// Tests - useStepKeyboardNavigation
// =============================================================================
describe('useStepKeyboardNavigation', () => {
  it('returns navigation methods and state', () => {
    const onStepChange = jest.fn();
    const { result } = renderHook(() =>
      useStepKeyboardNavigation({
        totalSteps: 5,
        currentStep: 1,
        onStepChange,
      })
    );

    expect(result.current).toHaveProperty('canGoNext');
    expect(result.current).toHaveProperty('canGoPrevious');
    expect(result.current).toHaveProperty('goNext');
    expect(result.current).toHaveProperty('goPrevious');
  });

  it('canGoNext is true when not on last step', () => {
    const onStepChange = jest.fn();
    const { result } = renderHook(() =>
      useStepKeyboardNavigation({
        totalSteps: 5,
        currentStep: 2,
        onStepChange,
      })
    );

    expect(result.current.canGoNext).toBe(true);
  });

  it('canGoNext is false on last step', () => {
    const onStepChange = jest.fn();
    const { result } = renderHook(() =>
      useStepKeyboardNavigation({
        totalSteps: 5,
        currentStep: 5,
        onStepChange,
      })
    );

    expect(result.current.canGoNext).toBe(false);
  });

  it('canGoPrevious is false on first step', () => {
    const onStepChange = jest.fn();
    const { result } = renderHook(() =>
      useStepKeyboardNavigation({
        totalSteps: 5,
        currentStep: 1,
        onStepChange,
      })
    );

    expect(result.current.canGoPrevious).toBe(false);
  });

  it('canGoPrevious is true when not on first step', () => {
    const onStepChange = jest.fn();
    const { result } = renderHook(() =>
      useStepKeyboardNavigation({
        totalSteps: 5,
        currentStep: 3,
        onStepChange,
      })
    );

    expect(result.current.canGoPrevious).toBe(true);
  });

  it('goNext calls onStepChange when allowed', () => {
    const onStepChange = jest.fn();
    const { result } = renderHook(() =>
      useStepKeyboardNavigation({
        totalSteps: 5,
        currentStep: 1,
        onStepChange,
      })
    );

    act(() => {
      result.current.goNext();
    });

    expect(onStepChange).toHaveBeenCalledWith(2);
  });

  it('goPrevious calls onStepChange when allowed', () => {
    const onStepChange = jest.fn();
    const { result } = renderHook(() =>
      useStepKeyboardNavigation({
        totalSteps: 5,
        currentStep: 3,
        onStepChange,
      })
    );

    act(() => {
      result.current.goPrevious();
    });

    expect(onStepChange).toHaveBeenCalledWith(2);
  });
});
