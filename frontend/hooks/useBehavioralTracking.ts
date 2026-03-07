/**
 * React Hook for Behavioral Analytics Tracking
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { 
  behavioralTracker, 
  BehavioralTracker,
  AbandonmentRisk,
  TrackingConfig 
} from '../lib/analytics/behavioral';

export interface UseBehavioralTrackingOptions {
  formId: string;
  endpoint?: string;
  currentStep?: string;
  trackMouse?: boolean;
  trackScroll?: boolean;
  enableAbandonmentPrevention?: boolean;
  abandonmentThreshold?: number;
  config?: Partial<TrackingConfig>;
  onHighAbandonmentRisk?: (score: number) => void;
  onFrustrationDetected?: (type: 'rage_click' | 'high_hesitation' | 'corrections') => void;
}

export interface UseBehavioralTrackingReturn {
  trackClick: (element: string | Element, event?: MouseEvent) => void;
  trackFieldFocus: (fieldName: string) => void;
  trackFieldFirstInput: (fieldName: string) => void;
  trackFieldChange: (fieldName: string, value: string) => void;
  trackFieldBlur: (fieldName: string) => void;
  trackScroll: (depthPercent: number) => void;
  getAbandonmentRisk: () => AbandonmentRisk;
  getAbandonmentScore: () => number;
  exportMetrics: () => ReturnType<BehavioralTracker['exportMetrics']>;
  getSummary: () => ReturnType<BehavioralTracker['getSummary']>;
  reset: () => void;
  abandonmentRisk: AbandonmentRisk;
  abandonmentScore: number;
  showAbandonmentModal: boolean;
  closeAbandonmentModal: () => void;
  openAbandonmentModal: () => void;
  hasRecentRageClick: boolean;
  hasRecentHighHesitation: boolean;
}

export function useBehavioralTracking(
  options: UseBehavioralTrackingOptions
): UseBehavioralTrackingReturn {
  const {
    formId,
    endpoint = '/api/analytics/behavioral',
    currentStep = 'unknown',
    trackMouse = true,
    trackScroll: trackScrollEnabled = true,
    enableAbandonmentPrevention = true,
    abandonmentThreshold = 70,
    config,
    onHighAbandonmentRisk,
    onFrustrationDetected,
  } = options;

  const trackerRef = useRef<BehavioralTracker>(behavioralTracker);
  
  const [abandonmentRisk, setAbandonmentRisk] = useState<AbandonmentRisk>('low');
  const [abandonmentScore, setAbandonmentScore] = useState(0);
  const [showAbandonmentModal, setShowAbandonmentModal] = useState(false);
  const [hasRecentRageClick, setHasRecentRageClick] = useState(false);
  const [hasRecentHighHesitation, setHasRecentHighHesitation] = useState(false);

  useEffect(() => {
    const tracker = trackerRef.current;
    
    if (config) {
      Object.assign(tracker, { config: { ...tracker['config'], ...config } });
    }
    
    tracker.setCurrentStep(currentStep);
    tracker.startBatchSending(endpoint, formId);
    
    return () => {
      tracker.stopBatchSending();
    };
  }, [config, currentStep, endpoint, formId]);

  useEffect(() => {
    if (!trackMouse) return;

    const tracker = trackerRef.current;
    let throttled = false;
    let throttleTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      if (throttled) return;
      
      throttled = true;
      throttleTimeout = setTimeout(() => {
        throttled = false;
      }, 100);
      
      tracker.trackMouseMove(e.clientX, e.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (throttleTimeout) clearTimeout(throttleTimeout);
    };
  }, [trackMouse]);

  useEffect(() => {
    if (!trackScrollEnabled) return;

    const tracker = trackerRef.current;
    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;
      
      ticking = true;
      requestAnimationFrame(() => {
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = scrollHeight > 0 
          ? (window.scrollY / scrollHeight) * 100 
          : 0;
        
        tracker.trackScroll(scrollPercent);
        ticking = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [trackScrollEnabled]);

  useEffect(() => {
    if (!enableAbandonmentPrevention) return;

    const tracker = trackerRef.current;

    const checkRisk = setInterval(() => {
      const risk = tracker.getAbandonmentRisk();
      const score = tracker.getAbandonmentScore();
      
      setAbandonmentRisk(risk);
      setAbandonmentScore(score);

      const summary = tracker.getSummary();
      if ((summary.rageClicks as number) > 0) {
        setHasRecentRageClick(true);
        onFrustrationDetected?.('rage_click');
      }

      if ((summary.fieldsWithHighHesitation as string[]).length > 0) {
        setHasRecentHighHesitation(true);
        onFrustrationDetected?.('high_hesitation');
      }

      const corrections = summary.fieldsWithCorrections as Record<string, number>;
      if (Object.values(corrections).some(c => c >= 3)) {
        onFrustrationDetected?.('corrections');
      }

      if (score >= abandonmentThreshold && !showAbandonmentModal && risk === 'high') {
        setShowAbandonmentModal(true);
        onHighAbandonmentRisk?.(score);
      }
    }, 5000);

    return () => {
      clearInterval(checkRisk);
    };
  }, [
    enableAbandonmentPrevention,
    abandonmentThreshold,
    formId,
    currentStep,
    showAbandonmentModal,
    onHighAbandonmentRisk,
    onFrustrationDetected,
  ]);

  const trackClick = useCallback((element: string | Element, event?: MouseEvent) => {
    trackerRef.current.trackClick(element, event);
  }, []);

  const trackFieldFocus = useCallback((fieldName: string) => {
    trackerRef.current.trackFieldFocus(fieldName);
  }, []);

  const trackFieldFirstInput = useCallback((fieldName: string) => {
    trackerRef.current.trackFieldFirstInput(fieldName);
  }, []);

  const trackFieldChange = useCallback((fieldName: string, value: string) => {
    trackerRef.current.trackFieldChange(fieldName, value);
  }, []);

  const trackFieldBlur = useCallback((fieldName: string) => {
    trackerRef.current.trackFieldBlur(fieldName);
  }, []);

  const trackScroll = useCallback((depthPercent: number) => {
    trackerRef.current.trackScroll(depthPercent);
  }, []);

  const getAbandonmentRisk = useCallback(() => {
    return trackerRef.current.getAbandonmentRisk();
  }, []);

  const getAbandonmentScore = useCallback(() => {
    return trackerRef.current.getAbandonmentScore();
  }, []);

  const exportMetrics = useCallback(() => {
    return trackerRef.current.exportMetrics();
  }, []);

  const getSummary = useCallback(() => {
    return trackerRef.current.getSummary();
  }, []);

  const reset = useCallback(() => {
    trackerRef.current.reset();
    setAbandonmentRisk('low');
    setAbandonmentScore(0);
    setShowAbandonmentModal(false);
    setHasRecentRageClick(false);
    setHasRecentHighHesitation(false);
  }, []);

  const closeAbandonmentModal = useCallback(() => {
    setShowAbandonmentModal(false);
  }, [formId, abandonmentScore]);

  const openAbandonmentModal = useCallback(() => {
    setShowAbandonmentModal(true);
  }, []);

  return {
    trackClick,
    trackFieldFocus,
    trackFieldFirstInput,
    trackFieldChange,
    trackFieldBlur,
    trackScroll,
    getAbandonmentRisk,
    getAbandonmentScore,
    exportMetrics,
    getSummary,
    reset,
    abandonmentRisk,
    abandonmentScore,
    showAbandonmentModal,
    closeAbandonmentModal,
    openAbandonmentModal,
    hasRecentRageClick,
    hasRecentHighHesitation,
  };
}

export function useFieldTracking(fieldName: string, options: UseBehavioralTrackingOptions) {
  const tracking = useBehavioralTracking(options);
  
  return {
    onFocus: () => tracking.trackFieldFocus(fieldName),
    onInput: () => tracking.trackFieldFirstInput(fieldName),
    onChange: (value: string) => tracking.trackFieldChange(fieldName, value),
    onBlur: () => tracking.trackFieldBlur(fieldName),
  };
}

export function useRageClickTracking(options: UseBehavioralTrackingOptions) {
  const tracking = useBehavioralTracking(options);
  
  return {
    onClick: (e: React.MouseEvent, elementName?: string) => {
      const target = e.currentTarget;
      const name = elementName || target.getAttribute('data-track-id') || target.tagName;
      tracking.trackClick(name, e.nativeEvent as unknown as MouseEvent);
    },
    hasRageClick: tracking.hasRecentRageClick,
  };
}

export default useBehavioralTracking;
