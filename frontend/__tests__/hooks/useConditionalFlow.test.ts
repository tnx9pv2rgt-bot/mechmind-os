/**
 * Tests for useConditionalFlow hook (hooks/form-flow/useConditionalFlow.ts)
 * Tests: navigation, answers, progress, reset, complete, step validation.
 */

// =============================================================================
// Mocks (must be before imports)
// =============================================================================
jest.mock('@/lib/formFlow/conditionalLogic', () => ({
  formFlowConfig: { steps: [], stepTiming: {} },
  calculateSteps: jest.fn(() => ['step1', 'step2', 'step3']),
  calculateTime: jest.fn(() => 5),
  calculateProgress: jest.fn((index: number, total: number) =>
    total > 0 ? Math.round((index / total) * 100) : 0
  ),
  getPreviousValidStep: jest.fn((index: number) => Math.max(0, index - 1)),
  getNextValidStep: jest.fn((index: number) => index + 1),
  validateStep: jest.fn(() => true),
}));

jest.mock('@/lib/formFlow/urlSync', () => ({
  syncWithURL: jest.fn(),
  getStepFromURL: jest.fn(() => 0),
  createPopStateHandler: jest.fn(() => jest.fn()),
  parseAnswersFromURL: jest.fn(() => ({})),
}));

jest.mock('@/lib/formFlow/utils', () => ({
  debounce: jest.fn((fn: (...args: unknown[]) => void) => fn),
  mergeAnswers: jest.fn((prev: Record<string, unknown>, updates: Record<string, unknown>) => ({
    ...prev,
    ...updates,
  })),
  haveAnswersChanged: jest.fn(
    (prev: unknown, next: unknown) => JSON.stringify(prev) !== JSON.stringify(next)
  ),
  generateSessionId: jest.fn(() => 'test-session-id'),
  saveFormState: jest.fn(),
  loadFormState: jest.fn(() => null),
  clearFormState: jest.fn(),
  getOptimizedStepId: jest.fn((id: string) => id),
}));

import { renderHook, act } from '@testing-library/react';
import { useConditionalFlow } from '@/hooks/form-flow/useConditionalFlow';
import {
  validateStep,
  getNextValidStep,
  getPreviousValidStep,
  calculateSteps,
} from '@/lib/formFlow/conditionalLogic';
import { clearFormState } from '@/lib/formFlow/utils';
import { syncWithURL } from '@/lib/formFlow/urlSync';

