/**
 * Segment/Mixpanel Analytics Integration
 * 
 * Questo modulo fornisce un'interfaccia unificata per tracciare eventi
 * con Segment (che può inoltrare a Mixpanel, Google Analytics, ecc.)
 */

// Tipi per gli eventi di analytics
type EventProperties = Record<string, unknown>;

type UserTraits = {
  email?: string;
  name?: string;
  customerType?: 'business' | 'individual';
  company?: string;
  phone?: string;
  [key: string]: unknown;
};

type FormEventProperties = {
  'Form Started'?: Record<string, never>;
  'Step Completed'?: {
    step: number;
    stepName: string;
    timeSpent: number;
  };
  'Step Abandoned'?: {
    step: number;
    lastField: string;
    timeSpent: number;
  };
  'Field Error'?: {
    field: string;
    error: string;
    step: number;
  };
  'Field Corrected'?: {
    field: string;
    attempts: number;
  };
  'Email Check'?: {
    exists: boolean;
    timeMs: number;
  };
  'P.IVA Verified'?: {
    valid: boolean;
    autoFilled: boolean;
  };
  'Consent Changed'?: {
    type: 'marketing' | 'terms' | 'privacy' | string;
    value: boolean;
  };
  'Form Submitted'?: {
    customerType: 'business' | 'individual';
    totalTime: number;
  };
  'Form Success'?: {
    customerId: string;
    timeToComplete: number;
  };
  'Form Error'?: {
    error: string;
    step: number;
  };
  'Exit Intent Shown'?: Record<string, never>;
  'Form Resumed'?: {
    afterHours: number;
  };
};

type FormEventName = keyof FormEventProperties;

// Interfaccia per il provider di analytics
interface AnalyticsProvider {
  identify: (userId: string, traits?: UserTraits) => void;
  track: (event: string, properties?: EventProperties) => void;
  page: (name?: string, properties?: EventProperties) => void;
  group: (groupId: string, traits?: EventProperties) => void;
  reset: () => void;
  ready?: (callback: () => void) => void;
}

// Provider di fallback (console) per sviluppo
const consoleProvider: AnalyticsProvider = {
  identify: (userId, traits) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics] Identify:', { userId, traits });
    }
  },
  track: (event, properties) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics] Track:', { event, properties });
    }
  },
  page: (name, properties) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics] Page:', { name, properties });
    }
  },
  group: (groupId, traits) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics] Group:', { groupId, traits });
    }
  },
  reset: () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics] Reset');
    }
  },
};

// Provider Segment.js
class SegmentProvider implements AnalyticsProvider {
  private analytics: any;

  constructor() {
    this.analytics = (typeof window !== 'undefined' && (window as any).analytics) || null;
  }

  identify(userId: string, traits?: UserTraits): void {
    if (this.analytics) {
      this.analytics.identify(userId, traits);
    }
  }

  track(event: string, properties?: EventProperties): void {
    if (this.analytics) {
      this.analytics.track(event, properties);
    }
  }

  page(name?: string, properties?: EventProperties): void {
    if (this.analytics) {
      this.analytics.page(name, properties);
    }
  }

  group(groupId: string, traits?: EventProperties): void {
    if (this.analytics) {
      this.analytics.group(groupId, traits);
    }
  }

  reset(): void {
    if (this.analytics) {
      this.analytics.reset();
    }
  }

  ready(callback: () => void): void {
    if (this.analytics) {
      this.analytics.ready(callback);
    }
  }
}

// Provider Mixpanel
class MixpanelProvider implements AnalyticsProvider {
  private mixpanel: any;

  constructor() {
    this.mixpanel = (typeof window !== 'undefined' && (window as any).mixpanel) || null;
  }

  identify(userId: string, traits?: UserTraits): void {
    if (this.mixpanel) {
      this.mixpanel.identify(userId);
      if (traits) {
        this.mixpanel.people.set(traits);
      }
    }
  }

  track(event: string, properties?: EventProperties): void {
    if (this.mixpanel) {
      this.mixpanel.track(event, properties);
    }
  }

  page(name?: string, properties?: EventProperties): void {
    if (this.mixpanel) {
      this.mixpanel.track('Page Viewed', { page: name, ...properties });
    }
  }

  group(groupId: string, traits?: EventProperties): void {
    if (this.mixpanel) {
      this.mixpanel.set_group('Company', groupId, traits);
    }
  }

  reset(): void {
    if (this.mixpanel) {
      this.mixpanel.reset();
    }
  }
}

