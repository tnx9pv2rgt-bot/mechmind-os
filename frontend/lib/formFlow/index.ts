/**
 * Conditional Form Flow - Export index
 */

// Types
export type {
  FormAnswers,
  BranchCondition,
  FormBranch,
  StepTiming,
  FormFlowConfig,
  StepConfig,
  FormFlowState,
  FormFlowActions,
  UseConditionalFlowReturn,
  ConditionalStepRendererProps,
  DynamicProgressProps,
  ConditionalNavigationProps,
  FormFlowEvents,
  URLSyncOptions,
  UseConditionalFlowOptions,
} from './types';

// Core logic
export {
  formFlowConfig,
  stepConfigs,
  calculateSteps,
  calculateTime,
  calculateProgress,
  shouldSkipStep,
  getPreviousValidStep,
  getNextValidStep,
  validateStep,
  getStepsToValidate,
  arePreviousStepsValid,
} from './conditionalLogic';

// Utils
export {
  syncWithURL,
  getStepFromURL,
  clearURLParams,
  parseAnswersFromURL,
  serializeAnswersToURL,
} from './urlSync';

export {
  debounce,
  throttle,
  isMobileDevice,
  getOptimizedStepId,
  formatEstimatedTime,
  createFormFlowEvents,
} from './utils';
