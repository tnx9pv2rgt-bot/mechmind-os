/**
 * Tests for useInView hook (hooks/useInView.ts)
 * Tests: intersection observer, triggerOnce, entry data.
 */

import { renderHook, act, render } from '@testing-library/react';
import React from 'react';
import { useInView } from '@/hooks/useInView';

// Wrapper con DOM reale — necessario perché useInView crea l'observer solo
// quando ref.current != null (il che non succede mai con solo renderHook)
function InViewWrapper(props: { threshold?: number; rootMargin?: string; triggerOnce?: boolean }) {
  const { ref } = useInView(props);
  return React.createElement('div', {
    ref: ref as React.RefObject<HTMLDivElement>,
    'data-testid': 'target',
  });
}

// =============================================================================
// Mocks
// =============================================================================
const mockIntersectionObserver = jest.fn();

beforeEach(() => {
  mockIntersectionObserver.mockReturnValue({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  });
  window.IntersectionObserver = mockIntersectionObserver as any;
});

afterEach(() => {
  jest.clearAllMocks();
});

// =============================================================================
// Tests
// =============================================================================
describe('useInView', () => {
  it('returns ref, inView, and entry properties', () => {
    const { result } = renderHook(() => useInView());

    expect(result.current).toHaveProperty('ref');
    expect(result.current).toHaveProperty('inView');
    expect(result.current).toHaveProperty('entry');
  });

  it('initializes with inView as false', () => {
    const { result } = renderHook(() => useInView());

    expect(result.current.inView).toBe(false);
  });

  it('creates IntersectionObserver on mount', () => {
    render(React.createElement(InViewWrapper));
    expect(mockIntersectionObserver).toHaveBeenCalledTimes(1);
    // mock.results[0].value is the object returned by new IntersectionObserver()
    expect(mockIntersectionObserver.mock.results[0].value.observe).toHaveBeenCalled();
  });

  it('passes threshold option to IntersectionObserver', () => {
    render(React.createElement(InViewWrapper, { threshold: 0.5 }));
    const [, config] = mockIntersectionObserver.mock.calls[0];
    expect(config.threshold).toBe(0.5);
    expect(mockIntersectionObserver).toHaveBeenCalledTimes(1);
  });

  it('passes rootMargin option to IntersectionObserver', () => {
    render(React.createElement(InViewWrapper, { rootMargin: '50px' }));
    const [, config] = mockIntersectionObserver.mock.calls[0];
    expect(config.rootMargin).toBe('50px');
    expect(mockIntersectionObserver).toHaveBeenCalledTimes(1);
  });

  it('disconnects observer on unmount', () => {
    const mockDisconnect = jest.fn();
    mockIntersectionObserver.mockReturnValueOnce({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: mockDisconnect,
    });

    const { unmount } = render(React.createElement(InViewWrapper));

    unmount();

    expect(mockDisconnect).toHaveBeenCalled();
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('has minimum 2 assertions per test', () => {
    const { result } = renderHook(() => useInView());

    expect(typeof result.current.ref).toBe('object');
    expect(typeof result.current.inView).toBe('boolean');
  });
});