// Classe principale Analytics
class Analytics {
  private providers: AnalyticsProvider[] = [];
  private userId: string | null = null;
  private sessionId: string;
  private queue: Array<{ method: string; args: unknown[] }> = [];
  private isReady = false;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initProviders();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private initProviders(): void {
    // Inizializza i provider basati sulla configurazione
    const useSegment = process.env.NEXT_PUBLIC_SEGMENT_WRITE_KEY;
    const useMixpanel = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;

    if (useSegment) {
      this.providers.push(new SegmentProvider());
    }

    if (useMixpanel) {
      this.providers.push(new MixpanelProvider());
    }

    // Sempre aggiungi console provider in development
    if (process.env.NODE_ENV === 'development' || this.providers.length === 0) {
      this.providers.push(consoleProvider);
    }

    // Processa la coda dopo l'inizializzazione
    setTimeout(() => {
      this.isReady = true;
      this.processQueue();
    }, 100);
  }

  private processQueue(): void {
    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (item) {
        const method = (this as any)[item.method];
        if (typeof method === 'function') {
          method.apply(this, item.args);
        }
      }
    }
  }

  private addToQueue(method: string, args: unknown[]): void {
    if (!this.isReady) {
      this.queue.push({ method, args });
      return;
    }
  }

  // Metodi pubblici
  identify(userId: string, traits?: UserTraits): void {
    if (!this.isReady) {
      this.addToQueue('identify', [userId, traits]);
      return;
    }

    this.userId = userId;
    
    const enrichedTraits = {
      ...traits,
      sessionId: this.sessionId,
      environment: process.env.NODE_ENV,
    };

    this.providers.forEach(provider => {
      provider.identify(userId, enrichedTraits);
    });

    // Salva nel localStorage per tracking cross-session
    if (typeof window !== 'undefined') {
      localStorage.setItem('analytics_user_id', userId);
      localStorage.setItem('analytics_traits', JSON.stringify(enrichedTraits));
    }
  }

  track<T extends string>(event: T, properties?: EventProperties): void {
    if (!this.isReady) {
      this.addToQueue('track', [event, properties]);
      return;
    }

    const enrichedProperties = {
      ...properties,
      sessionId: this.sessionId,
      userId: this.userId,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      referrer: typeof document !== 'undefined' ? document.referrer : '',
    };

    this.providers.forEach(provider => {
      provider.track(event, enrichedProperties);
    });
  }

  page(name?: string, properties?: EventProperties): void {
    if (!this.isReady) {
      this.addToQueue('page', [name, properties]);
      return;
    }

    const enrichedProperties = {
      ...properties,
      sessionId: this.sessionId,
      userId: this.userId,
      title: typeof document !== 'undefined' ? document.title : '',
      path: typeof window !== 'undefined' ? window.location.pathname : '',
    };

    this.providers.forEach(provider => {
      provider.page(name, enrichedProperties);
    });
  }

  group(groupId: string, traits?: EventProperties): void {
    if (!this.isReady) {
      this.addToQueue('group', [groupId, traits]);
      return;
    }

    this.providers.forEach(provider => {
      provider.group(groupId, traits);
    });
  }

  reset(): void {
    this.userId = null;
    this.sessionId = this.generateSessionId();
    
    this.providers.forEach(provider => {
      provider.reset();
    });

    if (typeof window !== 'undefined') {
      localStorage.removeItem('analytics_user_id');
      localStorage.removeItem('analytics_traits');
    }
  }

  // Metodi specifici per il form
  trackFormEvent<T extends FormEventName>(
    event: T,
    properties?: FormEventProperties[T]
  ): void {
    this.track(event, properties as EventProperties);
  }

  // Tracking automatico del funnel del form
  trackStepCompleted(step: number, stepName: string, timeSpent: number): void {
    this.trackFormEvent('Step Completed', {
      step,
      stepName,
      timeSpent: Math.round(timeSpent),
    });
  }

  trackStepAbandoned(step: number, lastField: string, timeSpent: number): void {
    this.trackFormEvent('Step Abandoned', {
      step,
      lastField,
      timeSpent: Math.round(timeSpent),
    });
  }

  trackFieldError(field: string, error: string, step: number): void {
    this.trackFormEvent('Field Error', {
      field,
      error,
      step,
    });
  }

  trackFieldCorrected(field: string, attempts: number): void {
    this.trackFormEvent('Field Corrected', {
      field,
      attempts,
    });
  }

  trackEmailCheck(exists: boolean, timeMs: number): void {
    this.trackFormEvent('Email Check', {
      exists,
      timeMs: Math.round(timeMs),
    });
  }

  trackVatVerified(valid: boolean, autoFilled: boolean): void {
    this.trackFormEvent('P.IVA Verified', {
      valid,
      autoFilled,
    });
  }

  trackConsentChanged(type: string, value: boolean): void {
    this.trackFormEvent('Consent Changed', {
      type,
      value,
    });
  }

  trackFormSubmitted(customerType: 'business' | 'individual', totalTime: number): void {
    this.trackFormEvent('Form Submitted', {
      customerType,
      totalTime: Math.round(totalTime),
    });
  }

  trackFormSuccess(customerId: string, timeToComplete: number): void {
    this.trackFormEvent('Form Success', {
      customerId,
      timeToComplete: Math.round(timeToComplete),
    });
  }

  trackFormError(error: string, step: number): void {
    this.trackFormEvent('Form Error', {
      error,
      step,
    });
  }

  trackExitIntent(): void {
    this.trackFormEvent('Exit Intent Shown', {});
  }

  trackFormResumed(afterHours: number): void {
    this.trackFormEvent('Form Resumed', {
      afterHours: Math.round(afterHours),
    });
  }

  // Utility
  getSessionId(): string {
    return this.sessionId;
  }

  getUserId(): string | null {
    return this.userId;
  }

  // Ripristina sessione precedente
  restoreSession(): void {
    if (typeof window === 'undefined') return;

    const savedUserId = localStorage.getItem('analytics_user_id');
    const savedTraits = localStorage.getItem('analytics_traits');

    if (savedUserId) {
      const traits = savedTraits ? JSON.parse(savedTraits) : undefined;
      this.identify(savedUserId, traits);
    }
  }
}