// =============================================================================
// Tests
// =============================================================================
describe('useConditionalFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (calculateSteps as jest.Mock).mockReturnValue(['step1', 'step2', 'step3']);
    (validateStep as jest.Mock).mockReturnValue(true);
    (getNextValidStep as jest.Mock).mockImplementation((index: number) => index + 1);
    (getPreviousValidStep as jest.Mock).mockImplementation((index: number) =>
      Math.max(0, index - 1)
    );
  });

  it('initializes with correct default state', () => {
    const { result } = renderHook(() => useConditionalFlow());

    expect(result.current.currentStepIndex).toBe(0);
    expect(result.current.currentStepId).toBe('step1');
    expect(result.current.isFirstStep).toBe(true);
    expect(result.current.isLastStep).toBe(false);
    expect(result.current.canGoBack).toBe(false);
    expect(result.current.canGoNext).toBe(true);
    expect(result.current.activeSteps).toEqual(['step1', 'step2', 'step3']);
    expect(result.current.answers).toEqual({});
  });

  it('exposes all required actions', () => {
    const { result } = renderHook(() => useConditionalFlow());

    expect(typeof result.current.goToNext).toBe('function');
    expect(typeof result.current.goToPrevious).toBe('function');
    expect(typeof result.current.goToStep).toBe('function');
    expect(typeof result.current.updateAnswers).toBe('function');
    expect(typeof result.current.updateAnswersImmediate).toBe('function');
    expect(typeof result.current.skipStep).toBe('function');
    expect(typeof result.current.reset).toBe('function');
    expect(typeof result.current.complete).toBe('function');
    expect(typeof result.current.getStepComponent).toBe('function');
  });

  it('goToNext advances to next step', () => {
    const { result } = renderHook(() => useConditionalFlow());

    act(() => {
      result.current.goToNext();
    });

    expect(result.current.currentStepIndex).toBe(1);
    expect(result.current.currentStepId).toBe('step2');
    expect(result.current.canGoBack).toBe(true);
    expect(getNextValidStep).toHaveBeenCalledWith(
      0,
      ['step1', 'step2', 'step3'],
      {},
      expect.anything()
    );
  });

  it('goToNext does not advance when validation fails', () => {
    (validateStep as jest.Mock).mockReturnValue(false);
    const { result } = renderHook(() => useConditionalFlow());

    act(() => {
      result.current.goToNext();
    });

    expect(result.current.currentStepIndex).toBe(0); // unchanged
    expect(getNextValidStep).not.toHaveBeenCalled();
  });

  it('goToPrevious goes back to previous step', () => {
    const { result } = renderHook(() => useConditionalFlow());

    act(() => {
      result.current.goToNext(); // → step 1
    });
    act(() => {
      result.current.goToPrevious(); // → step 0
    });

    expect(result.current.currentStepIndex).toBe(0);
    expect(result.current.isFirstStep).toBe(true);
    expect(getPreviousValidStep).toHaveBeenCalledWith(1, expect.any(Array), {}, expect.anything());
  });

  it('goToPrevious does nothing on first step', () => {
    const { result } = renderHook(() => useConditionalFlow());

    act(() => {
      result.current.goToPrevious();
    });

    expect(result.current.currentStepIndex).toBe(0);
    expect(getPreviousValidStep).not.toHaveBeenCalled();
  });

  it('goToStep navigates to specific step when all preceding steps are valid', () => {
    const { result } = renderHook(() => useConditionalFlow());

    act(() => {
      result.current.goToStep(2);
    });

    expect(result.current.currentStepIndex).toBe(2);
    expect(result.current.currentStepId).toBe('step3');
    expect(result.current.isLastStep).toBe(true);
  });

  it('updateAnswersImmediate updates form answers', () => {
    const onAnswersChange = jest.fn();
    const { result } = renderHook(() => useConditionalFlow({ onAnswersChange }));

    act(() => {
      result.current.updateAnswersImmediate({ name: 'Mario Rossi' });
    });

    expect(result.current.answers).toMatchObject({ name: 'Mario Rossi' });
    expect(onAnswersChange).toHaveBeenCalledWith(expect.objectContaining({ name: 'Mario Rossi' }));
  });

  it('reset returns to step 0 and clears answers', () => {
    const { result } = renderHook(() => useConditionalFlow({ initialAnswers: { name: 'Mario' } }));

    act(() => {
      result.current.updateAnswersImmediate({ name: 'Luigi' });
      result.current.goToNext();
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.currentStepIndex).toBe(0);
    expect(result.current.answers).toEqual({ name: 'Mario' }); // restored to initial
    expect(clearFormState).toHaveBeenCalledTimes(1);
  });

  it('complete calls onComplete with answers when on last step', () => {
    const onComplete = jest.fn();
    const { result } = renderHook(() => useConditionalFlow({ onComplete }));

    // Navigate to last step (index 2)
    act(() => {
      result.current.goToStep(2);
    });

    act(() => {
      result.current.complete();
    });

    expect(onComplete).toHaveBeenCalledWith({});
    expect(clearFormState).toHaveBeenCalled();
  });

  it('complete does nothing when not on last step', () => {
    const onComplete = jest.fn();
    const { result } = renderHook(() => useConditionalFlow({ onComplete }));

    // Step 0, not last
    act(() => {
      result.current.complete();
    });

    expect(onComplete).not.toHaveBeenCalled();
  });

  it('onStepChange callback is called when step changes', () => {
    const onStepChange = jest.fn();
    const { result } = renderHook(() => useConditionalFlow({ onStepChange }));

    act(() => {
      result.current.goToNext();
    });

    expect(onStepChange).toHaveBeenCalledWith(1, 'step2');
  });

  it('progress and estimatedTime are numeric', () => {
    const { result } = renderHook(() => useConditionalFlow());

    expect(typeof result.current.progress).toBe('number');
    expect(typeof result.current.estimatedTime).toBe('number');
  });

  it('syncWithURL is called on step change when urlSync enabled', () => {
    const { result } = renderHook(() => useConditionalFlow({ urlSync: { enabled: true } }));

    act(() => {
      result.current.goToNext();
    });

    expect(syncWithURL).toHaveBeenCalled();
  });
});
