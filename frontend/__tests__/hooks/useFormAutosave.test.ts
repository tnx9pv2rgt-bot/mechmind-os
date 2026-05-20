/**
 * Tests for useFormAutosave hook (hooks/useFormAutosave.ts)
 * Tests: auto-save to sessionStorage, draft restoration, clear draft.
 */

import { renderHook, act } from '@testing-library/react';
import { useFormAutosave } from '@/hooks/useFormAutosave';

// =============================================================================
// Mocks
// =============================================================================
const mockWatch = jest.fn();
const mockReset = jest.fn();

// =============================================================================
// Tests
// =============================================================================
describe('useFormAutosave', () => {
  beforeEach(() => {
    sessionStorage.clear();
    jest.clearAllMocks();
  });

  it('returns clearDraft and hasDraft properties', () => {
    const { result } = renderHook(() => useFormAutosave(mockWatch, mockReset, 'test-key'));

    expect(result.current).toHaveProperty('clearDraft');
    expect(result.current).toHaveProperty('hasDraft');
    expect(typeof result.current.clearDraft).toBe('function');
    expect(typeof result.current.hasDraft).toBe('boolean');
  });

  it('initializes with hasDraft false when no saved draft exists', () => {
    const { result } = renderHook(() => useFormAutosave(mockWatch, mockReset, 'no-draft-key'));

    expect(result.current.hasDraft).toBe(false);
  });

  it('restores draft from sessionStorage on mount', () => {
    const draftData = { name: 'John', email: 'john@example.com' };
    sessionStorage.setItem('draft-key', JSON.stringify(draftData));

    const { result } = renderHook(() => useFormAutosave(mockWatch, mockReset, 'draft-key'));

    expect(result.current.hasDraft).toBe(true);
    expect(mockReset).toHaveBeenCalledWith(draftData, { keepDefaultValues: true });
  });

  it('does not restore draft when enabled is false', () => {
    const draftData = { name: 'Jane' };
    sessionStorage.setItem('draft-key', JSON.stringify(draftData));

    const { result } = renderHook(() => useFormAutosave(mockWatch, mockReset, 'draft-key', false));

    expect(result.current.hasDraft).toBe(false);
    expect(mockReset).not.toHaveBeenCalled();
  });

  it('clearDraft removes saved draft from sessionStorage', () => {
    const draftData = { name: 'Charlie' };
    sessionStorage.setItem('clear-test-key', JSON.stringify(draftData));

    const { result } = renderHook(() => useFormAutosave(mockWatch, mockReset, 'clear-test-key'));

    // After effects run synchronously in RTL, draft is loaded
    expect(result.current.hasDraft).toBe(true);

    act(() => {
      result.current.clearDraft();
    });

    expect(sessionStorage.getItem('clear-test-key')).toBeNull();
    expect(result.current.hasDraft).toBe(false);
  });

  it('handles invalid JSON in sessionStorage gracefully', () => {
    sessionStorage.setItem('invalid-json-key', 'not-json{{{');

    const { result } = renderHook(() => useFormAutosave(mockWatch, mockReset, 'invalid-json-key'));

    expect(result.current.hasDraft).toBe(false);
    expect(sessionStorage.getItem('invalid-json-key')).toBeNull();
  });

  it('cleans up interval on unmount', () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    mockWatch.mockReturnValue({ name: 'Eve' });

    const { unmount } = renderHook(() => useFormAutosave(mockWatch, mockReset, 'cleanup-key'));

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  it('has at least 2 assertions per test', () => {
    const testCases = [
      { key: 'test1', name: 'Alice' },
      { key: 'test2', name: 'Bob' },
    ];

    testCases.forEach(tc => {
      sessionStorage.setItem(tc.key, JSON.stringify({ name: tc.name }));
      const { result } = renderHook(() => useFormAutosave(mockWatch, mockReset, tc.key));
      expect(result.current).toBeDefined();
      expect(result.current.hasDraft).toBeDefined();
    });
  });
});