// Esporta singleton
export const analytics = new Analytics();

// Hook per React
export function useAnalytics() {
  return analytics;
}

// Tipi esportati
export type { 
  EventProperties, 
  UserTraits, 
  FormEventProperties, 
  FormEventName,
  AnalyticsProvider 
};

// Inizializzazione script Segment
export function getSegmentScript(writeKey: string): string {
  return `
    !function(){
      var analytics=window.analytics=window.analytics||[];
      if(!analytics.initialize)
        if(analytics.invoked)window.console&&console.error&&console.error("Segment snippet included twice.");
        else{
          analytics.invoked=!0;
          analytics.methods=["trackSubmit","trackClick","trackLink","trackForm","pageview","identify","reset","group","track","ready","alias","debug","page","once","off","on","addSourceMiddleware","addIntegrationMiddleware","setAnonymousId","addDestinationMiddleware"];
          analytics.factory=function(e){
            return function(){
              if(window.analytics.initialized)return window.analytics[e].apply(window.analytics,arguments);
              var i=Array.prototype.slice.call(arguments);
              i.unshift(e);
              analytics.push(i);
              return analytics
            }
          };
          for(var i=0;i<analytics.methods.length;i++){
            var key=analytics.methods[i];
            analytics[key]=analytics.factory(key)
          }
          analytics.load=function(key,i){
            var t=document.createElement("script");
            t.type="text/javascript";
            t.async=!0;
            t.src="https://cdn.segment.com/analytics.js/v1/" + key + "/analytics.min.js";
            var n=document.getElementsByTagName("script")[0];
            n.parentNode.insertBefore(t,n);
            analytics._loadOptions=i
          };
          analytics._writeKey="${writeKey}";
          analytics.SNIPPET_VERSION="4.16.1";
          analytics.load("${writeKey}");
        }
    }();
  `;
}

// Inizializzazione script Mixpanel
export function getMixpanelScript(token: string): string {
  return `
    (function(f,b){if(!b.__SV){var e,g,i,h;window.mixpanel=b;b._i=[];b.init=function(e,f,c){function g(a,d){var b=d.split(".");2==b.length&&(a=a[b[0]],d=b[1]);a[d]=function(){a.push([d].concat(Array.prototype.slice.call(arguments,0)))}}var a=b;"undefined"!==typeof c?a=b[c]=[]:c="mixpanel";a.people=a.people||[];a.toString=function(a){var d="mixpanel";"mixpanel"!==c&&(d+="."+c);a||(d+=" (stub)");return d};a.people.toString=function(){return a.toString(1)+".people (stub)"};i="disable time_event track track_pageview track_links track_forms track_with_groups add_group set_group remove_group register register_once alias unregister identify name_tag set_config reset opt_in_tracking opt_out_tracking has_opted_in_tracking has_opted_out_tracking clear_opt_in_out_tracking start_batch_senders people.set people.set_once people.unset people.increment people.append people.union people.track_charge people.clear_charges people.delete_user people.remove".split(" ");
    for(h=0;h<i.length;h++)g(a,i[h]);var j="set set_once union unset remove delete".split(" ");a.get_group=function(){function b(c){d[c]=function(){call2_args=arguments;call2=[c].concat(Array.prototype.slice.call(call2_args,0));a.push([e,call2])}}for(var d={},e=["get_group"].concat(Array.prototype.slice.call(arguments,0)),c=0;c<j.length;c++)b(j[c]);return d};b._i.push([e,f,c])};b.__SV=1.2;e=f.createElement("script");e.type="text/javascript";e.async=!0;e.src="undefined"!==typeof MIXPANEL_CUSTOM_LIB_URL?MIXPANEL_CUSTOM_LIB_URL:"file:"===f.location.protocol&&"//cdn.mxpnl.com/libs/mixpanel-2-latest.min.js".match(/^\/\//)?"https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js":"//cdn.mxpnl.com/libs/mixpanel-2-latest.min.js";g=f.getElementsByTagName("script")[0];g.parentNode.insertBefore(e,g)}})(document,window.mixpanel||[]);
    mixpanel.init("${token}", {batch_requests: true});
  `;
}
