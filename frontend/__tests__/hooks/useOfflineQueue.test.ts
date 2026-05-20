/**
 * Tests for useOfflineQueue hook (hooks/form-persistence/useOfflineQueue.ts)
 * Tests: saveOffline, sync, getPendingSubmissions, removeSubmission, clearAll, callbacks.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useOfflineQueue } from '@/hooks/form-persistence/useOfflineQueue';

// =============================================================================
// Mocks
// =============================================================================
const mockFetch = jest.fn();
global.fetch = mockFetch;

const QUEUE_STORAGE_KEY = 'offline_queue';

function buildQueue(
  overrides: Partial<{
    id: string;
    formId: string;
    synced: boolean;
    attempts: number;
  }> = {}
) {
  return [
    {
      id: overrides.id ?? 'sub_001',
      formId: overrides.formId ?? 'test-form',
      data: { name: 'Cliente Test' },
      timestamp: Date.now() - 1000,
      attempts: overrides.attempts ?? 0,
      synced: overrides.synced ?? false,
    },
  ];
}

// =============================================================================
// Tests
// =============================================================================
describe('useOfflineQueue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    // Default: fetch succeeds (prevents unhandled rejections on auto-sync)
    mockFetch.mockResolvedValue({ ok: true });
    (window.localStorage.getItem as jest.Mock).mockReturnValue(null);
    (window.localStorage.setItem as jest.Mock).mockReturnValue(undefined);
    (window.localStorage.removeItem as jest.Mock).mockReturnValue(undefined);
  });

  it('initializes with empty queue and online state', () => {
    const { result } = renderHook(() => useOfflineQueue({ formId: 'test-form' }));

    expect(result.current.isOnline).toBe(true);
    expect(result.current.isSyncing).toBe(false);
    expect(result.current.pendingCount).toBe(0);
    expect(typeof result.current.saveOffline).toBe('function');
    expect(typeof result.current.sync).toBe('function');
    expect(typeof result.current.getPendingSubmissions).toBe('function');
    expect(typeof result.current.removeSubmission).toBe('function');
    expect(typeof result.current.clearAll).toBe('function');
  });

  it('saveOffline persists item to localStorage', () => {
    const { result } = renderHook(() => useOfflineQueue({ formId: 'test-form' }));

    act(() => {
      result.current.saveOffline({ name: 'Mario Rossi' });
    });

    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      QUEUE_STORAGE_KEY,
      expect.stringContaining('test-form')
    );
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      QUEUE_STORAGE_KEY,
      expect.stringContaining('Mario Rossi')
    );
  });

  it('sync calls fetch endpoint for pending submissions', async () => {
    (window.localStorage.getItem as jest.Mock).mockReturnValueOnce(JSON.stringify(buildQueue()));
    mockFetch.mockResolvedValueOnce({ ok: true });

    const { result } = renderHook(() =>
      useOfflineQueue({ formId: 'test-form', syncEndpoint: '/api/customers' })
    );

    await act(async () => {
      await result.current.sync();
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/customers',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('getPendingSubmissions returns only unsynced items for this formId', () => {
    const queue = [
      {
        id: 'sub_1',
        formId: 'test-form',
        data: {},
        timestamp: Date.now(),
        attempts: 0,
        synced: false,
      },
      {
        id: 'sub_2',
        formId: 'test-form',
        data: {},
        timestamp: Date.now(),
        attempts: 0,
        synced: true,
      },
      {
        id: 'sub_3',
        formId: 'other-form',
        data: {},
        timestamp: Date.now(),
        attempts: 0,
        synced: false,
      },
    ];
    (window.localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(queue));

    const { result } = renderHook(() => useOfflineQueue({ formId: 'test-form' }));

    const pending = result.current.getPendingSubmissions();
    expect(pending).toHaveLength(1);
    expect(pending[0].id).toBe('sub_1');
    expect(pending[0].formId).toBe('test-form');
  });

  it('removeSubmission removes specific item from queue', () => {
    (window.localStorage.getItem as jest.Mock).mockReturnValue(
      JSON.stringify(buildQueue({ id: 'sub_001' }))
    );

    const { result } = renderHook(() => useOfflineQueue({ formId: 'test-form' }));

    act(() => {
      result.current.removeSubmission('sub_001');
    });

    expect(window.localStorage.setItem).toHaveBeenCalledWith(QUEUE_STORAGE_KEY, '[]');
  });

  it('clearAll removes only submissions for this formId', () => {
    const queue = [
      {
        id: 'sub_1',
        formId: 'test-form',
        data: {},
        timestamp: Date.now(),
        attempts: 0,
        synced: false,
      },
      {
        id: 'sub_2',
        formId: 'other-form',
        data: {},
        timestamp: Date.now(),
        attempts: 0,
        synced: false,
      },
    ];
    (window.localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(queue));

    const { result } = renderHook(() => useOfflineQueue({ formId: 'test-form' }));

    act(() => {
      result.current.clearAll();
    });

    const calls = (window.localStorage.setItem as jest.Mock).mock.calls;
    const queueCalls = calls.filter(c => c[0] === QUEUE_STORAGE_KEY);
    const lastSaved = JSON.parse(queueCalls[queueCalls.length - 1][1]);
    expect(lastSaved.every((s: { formId: string }) => s.formId !== 'test-form')).toBe(true);
    expect(lastSaved.some((s: { formId: string }) => s.formId === 'other-form')).toBe(true);
  });

  it('onSyncStart is called when sync begins', async () => {
    const onSyncStart = jest.fn();
    (window.localStorage.getItem as jest.Mock).mockReturnValueOnce(JSON.stringify(buildQueue()));
    mockFetch.mockResolvedValueOnce({ ok: true });

    const { result } = renderHook(() => useOfflineQueue({ formId: 'test-form', onSyncStart }));

    await act(async () => {
      await result.current.sync();
    });

    expect(onSyncStart).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('onSyncComplete is called after successful sync', async () => {
    const onSyncComplete = jest.fn();
    (window.localStorage.getItem as jest.Mock).mockReturnValueOnce(JSON.stringify(buildQueue()));
    mockFetch.mockResolvedValueOnce({ ok: true });

    const { result } = renderHook(() => useOfflineQueue({ formId: 'test-form', onSyncComplete }));

    await act(async () => {
      await result.current.sync();
    });

    expect(onSyncComplete).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('sync does nothing when queue is empty', async () => {
    const { result } = renderHook(() => useOfflineQueue({ formId: 'test-form' }));

    await act(async () => {
      await result.current.sync();
    });

    // fetch should NOT be called when no pending items
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.pendingCount).toBe(0);
  });
});
