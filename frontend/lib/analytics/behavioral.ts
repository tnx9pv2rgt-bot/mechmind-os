/**
 * Behavioral Analytics Tracker
 * Traccia rage clicks, hesitation, field corrections e altre metriche UX
 * Privacy-compliant: nessun PII nei dati behavioral
 */

// ============================================
// TYPES
// ============================================

export interface RageClickEvent {
  element: string;
  count: number;
  timestamp: number;
  xpath?: string;
}

export interface MousePosition {
  x: number;
  y: number;
  timestamp: number;
}

export interface ScrollData {
  depth: number;
  timestamp: number;
}

export interface BehavioralMetrics {
  /** Rage clicks: clicca 3+ volte nello stesso elemento in 1 secondo */
  rageClicks: RageClickEvent[];
  
  /** Hesitation time: tempo tra focus e primo input (ms) */
  hesitationTimes: Record<string, number>;
  
  /** Field corrections: quante volte l'utente modifica un campo */
  fieldCorrections: Record<string, number>;
  
  /** Mouse heatmap data (throttled) */
  mousePositions: MousePosition[];
  
  /** Scroll depth tracking */
  scrollData: ScrollData[];
  maxScrollDepth: number;
  
  /** Time to complete each field */
  fieldCompletionTimes: Record<string, number>;
  
  /** Error clicks: click su elementi non interattivi */
  errorClicks: Array<{
    x: number;
    y: number;
    timestamp: number;
  }>;
  
  /** Form abandonment risk factors */
  sessionStartTime: number;
  lastActivityTime: number;
  totalPauses: number;
}

export type AbandonmentRisk = 'low' | 'medium' | 'high';

export interface TrackingConfig {
  /** Throttle time per mouse move (ms) */
  mouseThrottleMs: number;
  /** Batch sending interval (ms) */
  batchIntervalMs: number;
  /** Rage click threshold (clicks in 1s) */
  rageClickThreshold: number;
  /** High hesitation threshold (ms) */
  highHesitationMs: number;
  /** Repeated correction threshold */
  correctionThreshold: number;
  /** Abandonment check interval (ms) */
  abandonmentCheckMs: number;
  /** Local storage key for offline backup */
  storageKey: string;
  /** Max offline events to store */
  maxOfflineEvents: number;
  /** Privacy mode - se true, non traccia posizioni precise */
  privacyMode: boolean;
}

// ============================================
// DEFAULT CONFIG
// ============================================

const DEFAULT_CONFIG: TrackingConfig = {
  mouseThrottleMs: 100,
  batchIntervalMs: 10000,
  rageClickThreshold: 3,
  highHesitationMs: 3000,
  correctionThreshold: 3,
  abandonmentCheckMs: 5000,
  storageKey: 'behavioral_analytics_backup',
  maxOfflineEvents: 100,
  privacyMode: false,
};

// ============================================
// ANALYTICS INTERFACE (stub per compatibilita)
// ============================================

interface AnalyticsStub {
  track: (event: string, properties?: Record<string, unknown>) => void;
}

declare const analytics: AnalyticsStub;

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Genera un elemento identifier privacy-safe (senza contenuto testuale)
 */
function getElementIdentifier(element: Element): string {
  // Priorita: data-track-id > id > classe > tag
  const trackId = element.getAttribute('data-track-id');
  if (trackId) return `[data-track-id="${trackId}"]`;
  
  const id = element.id;
  if (id) return `#${id}`;
  
  const className = element.className;
  if (className && typeof className === 'string') {
    const classes = className.split(' ').filter(c => c && !c.includes(':')).slice(0, 2);
    if (classes.length) return `.${classes.join('.')}`;
  }
  
  return element.tagName.toLowerCase();
}

/**
 * Ottiene XPath di un elemento (per debugging, opzionale)
 */
function getXPath(element: Element): string {
  const parts: string[] = [];
  let current: Element | null = element;
  
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let index = 1;
    let sibling = current.previousElementSibling;
    
    while (sibling) {
      if (sibling.nodeName === current.nodeName) index++;
      sibling = sibling.previousElementSibling;
    }
    
    const tag = current.nodeName.toLowerCase();
    parts.unshift(index > 1 ? `${tag}[${index}]` : tag);
    current = current.parentElement;
  }
  
  return parts.length ? '/' + parts.join('/') : '';
}

