/**
 * Critical hooks test suite
 * useFocusTrap | useReducedMotion | useFormSession | useAuth (smoke) | usePasskey (smoke)
 */
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { render, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';

import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useFormSession } from '@/hooks/useFormSession';
import { useAuth, AuthProvider } from '@/hooks/useAuth';
import { usePasskey } from '@/hooks/usePasskey';

jest.mock('@/lib/auth/webauthn', () => ({
  isWebAuthnSupported: jest.fn().mockReturnValue(false),
  isPlatformAuthenticatorAvailable: jest.fn().mockResolvedValue(false),
  isConditionalMediationAvailable: jest.fn().mockResolvedValue(false),
  registerPasskey: jest.fn(),
  authenticateWithPasskey: jest.fn(),
  authenticateWithConditionalPasskey: jest.fn(),
  getPasskeyBrowserInfo: jest.fn().mockReturnValue({ browser: 'Jest', supportsPasskeys: false }),
  fetchRegistrationChallenge: jest.fn(),
  fetchAuthenticationChallenge: jest.fn(),
  savePasskeyToServer: jest.fn(),
  verifyPasskeyWithServer: jest.fn(),
  deletePasskey: jest.fn(),
  fetchUserPasskeys: jest.fn().mockResolvedValue([]),
  getPasskeyErrorMessage: jest.fn().mockReturnValue('Error'),
}));

expect.extend(toHaveNoViolations);

// =============================================================================
// useFocusTrap
// =============================================================================

describe('useFocusTrap', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    act(() => { jest.runAllTimers(); });
    jest.useRealTimers();
  });

  it('initializes with isTrapped=false and exposes required API', () => {
    const { result } = renderHook(() => useFocusTrap({ isActive: false }));
    expect(result.current.isTrapped).toBe(false);
    expect(result.current.containerRef).toBeDefined();
  });

  it('activate() transitions isTrapped to true', () => {
    const { result } = renderHook(() =>
      useFocusTrap({ isActive: false, autoFocus: false })
    );
    act(() => {
      result.current.activate();
      jest.runAllTimers();
    });
    expect(result.current.isTrapped).toBe(true);
    expect(typeof result.current.deactivate).toBe('function');
  });

  it('deactivate() transitions isTrapped back to false', () => {
    const { result } = renderHook(() =>
      useFocusTrap({ isActive: false, autoFocus: false })
    );
    act(() => {
      result.current.activate();
      jest.runAllTimers();
    });
    act(() => {
      result.current.deactivate();
      jest.runAllTimers();
    });
    expect(result.current.isTrapped).toBe(false);
    expect(typeof result.current.activate).toBe('function');
  });

  it('isActive=true auto-activates trap via useEffect', () => {
    const { result } = renderHook(() =>
      useFocusTrap({ isActive: true, autoFocus: false })
    );
    act(() => { jest.runAllTimers(); });
    expect(result.current.isTrapped).toBe(true);
    expect(result.current.containerRef).toBeDefined();
  });

  it('Escape key calls onEscapeFocus callback', () => {
    const onEscapeFocus = jest.fn();
    renderHook(() =>
      useFocusTrap({ isActive: true, onEscapeFocus, autoFocus: false })
    );
    act(() => { jest.runAllTimers(); });
    act(() => { fireEvent.keyDown(document, { key: 'Escape' }); });
    expect(onEscapeFocus).toHaveBeenCalledTimes(1);
    expect(onEscapeFocus.mock.calls[0]).toHaveLength(0);
  });
});

// =============================================================================
// useReducedMotion
// =============================================================================

describe('useReducedMotion', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockReturnValue({
        matches: false,
        media: '(prefers-reduced-motion: reduce)',
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }),
    });
    localStorage.clear();
  });

  it('defaults to prefersReducedMotion=false and motionClass=motion-safe', () => {
    const { result } = renderHook(() => useReducedMotion({ persist: false }));
    expect(result.current.prefersReducedMotion).toBe(false);
    expect(result.current.motionClass).toBe('motion-safe');
  });

  it('enable() sets prefersReducedMotion=true and isManuallySet=true', () => {
    const { result } = renderHook(() => useReducedMotion({ persist: false }));
    act(() => { result.current.enable(); });
    expect(result.current.prefersReducedMotion).toBe(true);
    expect(result.current.isManuallySet).toBe(true);
  });

  it('disable() after enable sets prefersReducedMotion=false, keeps isManuallySet=true', () => {
    const { result } = renderHook(() => useReducedMotion({ persist: false }));
    act(() => { result.current.enable(); });
    act(() => { result.current.disable(); });
    expect(result.current.prefersReducedMotion).toBe(false);
    expect(result.current.isManuallySet).toBe(true);
  });

  it('toggle() flips prefersReducedMotion and updates motionClass', () => {
    const { result } = renderHook(() => useReducedMotion({ persist: false }));
    act(() => { result.current.toggle(); });
    expect(result.current.prefersReducedMotion).toBe(true);
    expect(result.current.motionClass).toBe('motion-reduce');
  });

  it('reset() clears manual override and restores isManuallySet=false', () => {
    const { result } = renderHook(() => useReducedMotion({ persist: false }));
    act(() => { result.current.enable(); });
    act(() => { result.current.reset(); });
    expect(result.current.isManuallySet).toBe(false);
    expect(result.current.prefersReducedMotion).toBe(false);
  });

  it('reducedMotionStyles returns animation override properties when enabled', () => {
    const { result } = renderHook(() => useReducedMotion({ persist: false }));
    act(() => { result.current.enable(); });
    expect(result.current.reducedMotionStyles).toHaveProperty('animationDuration');
    expect(result.current.reducedMotionStyles).toHaveProperty('transitionDuration');
  });

  it('reducedMotionStyles is empty object when disabled', () => {
    const { result } = renderHook(() => useReducedMotion({ persist: false }));
    expect(result.current.reducedMotionStyles).toEqual({});
    expect(result.current.motionClass).toBe('motion-safe');
  });

  it('persists preference to localStorage when persist=true', () => {
    const { result } = renderHook(() => useReducedMotion({ persist: true }));
    act(() => { result.current.enable(); });
    expect(localStorage.setItem).toHaveBeenCalledWith('a11y_reduced_motion', 'true');
    expect(result.current.isManuallySet).toBe(true);
  });

  it('rehydrates manual override from localStorage on mount', async () => {
    (localStorage.getItem as jest.Mock).mockReturnValueOnce('true');
    const { result } = renderHook(() => useReducedMotion({ persist: true }));
    await act(async () => {});
    expect(result.current.prefersReducedMotion).toBe(true);
    expect(result.current.isManuallySet).toBe(true);
  });

  it('toggle via rendered button uses userEvent.setup()', async () => {
    const user = userEvent.setup();
    function MotionWrapper() {
      const { motionClass, toggle } = useReducedMotion({ persist: false });
      return <button onClick={toggle} data-testid="btn">{motionClass}</button>;
    }
    const { getByTestId } = render(<MotionWrapper />);
    expect(getByTestId('btn').textContent).toBe('motion-safe');
    await user.click(getByTestId('btn'));
    expect(getByTestId('btn').textContent).toBe('motion-reduce');
  });
});

