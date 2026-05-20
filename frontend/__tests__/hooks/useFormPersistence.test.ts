/**
 * Tests for useFormPersistence hook (hooks/form-persistence/useFormPersistence.ts)
 * Tests: saveForm, forceSave, restoreForm, clearSavedData, dismissRestoreModal, callbacks.
 */

import { renderHook, act } from '@testing-library/react';
import { useFormPersistence } from '@/hooks/form-persistence/useFormPersistence';

// =============================================================================
// Mocks
// =============================================================================
const STORAGE_PREFIX = 'form_persistence_';

const mockUnsubscribe = jest.fn();
const mockGetValues = jest.fn();
const mockSetValue = jest.fn();
const mockWatch = jest.fn();

// minimal UseFormReturn shape
const mockForm = {
  watch: mockWatch,
  getValues: mockGetValues,
  setValue: mockSetValue,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

function buildStoredData(
  overrides: Partial<{
    timestamp: number;
    formId: string;
    version: number;
    data: Record<string, unknown>;
  }> = {}
) {
  return JSON.stringify({
    data: overrides.data ?? { name: 'Mario', email: 'mario@test.it' },
    currentStep: 1,
    timestamp: overrides.timestamp ?? Date.now() - 1000,
    formId: overrides.formId ?? 'test-form',
    version: overrides.version ?? 1,
  });
}

// =============================================================================
// Tests
// =============================================================================
describe('useFormPersistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    (window.localStorage.getItem as jest.Mock).mockReturnValue(null);
    (window.localStorage.setItem as jest.Mock).mockReturnValue(undefined);
    (window.localStorage.removeItem as jest.Mock).mockReturnValue(undefined);

    mockGetValues.mockReturnValue({ name: 'Test', email: 'test@test.it' });
    mockWatch.mockReturnValue({ unsubscribe: mockUnsubscribe });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('initializes with no restorable data when storage is empty', () => {
    const { result } = renderHook(() => useFormPersistence(mockForm, { formId: 'test-form' }));

    expect(result.current.hasRestorableData).toBe(false);
    expect(result.current.showRestoreModal).toBe(false);
    expect(result.current.lastSaved).toBeNull();
    expect(result.current.isExpired).toBe(false);
    expect(result.current.daysSinceSave).toBe(0);
  });

  it('saveForm persists to localStorage and updates lastSaved', () => {
    const { result } = renderHook(() => useFormPersistence(mockForm, { formId: 'test-form' }));

    act(() => {
      result.current.saveForm();
    });

    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      `${STORAGE_PREFIX}test-form`,
      expect.stringContaining('test-form')
    );
    expect(result.current.lastSaved).toBeInstanceOf(Date);
    expect(mockGetValues).toHaveBeenCalled();
  });

  it('forceSave persists immediately and updates lastSaved', () => {
    const { result } = renderHook(() => useFormPersistence(mockForm, { formId: 'test-form' }));

    act(() => {
      result.current.forceSave();
    });

    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      `${STORAGE_PREFIX}test-form`,
      expect.any(String)
    );
    expect(result.current.lastSaved).toBeInstanceOf(Date);
    expect(mockGetValues).toHaveBeenCalled();
  });

  it('clearSavedData removes from localStorage and resets state', () => {
    const { result } = renderHook(() => useFormPersistence(mockForm, { formId: 'test-form' }));

    act(() => {
      result.current.clearSavedData();
    });

    expect(window.localStorage.removeItem).toHaveBeenCalledWith(`${STORAGE_PREFIX}test-form`);
    expect(result.current.hasRestorableData).toBe(false);
    expect(result.current.showRestoreModal).toBe(false);
    expect(result.current.lastSaved).toBeNull();
  });

  it('hasRestorableData is true when non-expired data exists', () => {
    (window.localStorage.getItem as jest.Mock).mockReturnValueOnce(buildStoredData());

    const { result } = renderHook(() => useFormPersistence(mockForm, { formId: 'test-form' }));

    expect(result.current.hasRestorableData).toBe(true);
    expect(result.current.lastSaved).toBeInstanceOf(Date);
    expect(window.localStorage.getItem).toHaveBeenCalledWith(`${STORAGE_PREFIX}test-form`);
  });

  it('showRestoreModal is true for data saved more than 1 day ago', () => {
    const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
    (window.localStorage.getItem as jest.Mock).mockReturnValueOnce(
      buildStoredData({ timestamp: twoDaysAgo })
    );

    const { result } = renderHook(() => useFormPersistence(mockForm, { formId: 'test-form' }));

    expect(result.current.showRestoreModal).toBe(true);
    expect(result.current.hasRestorableData).toBe(true);
    expect(result.current.daysSinceSave).toBeGreaterThanOrEqual(1);
  });

  it('dismissRestoreModal hides modal without clearing data', () => {
    const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
    (window.localStorage.getItem as jest.Mock).mockReturnValueOnce(
      buildStoredData({ timestamp: twoDaysAgo })
    );

    const { result } = renderHook(() => useFormPersistence(mockForm, { formId: 'test-form' }));

    expect(result.current.showRestoreModal).toBe(true);

    act(() => {
      result.current.dismissRestoreModal();
    });

    expect(result.current.showRestoreModal).toBe(false);
    expect(result.current.hasRestorableData).toBe(true); // data still there
  });

  it('restoreForm calls setValue for each stored field', () => {
    (window.localStorage.getItem as jest.Mock).mockReturnValue(
      buildStoredData({ data: { name: 'Mario', email: 'mario@test.it' } })
    );

    const { result } = renderHook(() => useFormPersistence(mockForm, { formId: 'test-form' }));

    act(() => {
      result.current.restoreForm();
    });

    expect(mockSetValue).toHaveBeenCalledWith('name', 'Mario', expect.any(Object));
    expect(mockSetValue).toHaveBeenCalledWith('email', 'mario@test.it', expect.any(Object));
    expect(result.current.showRestoreModal).toBe(false);
  });

  it('onSave callback is called when saving', () => {
    const onSave = jest.fn();
    const { result } = renderHook(() =>
      useFormPersistence(mockForm, { formId: 'test-form', onSave })
    );

    act(() => {
      result.current.saveForm();
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(window.localStorage.setItem).toHaveBeenCalled();
  });

  it('onRestore callback is called when restoring', () => {
    const onRestore = jest.fn();
    (window.localStorage.getItem as jest.Mock).mockReturnValue(buildStoredData());

    const { result } = renderHook(() =>
      useFormPersistence(mockForm, { formId: 'test-form', onRestore })
    );

    act(() => {
      result.current.restoreForm();
    });

    expect(onRestore).toHaveBeenCalledTimes(1);
    expect(mockSetValue).toHaveBeenCalled();
  });

  it('expired data is cleared and onExpire is called', () => {
    const onExpire = jest.fn();
    const tenDaysAgo = Date.now() - 10 * 24 * 60 * 60 * 1000;
    (window.localStorage.getItem as jest.Mock).mockReturnValueOnce(
      buildStoredData({ timestamp: tenDaysAgo })
    );

    const { result } = renderHook(() =>
      useFormPersistence(mockForm, { formId: 'test-form', expirationDays: 7, onExpire })
    );

    expect(result.current.isExpired).toBe(true);
    expect(result.current.hasRestorableData).toBe(false);
    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(window.localStorage.removeItem).toHaveBeenCalledWith(`${STORAGE_PREFIX}test-form`);
  });
});