/**
 * Sanitizza dati per privacy (rimuove potenziali PII)
 */
function sanitizeFieldName(fieldName: string): string {
  // Rimuovi valori che potrebbero contenere PII
  return fieldName
    .replace(/email|phone|tel|name|address|ssn|card|password/gi, 'field')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 50);
}

// ============================================
// BEHAVIORAL TRACKER CLASS
// ============================================

export class BehavioralTracker {
  private metrics: BehavioralMetrics;
  private config: TrackingConfig;
  private clickTimestamps: Map<string, number[]> = new Map();
  private fieldStartTimes: Map<string, number> = new Map();
  private fieldFirstInput: Map<string, boolean> = new Map();
  private lastFieldValues: Map<string, string> = new Map();
  private fieldCompletionStart: Map<string, number> = new Map();
  private mouseThrottleTimer: ReturnType<typeof setTimeout> | null = null;
  private batchTimer: ReturnType<typeof setInterval> | null = null;
  private listeners: Array<() => void> = [];
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private currentStep: string = 'unknown';
  private analyticsInstance: AnalyticsStub | null = null;

  constructor(config: Partial<TrackingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    const now = Date.now();
    this.metrics = {
      rageClicks: [],
      hesitationTimes: {},
      fieldCorrections: {},
      mousePositions: [],
      scrollData: [],
      maxScrollDepth: 0,
      fieldCompletionTimes: {},
      errorClicks: [],
      sessionStartTime: now,
      lastActivityTime: now,
      totalPauses: 0,
    };

    if (typeof window !== 'undefined') {
      this.setupOnlineListeners();
      this.loadOfflineData();
    }
  }

  // ============================================
  // SETUP & CLEANUP
  // ============================================

