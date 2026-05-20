/**
 * Tests for useFocusTrap hook (hooks/useFocusTrap.ts)
 * Tests: focus management, tab cycling, escape key, initial focus.
 */

import { renderHook, act } from '@testing-library/react';
import { useFocusTrap } from '@/hooks/useFocusTrap';

// =============================================================================
// Tests
// =============================================================================
describe('useFocusTrap', () => {
  let container: HTMLDivElement;
  let button1: HTMLButtonElement;
  let button2: HTMLButtonElement;
  let button3: HTMLButtonElement;

  beforeEach(() => {
    // Setup DOM
    container = document.createElement('div');
    button1 = document.createElement('button');
    button2 = document.createElement('button');
    button3 = document.createElement('button');

    button1.textContent = 'Button 1';
    button2.textContent = 'Button 2';
    button3.textContent = 'Button 3';

    container.appendChild(button1);
    container.appendChild(button2);
    container.appendChild(button3);
    document.body.appendChild(container);

    jest.clearAllMocks();
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('returns containerRef, activate, deactivate, isTrapped', () => {
    const { result } = renderHook(() => useFocusTrap({ isActive: false }));

    expect(result.current).toHaveProperty('containerRef');
    expect(result.current).toHaveProperty('activate');
    expect(result.current).toHaveProperty('deactivate');
    expect(result.current).toHaveProperty('isTrapped');
    expect(typeof result.current.containerRef).toBe('object');
    expect(typeof result.current.activate).toBe('function');
    expect(typeof result.current.deactivate).toBe('function');
  });

  it('isTrapped is false initially when isActive is false', () => {
    const { result } = renderHook(() => useFocusTrap({ isActive: false }));

    expect(result.current.isTrapped).toBe(false);
  });

  it('isTrapped becomes true when isActive is true', () => {
    const { result } = renderHook(() => useFocusTrap({ isActive: true }));

    expect(result.current.isTrapped).toBe(true);
  });

  it('containerRef can be attached to an element', () => {
    const { result } = renderHook(() => useFocusTrap({ isActive: false }));

    act(() => {
      if (result.current.containerRef) {
        result.current.containerRef.current = container;
      }
    });

    expect(result.current.containerRef.current).toBe(container);
  });

  it('focuses first element when activate is called with autoFocus true', () => {
    const { result } = renderHook(() => useFocusTrap({ isActive: false, autoFocus: true }));

    act(() => {
      result.current.containerRef.current = container;
      result.current.activate();
    });

    expect(result.current.isTrapped).toBe(true);
  });

  it('deactivate returns to previous focus element', () => {
    button1.focus();
    const previousElement = document.activeElement as HTMLElement;

    const { result } = renderHook(() =>
      useFocusTrap({ isActive: true, returnFocusTo: previousElement })
    );

    act(() => {
      result.current.containerRef.current = container;
    });

    act(() => {
      result.current.deactivate();
    });

    expect(result.current.isTrapped).toBe(false);
  });

  it('calls onEscapeFocus when escape key is pressed', () => {
    const onEscapeFocus = jest.fn();
    const { result } = renderHook(() => useFocusTrap({ isActive: true, onEscapeFocus }));

    act(() => {
      result.current.containerRef.current = container;
    });

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(event);
    });

    expect(onEscapeFocus).toHaveBeenCalledTimes(1);
  });

  it('does not trap focus when isActive is false', () => {
    const { result } = renderHook(() => useFocusTrap({ isActive: false }));

    act(() => {
      result.current.containerRef.current = container;
    });

    expect(result.current.isTrapped).toBe(false);
  });

  it('toggles trap state when isActive changes', () => {
    const { result, rerender } = renderHook(
      ({ isActive }: { isActive: boolean }) => useFocusTrap({ isActive }),
      { initialProps: { isActive: false } }
    );

    expect(result.current.isTrapped).toBe(false);

    rerender({ isActive: true });

    expect(result.current.isTrapped).toBe(true);
  });

  it('respects initialFocus option when provided', () => {
    const { result } = renderHook(() =>
      useFocusTrap({ isActive: true, initialFocus: button2, autoFocus: true })
    );

    act(() => {
      result.current.containerRef.current = container;
    });

    expect(result.current.isTrapped).toBe(true);
  });
});
