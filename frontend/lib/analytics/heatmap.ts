/**
 * Heatmap Analytics Module
 * 
 * Traccia interazioni utente dettagliate per heatmap e analisi comportamentale
 */

// Tipi per i dati heatmap
interface HeatmapPoint {
  x: number;
  y: number;
  timestamp: number;
  element?: string;
  type: 'click' | 'move' | 'scroll' | 'focus' | 'hover';
  value?: number;
}

interface FieldInteraction {
  fieldName: string;
  fieldType: string;
  clicks: number;
  hovers: number;
  focusTime: number;
  focusEvents: Array<{ start: number; end: number }>;
  firstInteraction?: number;
  lastInteraction?: number;
  errors: number;
  corrections: number;
}

interface ScrollData {
  depth: number;
  timestamp: number;
  direction: 'up' | 'down';
  speed: number;
}

interface HeatmapSession {
  sessionId: string;
  startTime: number;
  endTime?: number;
  points: HeatmapPoint[];
  fieldInteractions: Map<string, FieldInteraction>;
  scrollData: ScrollData[];
  viewport: { width: number; height: number };
  deviceType: 'mobile' | 'tablet' | 'desktop';
}

// Classe HeatmapTracker
class HeatmapTracker {
  private session: HeatmapSession;
  private isTracking = false;
  private currentFocus: { field: string; startTime: number } | null = null;
  private lastScrollY = 0;
  private lastScrollTime = 0;
  private throttleTimer: ReturnType<typeof setTimeout> | null = null;
  private observers: (() => void)[] = [];
  private batchSize = 50;
  private batch: HeatmapPoint[] = [];
  private flushInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.session = this.createNewSession();
    this.detectDeviceType();
  }

  private createNewSession(): HeatmapSession {
    const sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    return {
      sessionId,
      startTime: Date.now(),
      points: [],
      fieldInteractions: new Map(),
      scrollData: [],
      viewport: {
        width: typeof window !== 'undefined' ? window.innerWidth : 0,
        height: typeof window !== 'undefined' ? window.innerHeight : 0,
      },
      deviceType: 'desktop',
    };
  }

  private detectDeviceType(): void {
    if (typeof window === 'undefined') return;

    const width = window.innerWidth;
    if (width < 768) {
      this.session.deviceType = 'mobile';
    } else if (width < 1024) {
      this.session.deviceType = 'tablet';
    } else {
      this.session.deviceType = 'desktop';
    }
  }

  // Inizia il tracking
  start(): void {
    if (typeof window === 'undefined' || this.isTracking) return;

    this.isTracking = true;
    this.setupEventListeners();
    this.startBatchFlush();
  }

  // Ferma il tracking
  stop(): void {
    if (!this.isTracking) return;

    this.isTracking = false;
    this.cleanup();
    this.flushBatch();
  }

  // Configura event listeners
  private setupEventListeners(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    // Click tracking con throttling
    const clickHandler = this.throttle((e: MouseEvent) => {
      this.trackClick(e.clientX, e.clientY, e.target as Element);
    }, 50);

    document.addEventListener('click', clickHandler, { capture: true });
    this.observers.push(() => document.removeEventListener('click', clickHandler, { capture: true }));

    // Mouse movement tracking (throttled)
    const moveHandler = this.throttle((e: MouseEvent) => {
      this.trackMouseMove(e.clientX, e.clientY);
    }, 100);

    document.addEventListener('mousemove', moveHandler);
    this.observers.push(() => document.removeEventListener('mousemove', moveHandler));

    // Scroll tracking
    const scrollHandler = this.throttle(() => {
      this.trackScroll();
    }, 100);

    window.addEventListener('scroll', scrollHandler);
    this.observers.push(() => window.removeEventListener('scroll', scrollHandler));

    // Focus tracking su form fields
    const focusHandler = (e: FocusEvent) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      if (this.isFormField(target)) {
        this.trackFieldFocus(target);
      }
    };

    const blurHandler = (e: FocusEvent) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      if (this.isFormField(target)) {
        this.trackFieldBlur(target);
      }
    };

    document.addEventListener('focusin', focusHandler);
    document.addEventListener('focusout', blurHandler);
    this.observers.push(() => {
      document.removeEventListener('focusin', focusHandler);
      document.removeEventListener('focusout', blurHandler);
    });

    // Hover tracking su elementi importanti
    const hoverHandler = this.throttle((e: MouseEvent) => {
      const target = e.target as Element;
      if (this.isImportantElement(target)) {
        this.trackHover(target);
      }
    }, 200);

    document.addEventListener('mouseover', hoverHandler);
    this.observers.push(() => document.removeEventListener('mouseover', hoverHandler));

    // Intersection Observer per visibilità elementi
    this.setupIntersectionObserver();
  }

  private setupIntersectionObserver(): void {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.addPoint({
              x: entry.boundingClientRect.left,
              y: entry.boundingClientRect.top,
              timestamp: Date.now(),
              element: this.getElementSelector(entry.target),
              type: 'scroll',
              value: entry.intersectionRatio,
            });
          }
        });
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    // Osserva tutti i form fields e elementi importanti
    const elements = document.querySelectorAll(
      'input, textarea, select, button, [data-track="true"]'
    );
    elements.forEach((el) => observer.observe(el));

    this.observers.push(() => observer.disconnect());
  }

  private isFormField(element: Element): boolean {
    const tagName = element.tagName.toLowerCase();
    return tagName === 'input' || tagName === 'textarea' || tagName === 'select';
  }

  private isImportantElement(element: Element): boolean {
    const selector = this.getElementSelector(element);
    return (
      selector.includes('button') ||
      selector.includes('input') ||
      selector.includes('[data-track]') ||
      element.getAttribute('data-track') === 'true'
    );
  }

  // Tracking metodi
  private trackClick(x: number, y: number, target: Element): void {
    const elementSelector = this.getElementSelector(target);
    
    this.addPoint({
      x,
      y,
      timestamp: Date.now(),
      element: elementSelector,
      type: 'click',
      value: 1,
    });

    // Traccia interazione campo se è un form field
    if (this.isFormField(target)) {
      const fieldName = this.getFieldName(target);
      this.incrementFieldInteraction(fieldName, 'clicks', target);
    }
  }

  private trackMouseMove(x: number, y: number): void {
    this.addPoint({
      x,
      y,
      timestamp: Date.now(),
      type: 'move',
    });
  }

  private trackScroll(): void {
    if (typeof window === 'undefined') return;

    const currentY = window.scrollY;
    const currentTime = Date.now();
    const deltaY = currentY - this.lastScrollY;
    const deltaTime = currentTime - this.lastScrollTime;
    const speed = deltaTime > 0 ? Math.abs(deltaY) / deltaTime : 0;

    const scrollDepth = this.calculateScrollDepth();

    this.session.scrollData.push({
      depth: scrollDepth,
      timestamp: currentTime,
      direction: deltaY > 0 ? 'down' : 'up',
      speed,
    });

    this.lastScrollY = currentY;
    this.lastScrollTime = currentTime;

    // Limita array scroll data
    if (this.session.scrollData.length > 100) {
      this.session.scrollData = this.session.scrollData.slice(-100);
    }
  }

  private calculateScrollDepth(): number {
    if (typeof window === 'undefined' || typeof document === 'undefined') return 0;

    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight;
    const winHeight = window.innerHeight;
    const scrollPercent = (scrollTop / (docHeight - winHeight)) * 100;

    return Math.min(100, Math.max(0, scrollPercent));
  }

  private trackFieldFocus(field: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): void {
    const fieldName = this.getFieldName(field);
    const now = Date.now();

    this.currentFocus = { field: fieldName, startTime: now };

    const interaction = this.getOrCreateFieldInteraction(fieldName, field);
    
    if (!interaction.firstInteraction) {
      interaction.firstInteraction = now;
    }
    interaction.lastInteraction = now;

    this.addPoint({
      x: field.getBoundingClientRect().left,
      y: field.getBoundingClientRect().top,
      timestamp: now,
      element: fieldName,
      type: 'focus',
    });
  }

  private trackFieldBlur(field: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): void {
    const fieldName = this.getFieldName(field);
    
    if (this.currentFocus && this.currentFocus.field === fieldName) {
      const focusTime = Date.now() - this.currentFocus.startTime;
      
      const interaction = this.getOrCreateFieldInteraction(fieldName, field);
      interaction.focusTime += focusTime;
      interaction.focusEvents.push({
        start: this.currentFocus.startTime,
        end: Date.now(),
      });

      this.currentFocus = null;
    }
  }

  private trackHover(element: Element): void {
    const elementSelector = this.getElementSelector(element);
    const rect = element.getBoundingClientRect();

    this.addPoint({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      timestamp: Date.now(),
      element: elementSelector,
      type: 'hover',
    });

    // Incrementa hover count se è un form field
    if (this.isFormField(element)) {
      const fieldName = this.getFieldName(element);
      this.incrementFieldInteraction(fieldName, 'hovers', element);
    }
  }

  // Utility metodi
  private addPoint(point: HeatmapPoint): void {
    this.batch.push(point);

    if (this.batch.length >= this.batchSize) {
      this.flushBatch();
    }
  }

  private flushBatch(): void {
    if (this.batch.length === 0) return;

    this.session.points.push(...this.batch);
    
    // Limita dimensione array punti
    if (this.session.points.length > 1000) {
      this.session.points = this.session.points.slice(-1000);
    }

    this.batch = [];
  }

  private startBatchFlush(): void {
    this.flushInterval = setInterval(() => {
      this.flushBatch();
    }, 5000);
  }

  private getOrCreateFieldInteraction(
    fieldName: string,
    element: Element
  ): FieldInteraction {
    if (!this.session.fieldInteractions.has(fieldName)) {
      this.session.fieldInteractions.set(fieldName, {
        fieldName,
        fieldType: (element as HTMLInputElement).type || element.tagName.toLowerCase(),
        clicks: 0,
        hovers: 0,
        focusTime: 0,
        focusEvents: [],
        errors: 0,
        corrections: 0,
      });
    }
    return this.session.fieldInteractions.get(fieldName)!;
  }

  private incrementFieldInteraction(
    fieldName: string,
    metric: keyof Pick<FieldInteraction, 'clicks' | 'hovers' | 'errors' | 'corrections'>,
    element: Element
  ): void {
    const interaction = this.getOrCreateFieldInteraction(fieldName, element);
    interaction[metric]++;
  }

  private getFieldName(element: Element): string {
    return (
      element.getAttribute('name') ||
      element.getAttribute('id') ||
      element.getAttribute('data-field') ||
      this.getElementSelector(element)
    );
  }

  private getElementSelector(element: Element): string {
    const tag = element.tagName.toLowerCase();
    const id = element.id ? `#${element.id}` : '';
    const classes = Array.from(element.classList)
      .slice(0, 2)
      .map((c) => `.${c}`)
      .join('');
    
    return `${tag}${id}${classes}`;
  }

  private throttle<T extends (...args: any[]) => void>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle = false;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  private cleanup(): void {
    this.observers.forEach((unsubscribe) => unsubscribe());
    this.observers = [];

    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    if (this.throttleTimer) {
      clearTimeout(this.throttleTimer);
    }

    // Chiudi focus attivo se presente
    if (this.currentFocus) {
      this.currentFocus = null;
    }
  }

  // Metodi pubblici per tracciare eventi specifici
  trackFieldError(fieldName: string): void {
    const interaction = this.session.fieldInteractions.get(fieldName);
    if (interaction) {
      interaction.errors++;
    }
  }

  trackFieldCorrection(fieldName: string): void {
    const interaction = this.session.fieldInteractions.get(fieldName);
    if (interaction) {
      interaction.corrections++;
    }
  }

  // Ottieni dati aggregati
  getFieldAnalytics(): FieldInteraction[] {
    return Array.from(this.session.fieldInteractions.values());
  }

  getScrollAnalytics(): {
    maxDepth: number;
    avgSpeed: number;
    directionChanges: number;
  } {
    const scrollData = this.session.scrollData;
    
    if (scrollData.length === 0) {
      return { maxDepth: 0, avgSpeed: 0, directionChanges: 0 };
    }

    const maxDepth = Math.max(...scrollData.map((s) => s.depth));
    const avgSpeed = scrollData.reduce((sum, s) => sum + s.speed, 0) / scrollData.length;
    
    let directionChanges = 0;
    for (let i = 1; i < scrollData.length; i++) {
      if (scrollData[i].direction !== scrollData[i - 1].direction) {
        directionChanges++;
      }
    }

    return { maxDepth, avgSpeed, directionChanges };
  }

  getHeatmapData(): { points: HeatmapPoint[]; viewport: { width: number; height: number } } {
    return {
      points: [...this.session.points, ...this.batch],
      viewport: this.session.viewport,
    };
  }

  getSessionId(): string {
    return this.session.sessionId;
  }

  // Esporta tutti i dati
  exportData(): HeatmapSession {
    this.session.endTime = Date.now();
    return { ...this.session };
  }

  // Reset
  reset(): void {
    this.stop();
    this.session = this.createNewSession();
    this.detectDeviceType();
    this.batch = [];
    this.lastScrollY = 0;
    this.lastScrollTime = 0;
  }
}

// Esporta singleton
export const heatmapTracker = new HeatmapTracker();

// Hook per React
export function useHeatmapTracker() {
  return heatmapTracker;
}

// Tipi esportati
export type { HeatmapPoint, FieldInteraction, ScrollData, HeatmapSession };
