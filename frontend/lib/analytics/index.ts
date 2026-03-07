/**
 * Behavioral Analytics Module
 * 
 * Tracciamento comportamentale stile Mixpanel/Amplitude
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
