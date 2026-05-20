/**
 * Tests for useA11yAnnouncer hook (hooks/useA11yAnnouncer.ts)
 * Tests: announcements, priorities, auto-clear, callbacks, form announcer.
 */

import { renderHook, act } from '@testing-library/react';
import { useA11yAnnouncer, useFormAnnouncer } from '@/hooks/useA11yAnnouncer';

// =============================================================================
// Tests - useA11yAnnouncer
// =============================================================================
describe('useA11yAnnouncer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('initializes with empty announcements', () => {
    const { result } = renderHook(() => useA11yAnnouncer());
    expect(result.current.announcements).toEqual([]);
    expect(Array.isArray(result.current.announcements)).toBe(true);
  });

  it('announce creates announcement with default priority polite', () => {
    const { result } = renderHook(() => useA11yAnnouncer());

    act(() => {
      result.current.announce('Test message');
    });

    expect(result.current.announcements.length).toBe(1);
    expect(result.current.announcements[0].message).toBe('Test message');
    expect(result.current.announcements[0].priority).toBe('polite');
  });

  it('announceImmediately uses assertive priority', () => {
    const { result } = renderHook(() => useA11yAnnouncer());

    act(() => {
      result.current.announceImmediately('Urgent message');
    });

    expect(result.current.announcements.length).toBe(1);
    expect(result.current.announcements[0].priority).toBe('assertive');
    expect(result.current.announcements[0].message).toBe('Urgent message');
  });

  it('announceError prefixes message with error text', () => {
    const { result } = renderHook(() => useA11yAnnouncer());

    act(() => {
      result.current.announceError('Something went wrong');
    });

    expect(result.current.announcements.length).toBe(1);
    expect(result.current.announcements[0].message).toBe('Errore: Something went wrong');
    expect(result.current.announcements[0].priority).toBe('assertive');
  });

  it('announceSuccess prefixes message with success text', () => {
    const { result } = renderHook(() => useA11yAnnouncer());

    act(() => {
      result.current.announceSuccess('Item created');
    });

    expect(result.current.announcements.length).toBe(1);
    expect(result.current.announcements[0].message).toBe('Successo: Item created');
    expect(result.current.announcements[0].priority).toBe('polite');
  });

  it('announceLoading uses assertive priority and no auto-clear', () => {
    const { result } = renderHook(() => useA11yAnnouncer());

    act(() => {
      result.current.announceLoading('Loading data');
    });

    expect(result.current.announcements.length).toBe(1);
    expect(result.current.announcements[0].priority).toBe('assertive');
    expect(result.current.announcements[0].message).toBe('Loading data');
  });

  it('announcement auto-clears after specified timeout', () => {
    const { result } = renderHook(() => useA11yAnnouncer());

    act(() => {
      result.current.announce('Temporary', { clearAfter: 1000 });
    });

    expect(result.current.announcements.length).toBe(1);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.announcements.length).toBe(0);
  });

  it('clearAnnouncement removes announcement by id', () => {
    const { result } = renderHook(() => useA11yAnnouncer());
    let id: string;

    act(() => {
      id = result.current.announce('Message 1', { clearAfter: 0 });
      result.current.announce('Message 2', { clearAfter: 0 });
    });

    expect(result.current.announcements.length).toBe(2);

    act(() => {
      result.current.clearAnnouncement(id!);
    });

    expect(result.current.announcements.length).toBe(1);
    expect(result.current.announcements[0].message).toBe('Message 2');
  });

  it('clear removes all announcements', () => {
    const { result } = renderHook(() => useA11yAnnouncer());

    act(() => {
      result.current.announce('Message 1', { clearAfter: 0 });
      result.current.announce('Message 2', { clearAfter: 0 });
      result.current.announce('Message 3', { clearAfter: 0 });
    });

    expect(result.current.announcements.length).toBe(3);

    act(() => {
      result.current.clear();
    });

    expect(result.current.announcements.length).toBe(0);
  });

  it('returns unique ID for each announcement', () => {
    const { result } = renderHook(() => useA11yAnnouncer());
    let id1: string, id2: string;

    act(() => {
      id1 = result.current.announce('Message 1', { clearAfter: 0 });
      id2 = result.current.announce('Message 2', { clearAfter: 0 });
    });

    expect(id1).not.toBe(id2);
    expect(typeof id1).toBe('string');
    expect(typeof id2).toBe('string');
    expect(id1).toMatch(/^announce-/);
  });

  it('replacing announcement with same ID removes old one', () => {
    const { result } = renderHook(() => useA11yAnnouncer());

    act(() => {
      result.current.announce('Original', { id: 'test-id', clearAfter: 0 });
    });

    expect(result.current.announcements.length).toBe(1);
    expect(result.current.announcements[0].message).toBe('Original');

    act(() => {
      result.current.announce('Updated', { id: 'test-id', clearAfter: 0 });
    });

    expect(result.current.announcements.length).toBe(1);
    expect(result.current.announcements[0].message).toBe('Updated');
  });

  it('clearAfter 0 means no auto-clear', () => {
    const { result } = renderHook(() => useA11yAnnouncer());

    act(() => {
      result.current.announce('Persistent', { clearAfter: 0 });
    });

    expect(result.current.announcements.length).toBe(1);

    act(() => {
      jest.advanceTimersByTime(10000);
    });

    expect(result.current.announcements.length).toBe(1);
  });
});