  private setupOnlineListeners(): void {
    const handleOnline = () => {
      this.isOnline = true;
      this.flushOfflineData();
    };
    
    const handleOffline = () => {
      this.isOnline = false;
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    this.listeners.push(() => window.removeEventListener('online', handleOnline));
    this.listeners.push(() => window.removeEventListener('offline', handleOffline));
  }

  setAnalyticsInstance(instance: AnalyticsStub): void {
    this.analyticsInstance = instance;
  }

  setCurrentStep(step: string): void {
    this.currentStep = step;
  }

  destroy(): void {
    this.listeners.forEach(cleanup => cleanup());
    this.listeners = [];
    
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
    
    if (this.mouseThrottleTimer) {
      clearTimeout(this.mouseThrottleTimer);
      this.mouseThrottleTimer = null;
    }
  }

  // ============================================
  // LOCAL STORAGE BACKUP
  // ============================================

  private saveOfflineData(): void {
    try {
      const data = {
        metrics: this.metrics,
        timestamp: Date.now(),
      };
      localStorage.setItem(this.config.storageKey, JSON.stringify(data));
    } catch {
      // Silent fail in private mode o storage pieno
    }
  }

  private loadOfflineData(): void {
    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.metrics) {
          this.metrics.rageClicks = [...data.metrics.rageClicks || [], ...this.metrics.rageClicks];
          this.metrics.errorClicks = [...data.metrics.errorClicks || [], ...this.metrics.errorClicks];
        }
      }
    } catch {
      // Silent fail
    }
  }

  private clearOfflineData(): void {
    try {
      localStorage.removeItem(this.config.storageKey);
    } catch {
      // Silent fail
    }
  }

  private async flushOfflineData(): Promise<void> {
    if (!this.isOnline) return;
    
    const stored = localStorage.getItem(this.config.storageKey);
    if (!stored) return;

    try {
      const data = JSON.parse(stored);
      await this.sendBatch(data.metrics, true);
      this.clearOfflineData();
    } catch {
      // Retry next time
    }
  }

  // ============================================
  // RAGE CLICKS
  // ============================================

  trackClick(element: string | Element, event?: MouseEvent): void {
    const now = Date.now();
    this.metrics.lastActivityTime = now;
    
    const elementId = typeof element === 'string' 
      ? element 
      : getElementIdentifier(element);
    
    const timestamps = this.clickTimestamps.get(elementId) || [];
    timestamps.push(now);
    
    // Mantieni solo click dell'ultimo secondo
    const recent = timestamps.filter(t => now - t < 1000);
    this.clickTimestamps.set(elementId, recent);
    
    // Rage click detected
    if (recent.length >= this.config.rageClickThreshold) {
      const rageEvent: RageClickEvent = {
        element: elementId,
        count: recent.length,
        timestamp: now,
        xpath: typeof element !== 'string' ? getXPath(element) : undefined,
      };
      
      this.metrics.rageClicks.push(rageEvent);
      
      // Limita array per memoria
      if (this.metrics.rageClicks.length > 50) {
        this.metrics.rageClicks = this.metrics.rageClicks.slice(-50);
      }
      
      this.track('Rage Click Detected', {
        element: elementId,
        count: recent.length,
        step: this.currentStep,
      });
    }

    // Track error click (click su elemento non interattivo)
    if (event && this.isErrorClick(event)) {
      this.metrics.errorClicks.push({
        x: event.clientX,
        y: event.clientY,
        timestamp: now,
      });
      
      if (this.metrics.errorClicks.length > 50) {
        this.metrics.errorClicks = this.metrics.errorClicks.slice(-50);
      }
    }
  }

  private isErrorClick(event: MouseEvent): boolean {
    const target = event.target as Element;
    if (!target) return false;
    
    const interactiveTags = ['a', 'button', 'input', 'textarea', 'select', 'label'];
    const tagName = target.tagName?.toLowerCase();
    
    if (!tagName || !interactiveTags.includes(tagName)) {
      const hasClickHandler = target.hasAttribute('onclick') || 
        target.hasAttribute('data-clickable');
      return !hasClickHandler;
    }
    
    return false;
  }

  // ============================================
  // HESITATION TRACKING
  // ============================================

  trackFieldFocus(fieldName: string): void {
    const sanitizedName = sanitizeFieldName(fieldName);
    const now = Date.now();
    
    this.fieldStartTimes.set(sanitizedName, now);
    this.fieldFirstInput.set(sanitizedName, false);
    this.fieldCompletionStart.set(sanitizedName, now);
    this.metrics.lastActivityTime = now;
  }

  trackFieldFirstInput(fieldName: string): void {
    const sanitizedName = sanitizeFieldName(fieldName);
    const alreadyInput = this.fieldFirstInput.get(sanitizedName);
    
    if (alreadyInput) return;
    
    const startTime = this.fieldStartTimes.get(sanitizedName);
    if (!startTime) return;
    
    const now = Date.now();
    const hesitation = now - startTime;
    
    this.metrics.hesitationTimes[sanitizedName] = hesitation;
    this.fieldFirstInput.set(sanitizedName, true);
    this.metrics.lastActivityTime = now;
    
    if (hesitation > this.config.highHesitationMs) {
      this.track('High Hesitation Detected', {
        field: sanitizedName,
        hesitationMs: hesitation,
        step: this.currentStep,
      });
    }
  }

  trackFieldBlur(fieldName: string): void {
    const sanitizedName = sanitizeFieldName(fieldName);
    const startTime = this.fieldCompletionStart.get(sanitizedName);
    
    if (startTime) {
      const duration = Date.now() - startTime;
      this.metrics.fieldCompletionTimes[sanitizedName] = duration;
      this.metrics.lastActivityTime = Date.now();
    }
    
    this.fieldStartTimes.delete(sanitizedName);
    this.fieldFirstInput.delete(sanitizedName);
    this.fieldCompletionStart.delete(sanitizedName);
  }

  // ============================================
  // FIELD CORRECTIONS
  // ============================================

  trackFieldChange(fieldName: string, value: string): void {
    const sanitizedName = sanitizeFieldName(fieldName);
    const lastValue = this.lastFieldValues.get(sanitizedName);
    
    if (lastValue && lastValue !== value && lastValue.length > 0) {
      const similarity = this.calculateSimilarity(lastValue, value);
      
      if (similarity < 0.8) {
        const currentCorrections = this.metrics.fieldCorrections[sanitizedName] || 0;
        this.metrics.fieldCorrections[sanitizedName] = currentCorrections + 1;
        
        if (currentCorrections + 1 >= this.config.correctionThreshold) {
          this.track('Repeated Field Correction', {
            field: sanitizedName,
            correctionCount: currentCorrections + 1,
            step: this.currentStep,
          });
        }
      }
    }
    
    this.lastFieldValues.set(sanitizedName, value);
    this.metrics.lastActivityTime = Date.now();
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  // ============================================
  // MOUSE TRACKING (HEATMAP)
  // ============================================

  trackMouseMove(x: number, y: number): void {
    if (this.mouseThrottleTimer) return;
    
    this.mouseThrottleTimer = setTimeout(() => {
      this.mouseThrottleTimer = null;
    }, this.config.mouseThrottleMs);
    
    const finalX = this.config.privacyMode ? Math.round(x / 10) * 10 : x;
    const finalY = this.config.privacyMode ? Math.round(y / 10) * 10 : y;
    
    this.metrics.mousePositions.push({
      x: finalX,
      y: finalY,
      timestamp: Date.now(),
    });
    
    if (this.metrics.mousePositions.length > 500) {
      this.metrics.mousePositions = this.metrics.mousePositions
        .filter((_, i) => i % 2 === 0)
        .slice(-250);
    }
  }

  // ============================================
  // SCROLL TRACKING
  // ============================================

  trackScroll(depthPercent: number): void {
    const depth = Math.min(100, Math.max(0, depthPercent));
    
    if (depth > this.metrics.maxScrollDepth) {
      this.metrics.maxScrollDepth = depth;
    }
    
    const lastDepth = this.metrics.scrollData[this.metrics.scrollData.length - 1]?.depth || 0;
    if (Math.abs(depth - lastDepth) >= 10) {
      this.metrics.scrollData.push({
        depth,
        timestamp: Date.now(),
      });
      
      if (this.metrics.scrollData.length > 20) {
        this.metrics.scrollData = this.metrics.scrollData.slice(-10);
      }
    }
  }

  // ============================================
  // ABANDONMENT RISK
  // ============================================

  getAbandonmentRisk(): AbandonmentRisk {
    const rageClickCount = this.metrics.rageClicks.length;
    const highHesitationCount = Object.values(this.metrics.hesitationTimes)
      .filter(t => t > 5000).length;
    const manyCorrections = Object.values(this.metrics.fieldCorrections)
      .filter(c => c >= this.config.correctionThreshold).length;
    const errorClickCount = this.metrics.errorClicks.length;
    
    const idleTime = Date.now() - this.metrics.lastActivityTime;
    const isIdle = idleTime > 30000;

    if (
      rageClickCount >= 2 ||
      highHesitationCount >= 2 ||
      manyCorrections >= 2 ||
      errorClickCount >= 3 ||
      (isIdle && rageClickCount > 0)
    ) {
      return 'high';
    }
    
    if (
      rageClickCount > 0 ||
      highHesitationCount > 0 ||
      errorClickCount > 0 ||
      isIdle
    ) {
      return 'medium';
    }
    
    return 'low';
  }

  getAbandonmentScore(): number {
    let score = 0;
    
    score += Math.min(30, this.metrics.rageClicks.length * 10);
    
    const highHesitation = Object.values(this.metrics.hesitationTimes)
      .filter(t => t > 5000).length;
    score += Math.min(25, highHesitation * 8);
    
    const manyCorrections = Object.values(this.metrics.fieldCorrections)
      .filter(c => c >= this.config.correctionThreshold).length;
    score += Math.min(25, manyCorrections * 8);
    
    score += Math.min(20, this.metrics.errorClicks.length * 5);
    
    return Math.min(100, score);
  }

  // ============================================
  // BATCH SENDING
  // ============================================

  startBatchSending(endpoint: string, formId: string): void {
    if (this.batchTimer) return;
    
    this.batchTimer = setInterval(() => {
      this.sendBatchToEndpoint(endpoint, formId);
    }, this.config.batchIntervalMs);
  }

  stopBatchSending(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
  }

  private async sendBatchToEndpoint(endpoint: string, formId: string): Promise<void> {
    const metrics = this.exportMetrics();
    
    if (this.isMetricsEmpty(metrics)) return;
    
    await this.sendBatch(metrics, false, endpoint, formId);
  }

  private async sendBatch(
    metrics: BehavioralMetrics,
    isOfflineFlush: boolean,
    endpoint?: string,
    formId?: string
  ): Promise<void> {
    if (!this.isOnline && !isOfflineFlush) {
      this.saveOfflineData();
      return;
    }
    
    try {
      const payload = {
        formId,
        metrics: this.sanitizeMetrics(metrics),
        sessionDuration: Date.now() - this.metrics.sessionStartTime,
        timestamp: Date.now(),
        isOfflineFlush,
      };
      
      if (endpoint) {
        await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        });
      }
      
      this.track('Behavioral Metrics Batch', {
        rageClicks: metrics.rageClicks.length,
        highHesitation: Object.values(metrics.hesitationTimes).filter(t => t > 3000).length,
        corrections: Object.keys(metrics.fieldCorrections).length,
        maxScrollDepth: metrics.maxScrollDepth,
      });
    } catch {
      if (!isOfflineFlush) {
        this.saveOfflineData();
      }
    }
  }

  private sanitizeMetrics(metrics: BehavioralMetrics): Partial<BehavioralMetrics> {
    return {
      rageClicks: metrics.rageClicks,
      hesitationTimes: metrics.hesitationTimes,
      fieldCorrections: metrics.fieldCorrections,
      scrollData: metrics.scrollData,
      maxScrollDepth: metrics.maxScrollDepth,
      fieldCompletionTimes: metrics.fieldCompletionTimes,
      errorClicks: metrics.errorClicks,
      totalPauses: metrics.totalPauses,
    };
  }

  private isMetricsEmpty(metrics: BehavioralMetrics): boolean {
    return (
      metrics.rageClicks.length === 0 &&
      Object.keys(metrics.hesitationTimes).length === 0 &&
      Object.keys(metrics.fieldCorrections).length === 0 &&
      metrics.mousePositions.length === 0 &&
      metrics.errorClicks.length === 0
    );
  }

  // ============================================
  // ANALYTICS INTEGRATION
  // ============================================

  private track(event: string, properties?: Record<string, unknown>): void {
    const analytics = this.analyticsInstance || 
      (typeof window !== 'undefined' && (window as unknown as { analytics?: AnalyticsStub }).analytics);
    
    if (analytics?.track) {
      analytics.track(event, properties);
    }
  }

  // ============================================
  // EXPORT
  // ============================================

  exportMetrics(): BehavioralMetrics {
    return { ...this.metrics };
  }

  getSummary(): Record<string, unknown> {
    return {
      rageClicks: this.metrics.rageClicks.length,
      fieldsWithHighHesitation: Object.entries(this.metrics.hesitationTimes)
        .filter(([, t]) => t > 3000)
        .map(([f]) => f),
      fieldsWithCorrections: this.metrics.fieldCorrections,
      maxScrollDepth: this.metrics.maxScrollDepth,
      errorClicks: this.metrics.errorClicks.length,
      abandonmentRisk: this.getAbandonmentRisk(),
      abandonmentScore: this.getAbandonmentScore(),
      sessionDuration: Date.now() - this.metrics.sessionStartTime,
    };
  }

  reset(): void {
    const now = Date.now();
    this.metrics = {
      rageClicks: [],
      hesitationTimes: {},
      fieldCorrections: {},
      mousePositions: [],
      scrollData: [],
      maxScrollDepth: 0,
      fieldCompletionTimes: {},
      errorClicks: [],
      sessionStartTime: now,
      lastActivityTime: now,
      totalPauses: 0,
    };
    
    this.clickTimestamps.clear();
    this.fieldStartTimes.clear();
    this.fieldFirstInput.clear();
    this.lastFieldValues.clear();
    this.fieldCompletionStart.clear();
    
    this.clearOfflineData();
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const behavioralTracker = new BehavioralTracker();

// ============================================
// TYPE DECLARATIONS
// ============================================

declare global {
  interface Window {
    behavioralTracker?: BehavioralTracker;
  }
}

// Espone per debugging (solo development)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.behavioralTracker = behavioralTracker;
}
