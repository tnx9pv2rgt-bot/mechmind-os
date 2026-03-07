/**
 * Form Funnel Analytics Hook
 * 
 * Hook completo per tracciare il funnel di conversione del form
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { analytics } from '../lib/analytics/segment';
import { heatmapTracker } from '../lib/analytics/heatmap';
import { errorTracker } from '../lib/analytics/errorTracking';
import { abTesting } from '../lib/analytics/abTesting';

// Tipi
type EntryPoint = 'organic' | 'ads' | 'referral' | 'direct' | 'social' | 'email';
type DeviceType = 'mobile' | 'tablet' | 'desktop';
type BrowserType = 'chrome' | 'firefox' | 'safari' | 'edge' | 'other';

interface FunnelStep {
  id: number;
  name: string;
  startTime: number;
  endTime?: number;
  duration: number;
  fieldsCompleted: string[];
  errors: Array<{ field: string; error: string; timestamp: number }>;
  corrections: Array<{ field: string; attempts: number; timestamp: number }>;
}

interface FunnelSession {
  sessionId: string;
  userId?: string;
  entryPoint: EntryPoint;
  device: DeviceType;
  browser: BrowserType;
  os: string;
  screenSize: { width: number; height: number };
  startTime: number;
  endTime?: number;
  totalDuration: number;
  steps: FunnelStep[];
  currentStep: number;
  isCompleted: boolean;
  isAbandoned: boolean;
  dropOffStep?: number;
  returnVisits: number;
  utmParams: Record<string, string>;
  referrer: string;
}

interface FunnelMetrics {
  conversionRate: number;
  avgTimePerStep: number;
  totalTime: number;
  dropOffRate: number;
  errorRate: number;
  stepMetrics: Array<{
    step: number;
    completionRate: number;
    avgDuration: number;
    dropOffRate: number;
  }>;
}

// Utility per rilevare device/browser
function detectDevice(): DeviceType {
  if (typeof window === 'undefined') return 'desktop';
  
  const width = window.innerWidth;
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (/mobile|android|iphone|ipad|ipod/.test(userAgent)) {
    return width < 768 ? 'mobile' : 'tablet';
  }
  
  return 'desktop';
}

function detectBrowser(): BrowserType {
  if (typeof window === 'undefined') return 'other';
  
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (userAgent.includes('chrome') && !userAgent.includes('edg')) return 'chrome';
  if (userAgent.includes('firefox')) return 'firefox';
  if (userAgent.includes('safari') && !userAgent.includes('chrome')) return 'safari';
  if (userAgent.includes('edg')) return 'edge';
  
  return 'other';
}

function detectOS(): string {
  if (typeof window === 'undefined') return 'unknown';
  
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (userAgent.includes('win')) return 'Windows';
  if (userAgent.includes('mac')) return 'macOS';
  if (userAgent.includes('linux')) return 'Linux';
  if (userAgent.includes('android')) return 'Android';
  if (userAgent.includes('iphone') || userAgent.includes('ipad')) return 'iOS';
  
  return 'unknown';
}

function parseEntryPoint(): EntryPoint {
  if (typeof window === 'undefined') return 'direct';
  
  const urlParams = new URLSearchParams(window.location.search);
  const utmSource = urlParams.get('utm_source');
  const referrer = document.referrer;
  
  if (utmSource) {
    switch (utmSource.toLowerCase()) {
      case 'google':
      case 'bing':
        return 'organic';
      case 'facebook':
      case 'instagram':
      case 'linkedin':
      case 'twitter':
        return 'social';
      case 'newsletter':
      case 'email':
        return 'email';
      default:
        return 'ads';
    }
  }
  
  if (referrer) {
    if (referrer.includes('google') || referrer.includes('bing')) {
      return 'organic';
    }
    return 'referral';
  }
  
  return 'direct';
}

function parseUtmParams(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  
  const urlParams = new URLSearchParams(window.location.search);
  const params: Record<string, string> = {};
  
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach((key) => {
    const value = urlParams.get(key);
    if (value) params[key] = value;
  });
  
  return params;
}

// Hook principale
export function useFormFunnel(formId: string = 'default-form') {
  const sessionRef = useRef<FunnelSession | null>(null);
  const stepStartTimeRef = useRef<number>(Date.now());
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [metrics, setMetrics] = useState<FunnelMetrics | null>(null);

  // Inizializza sessione
  useEffect(() => {
    const existingSession = loadSession(formId);
    
    if (existingSession && !existingSession.isCompleted) {
      // Riprendi sessione esistente
      sessionRef.current = existingSession;
      sessionRef.current.returnVisits++;
      
      // Traccia resume
      const hoursSinceLastVisit = (Date.now() - (existingSession.endTime || existingSession.startTime)) / (1000 * 60 * 60);
      analytics.trackFormResumed(hoursSinceLastVisit);
      
      setCurrentStep(existingSession.currentStep);
    } else {
      // Nuova sessione
      const newSession: FunnelSession = {
        sessionId: `${formId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        entryPoint: parseEntryPoint(),
        device: detectDevice(),
        browser: detectBrowser(),
        os: detectOS(),
        screenSize: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        startTime: Date.now(),
        steps: [],
        currentStep: 0,
        isCompleted: false,
        isAbandoned: false,
        returnVisits: 0,
        utmParams: parseUtmParams(),
        referrer: document.referrer,
      };
      
      sessionRef.current = newSession;
      
      // Traccia inizio form
      analytics.trackFormEvent('Form Started', {});
      
      // Identifica utente con dati sessione
      analytics.identify(newSession.sessionId, {
        entryPoint: newSession.entryPoint,
        device: newSession.device,
        browser: newSession.browser,
        os: newSession.os,
      });

      // Inizia heatmap tracking
      heatmapTracker.start();
      
      // Setup A/B testing
      abTesting.setUserId(newSession.sessionId);
    }
    
    stepStartTimeRef.current = Date.now();
    
    return () => {
      cleanupSession();
    };
  }, [formId]);

  // Salva sessione su cambiamenti
  useEffect(() => {
    if (sessionRef.current) {
      saveSession(formId, sessionRef.current);
    }
  }, [currentStep, formId]);

  // Gestisci exit intent
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionRef.current && !sessionRef.current.isCompleted) {
        sessionRef.current.isAbandoned = true;
        sessionRef.current.dropOffStep = currentStep;
        sessionRef.current.endTime = Date.now();
        sessionRef.current.totalDuration = sessionRef.current.endTime - sessionRef.current.startTime;
        
        // Traccia abbandono
        const currentStepData = sessionRef.current.steps[currentStep];
        if (currentStepData) {
          analytics.trackStepAbandoned(
            currentStep,
            currentStepData.fieldsCompleted[currentStepData.fieldsCompleted.length - 1] || 'unknown',
            Date.now() - stepStartTimeRef.current
          );
        }
        
        saveSession(formId, sessionRef.current);
      }
    };

    // Mouse leave (exit intent)
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && sessionRef.current && !sessionRef.current.isCompleted) {
        analytics.trackExitIntent();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [currentStep, formId]);

  const startStep = useCallback((stepId: number, stepName: string) => {
    stepStartTimeRef.current = Date.now();
    
    if (sessionRef.current) {
      // Completa step precedente se esiste
      const prevStep = sessionRef.current.steps[sessionRef.current.currentStep];
      if (prevStep && !prevStep.endTime) {
        prevStep.endTime = Date.now();
        prevStep.duration = prevStep.endTime - prevStep.startTime;
        
        analytics.trackStepCompleted(
          prevStep.id,
          prevStep.name,
          prevStep.duration
        );
      }
      
      // Crea nuovo step
      const newStep: FunnelStep = {
        id: stepId,
        name: stepName,
        startTime: Date.now(),
        duration: 0,
        fieldsCompleted: [],
        errors: [],
        corrections: [],
      };
      
      sessionRef.current.steps[stepId] = newStep;
      sessionRef.current.currentStep = stepId;
      setCurrentStep(stepId);
      
      // Aggiorna context error tracking
      errorTracker.setFormContext(stepId);
    }
  }, []);

  const completeStep = useCallback((stepId: number, fieldsCompleted: string[]) => {
    if (sessionRef.current) {
      const step = sessionRef.current.steps[stepId];
      if (step) {
        step.endTime = Date.now();
        step.duration = step.endTime - step.startTime;
        step.fieldsCompleted = fieldsCompleted;
        
        analytics.trackStepCompleted(stepId, step.name, step.duration);
        
        // Traccia evento A/B testing
        abTesting.trackEvent('step_completed', { stepId, stepName: step.name });
      }
    }
  }, []);

  const trackFieldCompletion = useCallback((fieldName: string) => {
    if (sessionRef.current) {
      const currentStepData = sessionRef.current.steps[currentStep];
      if (currentStepData && !currentStepData.fieldsCompleted.includes(fieldName)) {
        currentStepData.fieldsCompleted.push(fieldName);
      }
    }
  }, [currentStep]);

  const trackFieldError = useCallback((fieldName: string, error: string) => {
    if (sessionRef.current) {
      const currentStepData = sessionRef.current.steps[currentStep];
      if (currentStepData) {
        currentStepData.errors.push({
          field: fieldName,
          error,
          timestamp: Date.now(),
        });
        
        analytics.trackFieldError(fieldName, error, currentStep);
        errorTracker.captureValidationError(fieldName, error, currentStep);
        heatmapTracker.trackFieldError(fieldName);
      }
    }
  }, [currentStep]);

  const trackFieldCorrection = useCallback((fieldName: string, attempts: number) => {
    if (sessionRef.current) {
      const currentStepData = sessionRef.current.steps[currentStep];
      if (currentStepData) {
        currentStepData.corrections.push({
          field: fieldName,
          attempts,
          timestamp: Date.now(),
        });
        
        analytics.trackFieldCorrected(fieldName, attempts);
        heatmapTracker.trackFieldCorrection(fieldName);
      }
    }
  }, [currentStep]);

  const trackEmailCheck = useCallback((exists: boolean, timeMs: number) => {
    analytics.trackEmailCheck(exists, timeMs);
  }, []);

  const trackVatVerification = useCallback((valid: boolean, autoFilled: boolean) => {
    analytics.trackVatVerified(valid, autoFilled);
  }, []);

  const trackConsentChange = useCallback((type: string, value: boolean) => {
    analytics.trackConsentChanged(type, value);
  }, []);

  const completeForm = useCallback((customerId: string, customerType: 'business' | 'individual') => {
    if (sessionRef.current) {
      const session = sessionRef.current;
      session.isCompleted = true;
      session.endTime = Date.now();
      session.totalDuration = session.endTime - session.startTime;
      
      // Completa step corrente
      const currentStepData = session.steps[currentStep];
      if (currentStepData && !currentStepData.endTime) {
        currentStepData.endTime = Date.now();
        currentStepData.duration = currentStepData.endTime - currentStepData.startTime;
      }
      
      // Traccia eventi analytics
      analytics.trackFormSubmitted(customerType, session.totalDuration);
      analytics.trackFormSuccess(customerId, session.totalDuration);
      
      // Traccia conversione A/B testing
      abTesting.trackConversion('form_completed', {
        customerType,
        totalTime: session.totalDuration,
      });
      
      // Ferma heatmap tracking
      heatmapTracker.stop();
      
      // Calcola metriche
      const calculatedMetrics = calculateFunnelMetrics(session);
      setMetrics(calculatedMetrics);
      setIsComplete(true);
      
      // Salva sessione finale
      saveSession(formId, session);
      
      // Pulisci sessione
      clearSession(formId);
    }
  }, [currentStep, formId]);

  const trackFormError = useCallback((error: string) => {
    analytics.trackFormError(error, currentStep);
    
    const errorObj = new Error(error);
    errorTracker.trackFormError(errorObj, currentStep);
  }, [currentStep]);

  const getFunnelData = useCallback(() => {
    return sessionRef.current;
  }, []);

  const cleanupSession = () => {
    if (sessionRef.current && !sessionRef.current.isCompleted) {
      sessionRef.current.isAbandoned = true;
      sessionRef.current.endTime = Date.now();
      sessionRef.current.totalDuration = sessionRef.current.endTime - sessionRef.current.startTime;
      saveSession(formId, sessionRef.current);
    }
    heatmapTracker.stop();
  };

  return {
    currentStep,
    isComplete,
    metrics,
    session: sessionRef.current,
    startStep,
    completeStep,
    trackFieldCompletion,
    trackFieldError,
    trackFieldCorrection,
    trackEmailCheck,
    trackVatVerification,
    trackConsentChange,
    completeForm,
    trackFormError,
    getFunnelData,
  };
}

// Utility per localStorage
const SESSION_PREFIX = 'form_funnel_';

function saveSession(formId: string, session: FunnelSession): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`${SESSION_PREFIX}${formId}`, JSON.stringify(session));
}

function loadSession(formId: string): FunnelSession | null {
  if (typeof window === 'undefined') return null;
  
  const saved = localStorage.getItem(`${SESSION_PREFIX}${formId}`);
  if (saved) {
    return JSON.parse(saved) as FunnelSession;
  }
  return null;
}

function clearSession(formId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`${SESSION_PREFIX}${formId}`);
}

// Calcola metriche del funnel
function calculateFunnelMetrics(session: FunnelSession): FunnelMetrics {
  const totalSteps = session.steps.length;
  const completedSteps = session.steps.filter((s) => s.endTime).length;
  
  const stepMetrics = session.steps.map((step, index) => {
    const nextStep = session.steps[index + 1];
    const usersReached = index === 0 ? 1 : session.steps[index - 1]?.fieldsCompleted.length || 0;
    const usersCompleted = step.fieldsCompleted.length;
    
    return {
      step: index,
      completionRate: usersReached > 0 ? (usersCompleted / usersReached) * 100 : 0,
      avgDuration: step.duration,
      dropOffRate: nextStep ? 100 - ((nextStep.fieldsCompleted.length / usersCompleted) * 100) : 0,
    };
  });

  const totalErrors = session.steps.reduce((sum, step) => sum + step.errors.length, 0);
  const totalFields = session.steps.reduce((sum, step) => sum + step.fieldsCompleted.length, 0);

  return {
    conversionRate: session.isCompleted ? 100 : 0,
    avgTimePerStep: totalSteps > 0 ? session.totalDuration / totalSteps : 0,
    totalTime: session.totalDuration,
    dropOffRate: completedSteps > 0 ? (1 - completedSteps / totalSteps) * 100 : 0,
    errorRate: totalFields > 0 ? (totalErrors / totalFields) * 100 : 0,
    stepMetrics,
  };
}

// Hook per metriche aggregate
export function useFunnelMetrics(formId: string = 'default-form') {
  const [allSessions, setAllSessions] = useState<FunnelSession[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const sessions: FunnelSession[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(SESSION_PREFIX)) {
        const session = JSON.parse(localStorage.getItem(key) || '{}');
        sessions.push(session);
      }
    }
    setAllSessions(sessions);
  }, [formId]);

  const aggregateMetrics = {
    totalSessions: allSessions.length,
    completedSessions: allSessions.filter((s) => s.isCompleted).length,
    abandonedSessions: allSessions.filter((s) => s.isAbandoned).length,
    conversionRate: allSessions.length > 0 
      ? (allSessions.filter((s) => s.isCompleted).length / allSessions.length) * 100 
      : 0,
    avgCompletionTime: allSessions
      .filter((s) => s.isCompleted)
      .reduce((sum, s) => sum + s.totalDuration, 0) / allSessions.filter((s) => s.isCompleted).length || 0,
    deviceBreakdown: allSessions.reduce((acc, s) => {
      acc[s.device] = (acc[s.device] || 0) + 1;
      return acc;
    }, {} as Record<DeviceType, number>),
    entryPointBreakdown: allSessions.reduce((acc, s) => {
      acc[s.entryPoint] = (acc[s.entryPoint] || 0) + 1;
      return acc;
    }, {} as Record<EntryPoint, number>),
  };

  return {
    sessions: allSessions,
    metrics: aggregateMetrics,
  };
}

// Tipi esportati
export type {
  EntryPoint,
  DeviceType,
  BrowserType,
  FunnelStep,
  FunnelSession,
  FunnelMetrics,
};