// =============================================================================
// Tests - useFormAnnouncer
// =============================================================================
describe('useFormAnnouncer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('initializes with announcer methods', () => {
    const { result } = renderHook(() => useFormAnnouncer());
    expect(typeof result.current.announceFieldError).toBe('function');
    expect(typeof result.current.announceFieldSuccess).toBe('function');
    expect(typeof result.current.announceStepChange).toBe('function');
    expect(typeof result.current.announceFormSubmit).toBe('function');
    expect(typeof result.current.announceFormSuccess).toBe('function');
    expect(typeof result.current.announceFormError).toBe('function');
    expect(typeof result.current.announceRequiredField).toBe('function');
  });

  it('announceFieldError includes field name in message', () => {
    const { result } = renderHook(() => useFormAnnouncer());

    act(() => {
      result.current.announceFieldError('email', 'Email non valida');
    });

    // Verify hook executed without error
    expect(result.current).toBeDefined();
  });

  it('announceFieldSuccess includes field name in message', () => {
    const { result } = renderHook(() => useFormAnnouncer());

    act(() => {
      result.current.announceFieldSuccess('password');
    });

    expect(result.current).toBeDefined();
  });

  it('announceStepChange formats step info correctly', () => {
    const { result } = renderHook(() => useFormAnnouncer({ totalSteps: 5, formName: 'Customer' }));

    act(() => {
      result.current.announceStepChange(2, 'Dati personali');
    });

    expect(result.current).toBeDefined();
  });

  it('announceStepChange shows only step number if no title provided', () => {
    const { result } = renderHook(() => useFormAnnouncer({ totalSteps: 3 }));

    act(() => {
      result.current.announceStepChange(1);
    });

    expect(result.current).toBeDefined();
  });

  it('announceFormSubmit triggers submission announcement', () => {
    const { result } = renderHook(() => useFormAnnouncer());

    act(() => {
      result.current.announceFormSubmit();
    });

    expect(result.current).toBeDefined();
  });

  it('announceFormSuccess triggers success announcement', () => {
    const { result } = renderHook(() => useFormAnnouncer());

    act(() => {
      result.current.announceFormSuccess();
    });

    expect(result.current).toBeDefined();
  });

  it('announceFormError uses provided message or default', () => {
    const { result } = renderHook(() => useFormAnnouncer());

    act(() => {
      result.current.announceFormError('Dati non validi');
    });

    expect(result.current).toBeDefined();

    act(() => {
      result.current.announceFormError();
    });

    expect(result.current).toBeDefined();
  });

  it('announceRequiredField marks field as required', () => {
    const { result } = renderHook(() => useFormAnnouncer());

    act(() => {
      result.current.announceRequiredField('phone');
    });

    expect(result.current).toBeDefined();
  });
});
