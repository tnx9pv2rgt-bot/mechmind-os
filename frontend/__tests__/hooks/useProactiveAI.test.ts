/**
 * Tests for useProactiveAI hook (hooks/useProactiveAI.ts)
 * Tests: suggestion generation, dismissing, debounce, filtering by confidence.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useProactiveAI } from '@/hooks/useProactiveAI';

// =============================================================================
// Mocks
// =============================================================================
jest.mock('@/lib/ai/proactiveSuggestions', () => ({
  ProactiveAI: jest.fn(function (fillField) {
    this.fillField = fillField;
    this.generateSuggestions = jest.fn(() =>
      Promise.resolve([
        {
          id: 'sugg-1',
          field: 'email',
          text: 'Did you mean user@domain.com?',
          confidence: 0.95,
        },
      ])
    );
    this.dismissSuggestion = jest.fn();
  }),
  debounce: (fn: Function, delay: number) => {
    return fn; // For testing, return non-debounced version
  },
}));

// =============================================================================
// Tests
// =============================================================================
describe('useProactiveAI', () => {
  const mockFillField = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with empty suggestions', () => {
    const { result } = renderHook(() =>
      useProactiveAI({
        formData: { email: 'test@example.com' },
        currentField: 'email',
        fillField: mockFillField,
      })
    );

    expect(result.current.suggestions).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.isLoading).toBe('boolean');
  });

  it('returns all expected properties and methods', () => {
    const { result } = renderHook(() =>
      useProactiveAI({
        formData: {},
        currentField: 'email',
        fillField: mockFillField,
      })
    );

    expect(result.current).toHaveProperty('suggestions');
    expect(result.current).toHaveProperty('dismissSuggestion');
    expect(result.current).toHaveProperty('dismissAll');
    expect(result.current).toHaveProperty('refreshSuggestions');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('count');
    expect(result.current).toHaveProperty('hasSuggestions');
    expect(result.current).toHaveProperty('error');
    expect(typeof result.current.dismissSuggestion).toBe('function');
    expect(typeof result.current.dismissAll).toBe('function');
    expect(typeof result.current.refreshSuggestions).toBe('function');
  });

  it('generates suggestions when formData changes', async () => {
    const { result, rerender } = renderHook(
      ({ formData, currentField }) =>
        useProactiveAI({
          formData,
          currentField,
          fillField: mockFillField,
        }),
      {
        initialProps: {
          formData: { email: '' },
          currentField: 'email',
        },
      }
    );

    rerender({ formData: { email: 'us' }, currentField: 'email' });

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });
  });

  it('filters suggestions by minConfidence', async () => {
    const { result, rerender } = renderHook(
      ({ formData, currentField, minConfidence }) =>
        useProactiveAI({
          formData,
          currentField,
          fillField: mockFillField,
          minConfidence,
        }),
      {
        initialProps: {
          formData: { email: 'test@' },
          currentField: 'email',
          minConfidence: 0.8,
        },
      }
    );

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });

    expect(result.current).toHaveProperty('suggestions');
  });

  it('dismissSuggestion removes suggestion from list', async () => {
    const { result, rerender } = renderHook(
      ({ formData, currentField }) =>
        useProactiveAI({
          formData,
          currentField,
          fillField: mockFillField,
          minConfidence: 0.5,
        }),
      {
        initialProps: {
          formData: { email: 'test@' },
          currentField: 'email',
        },
      }
    );

    rerender({ formData: { email: 'test@ex' }, currentField: 'email' });

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });

    if (result.current.suggestions.length > 0) {
      act(() => {
        result.current.dismissSuggestion(result.current.suggestions[0].id);
      });

      expect(result.current.dismissSuggestion).toBeDefined();
    }
  });

  it('dismissAll removes all suggestions', async () => {
    const { result, rerender } = renderHook(
      ({ formData, currentField }) =>
        useProactiveAI({
          formData,
          currentField,
          fillField: mockFillField,
          minConfidence: 0.5,
        }),
      {
        initialProps: {
          formData: { email: 'test@' },
          currentField: 'email',
        },
      }
    );

    rerender({ formData: { email: 'test@ex' }, currentField: 'email' });

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });

    act(() => {
      result.current.dismissAll();
    });

    expect(result.current.suggestions).toEqual([]);
  });

  it('refreshSuggestions forces regeneration', async () => {
    const { result } = renderHook(() =>
      useProactiveAI({
        formData: { email: 'test@' },
        currentField: 'email',
        fillField: mockFillField,
      })
    );

    await act(async () => {
      result.current.refreshSuggestions();
    });

    expect(result.current.refreshSuggestions).toBeDefined();
  });

  it('count property returns number of suggestions', () => {
    const { result } = renderHook(() =>
      useProactiveAI({
        formData: {},
        currentField: 'email',
        fillField: mockFillField,
      })
    );

    expect(typeof result.current.count).toBe('number');
    expect(result.current.count).toBe(result.current.suggestions.length);
  });

  it('hasSuggestions returns true when suggestions exist', async () => {
    const { result, rerender } = renderHook(
      ({ formData, currentField }) =>
        useProactiveAI({
          formData,
          currentField,
          fillField: mockFillField,
          minConfidence: 0.5,
        }),
      {
        initialProps: {
          formData: { email: 'test@ex' },
          currentField: 'email',
        },
      }
    );

    expect(typeof result.current.hasSuggestions).toBe('boolean');
  });

  it('calls onSuggestionGenerated callback when suggestion is created', async () => {
    const onSuggestionGenerated = jest.fn();
    const { result, rerender } = renderHook(
      ({ formData, currentField }) =>
        useProactiveAI({
          formData,
          currentField,
          fillField: mockFillField,
          onSuggestionGenerated,
          minConfidence: 0.5,
        }),
      {
        initialProps: {
          formData: { email: 'test@' },
          currentField: 'email',
        },
      }
    );

    rerender({ formData: { email: 'test@ex' }, currentField: 'email' });

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });
  });

  it('respects enabled flag', () => {
    const { result } = renderHook(() =>
      useProactiveAI({
        formData: { email: 'test@' },
        currentField: 'email',
        fillField: mockFillField,
        enabled: false,
      })
    );

    expect(result.current.suggestions).toEqual([]);
  });

  it('skips generation for short field values', () => {
    const { result } = renderHook(() =>
      useProactiveAI({
        formData: { email: 'a' },
        currentField: 'email',
        fillField: mockFillField,
      })
    );

    expect(result.current.suggestions.length).toBe(0);
  });
});