// =============================================================================
// useFormSession
// =============================================================================

describe('useFormSession', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('starts with empty formData and isLoaded=true after mount', async () => {
    const { result } = renderHook(() => useFormSession());
    await act(async () => {});
    expect(result.current.formData).toEqual({});
    expect(result.current.isLoaded).toBe(true);
  });

  it('saveStep stores data in state and sessionStorage', async () => {
    const { result } = renderHook(() => useFormSession());
    await act(async () => {});
    act(() => { result.current.saveStep(1, { name: 'Mario', email: 'mario@test.it' }); });
    expect(result.current.formData.name).toBe('Mario');
    expect(sessionStorage.getItem('customer_form_data')).not.toBeNull();
  });

  it('saveStep merges data across multiple steps', async () => {
    const { result } = renderHook(() => useFormSession());
    await act(async () => {});
    act(() => { result.current.saveStep(1, { name: 'Mario' }); });
    act(() => { result.current.saveStep(2, { email: 'mario@test.it' }); });
    expect(result.current.formData.name).toBe('Mario');
    expect(result.current.formData.email).toBe('mario@test.it');
  });

  it('getStepData returns only the requested field keys', async () => {
    const { result } = renderHook(() => useFormSession());
    await act(async () => {});
    act(() => { result.current.saveStep(1, { name: 'Mario', phone: '333', city: 'Roma' }); });
    const step = result.current.getStepData(['name', 'city']);
    expect(step).toEqual({ name: 'Mario', city: 'Roma' });
    expect(step).not.toHaveProperty('phone');
  });

  it('clearForm empties formData and removes sessionStorage entry', async () => {
    const { result } = renderHook(() => useFormSession());
    await act(async () => {});
    act(() => { result.current.saveStep(1, { name: 'Mario' }); });
    act(() => { result.current.clearForm(); });
    expect(result.current.formData).toEqual({});
    expect(sessionStorage.getItem('customer_form_data')).toBeNull();
  });

  it('rehydrates valid data from sessionStorage on mount', async () => {
    const payload = { step: 1, data: { name: 'Luigi' }, timestamp: Date.now() };
    sessionStorage.setItem('customer_form_data', JSON.stringify(payload));
    const { result } = renderHook(() => useFormSession());
    await act(async () => {});
    expect(result.current.formData.name).toBe('Luigi');
    expect(result.current.isLoaded).toBe(true);
  });

  it('discards and removes sessionStorage entries older than 24 hours', async () => {
    const stalePayload = {
      step: 1,
      data: { name: 'Stale' },
      timestamp: Date.now() - 25 * 60 * 60 * 1000,
    };
    sessionStorage.setItem('customer_form_data', JSON.stringify(stalePayload));
    const { result } = renderHook(() => useFormSession());
    await act(async () => {});
    expect(result.current.formData).toEqual({});
    expect(sessionStorage.getItem('customer_form_data')).toBeNull();
  });
});

// =============================================================================
// useAuth — smoke
// =============================================================================

describe('useAuth — smoke', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: jest.fn().mockResolvedValue({}),
    }) as jest.Mock;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('throws when called outside AuthProvider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow(/AuthProvider/);
    spy.mockRestore();
  });

  it('AuthProvider renders accessible tree (jest-axe)', async () => {
    const { container } = render(
      <AuthProvider>
        <div>content</div>
      </AuthProvider>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    expect(container.textContent).toContain('content');
  });

  it('provides unauthenticated context within AuthProvider after 401', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });
    await act(async () => {});
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });
});

// =============================================================================
// usePasskey — smoke
// =============================================================================

describe('usePasskey — smoke', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue([]),
    }) as jest.Mock;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('exposes isSupported as boolean and clearError as function', async () => {
    const { result } = renderHook(() => usePasskey());
    await act(async () => {});
    expect(typeof result.current.isSupported).toBe('boolean');
    expect(typeof result.current.clearError).toBe('function');
  });

  it('clearError resets error to null without side effects', async () => {
    const { result } = renderHook(() => usePasskey());
    await act(async () => {});
    act(() => { result.current.clearError(); });
    expect(result.current.error).toBeNull();
    expect(typeof result.current.isRegistering).toBe('boolean');
  });
});
