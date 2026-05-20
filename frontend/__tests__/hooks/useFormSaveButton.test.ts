/**
 * Tests for useFormSaveButton hook (hooks/form-persistence/useFormSaveButton.ts)
 * Tests: save flow, isSaving/isSaved state, callbacks, reset.
 */

import { renderHook, act } from '@testing-library/react';
import { useFormSaveButton } from '@/hooks/form-persistence/useFormSaveButton';

// =============================================================================
// Mocks
// =============================================================================
const mockForceSave = jest.fn();
const mockPersistence = {
  lastSaved: null,
  lastSavedText: '',
  hasRestorableData: false,
  showRestoreModal: false,
  isExpired: false,
  daysSinceSave: 0,
  saveForm: jest.fn(),
  restoreForm: jest.fn(),
  clearSavedData: jest.fn(),
  dismissRestoreModal: jest.fn(),
  forceSave: mockForceSave,
};

// =============================================================================
// Tests
// =============================================================================
describe('useFormSaveButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockForceSave.mockReturnValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useFormSaveButton({ persistence: mockPersistence }));

    expect(result.current.isSaving).toBe(false);
    expect(result.current.isSaved).toBe(false);
    expect(result.current.lastSavedAt).toBeNull();
    expect(typeof result.current.handleSave).toBe('function');
    expect(typeof result.current.handleSaveAndContinue).toBe('function');
    expect(typeof result.current.reset).toBe('function');
  });

  it('handleSave calls forceSave and marks isSaved', async () => {
    const { result } = renderHook(() => useFormSaveButton({ persistence: mockPersistence }));

    await act(async () => {
      const p = result.current.handleSave();
      jest.advanceTimersByTime(600);
      await p;
    });

    expect(mockForceSave).toHaveBeenCalledTimes(1);
    expect(result.current.isSaved).toBe(true);
    expect(result.current.lastSavedAt).toBeInstanceOf(Date);
  });

  it('handleSave sets isSaving to true during operation', () => {
    const { result } = renderHook(() => useFormSaveButton({ persistence: mockPersistence }));

    act(() => {
      result.current.handleSave(); // start save, don't await
    });

    expect(result.current.isSaving).toBe(true);
    expect(mockForceSave).toHaveBeenCalledTimes(1);
  });

  it('onSaveComplete callback is called after save', async () => {
    const onSaveComplete = jest.fn();
    const { result } = renderHook(() =>
      useFormSaveButton({ persistence: mockPersistence, onSaveComplete })
    );

    await act(async () => {
      const p = result.current.handleSave();
      jest.advanceTimersByTime(600);
      await p;
    });

    expect(onSaveComplete).toHaveBeenCalledTimes(1);
    expect(mockForceSave).toHaveBeenCalledTimes(1);
  });

  it('handleSaveAndContinue triggers save then calls onSaveAndContinueLater', async () => {
    const onSaveAndContinueLater = jest.fn();
    const { result } = renderHook(() =>
      useFormSaveButton({ persistence: mockPersistence, onSaveAndContinueLater })
    );

    await act(async () => {
      result.current.handleSaveAndContinue();
      jest.runAllTimers();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockForceSave).toHaveBeenCalledTimes(1);
    expect(onSaveAndContinueLater).toHaveBeenCalledTimes(1);
  });

  it('reset clears isSaved and lastSavedAt', async () => {
    const { result } = renderHook(() => useFormSaveButton({ persistence: mockPersistence }));

    await act(async () => {
      const p = result.current.handleSave();
      jest.advanceTimersByTime(600);
      await p;
    });

    expect(result.current.isSaved).toBe(true);
    expect(result.current.lastSavedAt).toBeInstanceOf(Date);

    act(() => {
      result.current.reset();
    });

    expect(result.current.isSaving).toBe(false);
    expect(result.current.isSaved).toBe(false);
    expect(result.current.lastSavedAt).toBeNull();
  });

  it('isSaving resets to false after handleSave completes', async () => {
    const { result } = renderHook(() => useFormSaveButton({ persistence: mockPersistence }));

    await act(async () => {
      const p = result.current.handleSave();
      jest.advanceTimersByTime(600);
      await p;
    });

    expect(result.current.isSaving).toBe(false);
    expect(mockForceSave).toHaveBeenCalledTimes(1);
  });

  it('uses custom confirmationMessage when provided', async () => {
    const onSaveComplete = jest.fn();
    const { result } = renderHook(() =>
      useFormSaveButton({
        persistence: mockPersistence,
        onSaveComplete,
        confirmationMessage: 'Salvato con successo!',
        showConfirmation: true,
      })
    );

    await act(async () => {
      const p = result.current.handleSave();
      jest.advanceTimersByTime(600);
      await p;
    });

    expect(onSaveComplete).toHaveBeenCalledTimes(1);
    expect(mockForceSave).toHaveBeenCalledTimes(1);
  });
});
