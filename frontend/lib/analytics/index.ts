/**
 * Analytics Module
 *
 * Re-exports for all analytics sub-modules
 */

export {
  behavioralTracker,
  BehavioralTracker,
  type BehavioralMetrics,
  type RageClickEvent,
  type MousePosition,
  type ScrollData,
  type AbandonmentRisk,
  type TrackingConfig,
} from './behavioral';

export { behavioralTracker as default } from './behavioral';

export { useExperiment, useABTesting, abTesting, withABTest } from './abTesting';
export type { Variant, Experiment, VariantConfig, Assignment, ExperimentResult } from './abTesting';

export { heatmapTracker, useHeatmapTracker } from './heatmap';
export type { HeatmapPoint, FieldInteraction, HeatmapSession } from './heatmap';

export { errorTracker, useErrorTracker, captureReactError } from './errorTracking';
export type { ErrorLevel, ErrorContext, NetworkError, Transaction } from './errorTracking';
