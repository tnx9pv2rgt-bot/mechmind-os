/**
 * A/B Testing Framework
 * 
 * Gestione esperimenti per ottimizzazione conversione form
 */

type Variant = 'control' | 'variant-a' | 'variant-b' | string;

type ExperimentType = 'copy' | 'layout' | 'steps' | 'color' | 'cta';

interface Experiment {
  id: string;
  name: string;
  type: ExperimentType;
  description: string;
  variants: VariantConfig[];
  trafficAllocation: number; // 0-100, percentuale utenti inclusi nell'esperimento
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
}

interface VariantConfig {
  id: Variant;
  name: string;
  weight: number; // 0-100, proporzione traffico
  config: Record<string, unknown>;
}

interface Assignment {
  userId: string;
  experimentId: string;
  variant: Variant;
  assignedAt: Date;
  converted: boolean;
  events: Array<{
    event: string;
    timestamp: Date;
    metadata?: Record<string, unknown>;
  }>;
}

interface ExperimentResult {
  experiment: Experiment;
  variantResults: Array<{
    variant: Variant;
    visitors: number;
    conversions: number;
    conversionRate: number;
    confidence?: number;
    isWinner?: boolean;
  }>;
}

// Configurazioni predefinite di esperimenti
const DEFAULT_EXPERIMENTS: Experiment[] = [
  {
    id: 'exp-button-copy-001',
    name: 'Button Copy Test',
    type: 'copy',
    description: 'Test differenti testi per il pulsante di submit',
    variants: [
      {
        id: 'control',
        name: 'Registrati Ora',
        weight: 50,
        config: { buttonText: 'Registrati Ora', buttonColor: 'primary' },
      },
      {
        id: 'variant-a',
        name: 'Crea Account',
        weight: 50,
        config: { buttonText: 'Crea Account', buttonColor: 'primary' },
      },
    ],
    trafficAllocation: 100,
    startDate: new Date(),
    isActive: false,
  },
  {
    id: 'exp-layout-001',
    name: 'Form Layout Test',
    type: 'layout',
    description: '1 colonna vs 2 colonne',
    variants: [
      {
        id: 'control',
        name: '1 Colonna',
        weight: 50,
        config: { layout: 'single-column', columns: 1 },
      },
      {
        id: 'variant-a',
        name: '2 Colonne',
        weight: 50,
        config: { layout: 'two-column', columns: 2 },
      },
    ],
    trafficAllocation: 100,
    startDate: new Date(),
    isActive: false,
  },
  {
    id: 'exp-steps-001',
    name: 'Progressive Disclosure',
    type: 'steps',
    description: 'Tutti i campi vs step-by-step',
    variants: [
      {
        id: 'control',
        name: 'Tutti i campi',
        weight: 50,
        config: { type: 'single-page', steps: 1 },
      },
      {
        id: 'variant-a',
        name: 'Step-by-step',
        weight: 50,
        config: { type: 'multi-step', steps: 4 },
      },
    ],
    trafficAllocation: 100,
    startDate: new Date(),
    isActive: false,
  },
];

// Classe ABTestingManager
class ABTestingManager {
  private experiments: Map<string, Experiment> = new Map();
  private assignments: Map<string, Assignment> = new Map();
  private userId: string | null = null;

  constructor() {
    this.loadExperiments();
    this.loadAssignments();
  }

  // Inizializza utente
  setUserId(userId: string): void {
    this.userId = userId;
    this.loadAssignments();
  }

  // Carica esperimenti da localStorage o usa default
  private loadExperiments(): void {
    if (typeof window === 'undefined') return;

    const saved = localStorage.getItem('ab_experiments');
    if (saved) {
      const parsed = JSON.parse(saved);
      parsed.forEach((exp: Experiment) => {
        this.experiments.set(exp.id, { ...exp, startDate: new Date(exp.startDate) });
      });
    } else {
      DEFAULT_EXPERIMENTS.forEach((exp) => {
        this.experiments.set(exp.id, exp);
      });
    }
  }

  // Salva esperimenti
  private saveExperiments(): void {
    if (typeof window === 'undefined') return;

    const data = Array.from(this.experiments.values());
    localStorage.setItem('ab_experiments', JSON.stringify(data));
  }

  // Carica assegnazioni
  private loadAssignments(): void {
    if (typeof window === 'undefined' || !this.userId) return;

    const saved = localStorage.getItem(`ab_assignments_${this.userId}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      parsed.forEach((assignment: Assignment) => {
        const key = `${assignment.userId}:${assignment.experimentId}`;
        this.assignments.set(key, {
          ...assignment,
          assignedAt: new Date(assignment.assignedAt),
          events: assignment.events.map((e) => ({
            ...e,
            timestamp: new Date(e.timestamp),
          })),
        });
      });
    }
  }

  // Salva assegnazioni
  private saveAssignments(): void {
    if (typeof window === 'undefined' || !this.userId) return;

    const data = Array.from(this.assignments.values()).filter(
      (a) => a.userId === this.userId
    );
    localStorage.setItem(`ab_assignments_${this.userId}`, JSON.stringify(data));
  }

  // Genera user ID stabile
  private getOrCreateUserId(): string {
    if (this.userId) return this.userId;

    if (typeof window !== 'undefined') {
      let id = localStorage.getItem('ab_user_id');
      if (!id) {
        id = `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem('ab_user_id', id);
      }
      this.userId = id;
      return id;
    }

    return `server-${Date.now()}`;
  }

  // Hash function per assegnazione consistente
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  // Assegna utente a variante
  assignVariant(experimentId: string): Variant | null {
    const userId = this.getOrCreateUserId();
    const assignmentKey = `${userId}:${experimentId}`;

    // Controlla se già assegnato
    const existing = this.assignments.get(assignmentKey);
    if (existing) {
      return existing.variant;
    }

    const experiment = this.experiments.get(experimentId);
    if (!experiment || !experiment.isActive) {
      return null;
    }

    // Controlla se utente deve essere incluso
    const userHash = this.hashString(userId);
    const userPercentile = userHash % 100;
    
    if (userPercentile >= experiment.trafficAllocation) {
      return null; // Utente non incluso nell'esperimento
    }

    // Assegna a variante basata sul peso
    const variantHash = this.hashString(`${userId}:${experimentId}`);
    const variantPercentile = variantHash % 100;
    
    let cumulativeWeight = 0;
    let selectedVariant: Variant = experiment.variants[0].id;

    for (const variant of experiment.variants) {
      cumulativeWeight += variant.weight;
      if (variantPercentile < cumulativeWeight) {
        selectedVariant = variant.id;
        break;
      }
    }

    // Salva assegnazione
    const assignment: Assignment = {
      userId,
      experimentId,
      variant: selectedVariant,
      assignedAt: new Date(),
      converted: false,
      events: [],
    };

    this.assignments.set(assignmentKey, assignment);
    this.saveAssignments();

    // Traccia assegnazione
    this.trackAssignmentEvent(experimentId, selectedVariant);

    return selectedVariant;
  }

  private trackAssignmentEvent(experimentId: string, variant: Variant): void {
    // Questo metodo può essere integrato con analytics.track
    if (typeof window !== 'undefined' && window.analytics) {
      window.analytics.track('Experiment Assigned', {
        experimentId,
        variant,
      });
    }
  }

  // Ottieni configurazione variante
  getVariantConfig(experimentId: string): Record<string, unknown> | null {
    const userId = this.getOrCreateUserId();
    const assignmentKey = `${userId}:${experimentId}`;
    const assignment = this.assignments.get(assignmentKey);

    if (!assignment) {
      // Prova ad assegnare
      const variant = this.assignVariant(experimentId);
      if (!variant) return null;
      
      return this.getVariantConfigById(experimentId, variant);
    }

    return this.getVariantConfigById(experimentId, assignment.variant);
  }

  private getVariantConfigById(
    experimentId: string,
    variantId: Variant
  ): Record<string, unknown> | null {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return null;

    const variant = experiment.variants.find((v) => v.id === variantId);
    return variant?.config || null;
  }

  // Traccia conversione
  trackConversion(experimentId: string, metadata?: Record<string, unknown>): void {
    const userId = this.getOrCreateUserId();
    const assignmentKey = `${userId}:${experimentId}`;
    const assignment = this.assignments.get(assignmentKey);

    if (!assignment || assignment.converted) return;

    assignment.converted = true;
    assignment.events.push({
      event: 'conversion',
      timestamp: new Date(),
      metadata,
    });

    this.saveAssignments();

    // Traccia conversione
    if (typeof window !== 'undefined' && window.analytics) {
      window.analytics.track('Experiment Conversion', {
        experimentId,
        variant: assignment.variant,
        ...metadata,
      });
    }
  }

  // Traccia evento intermedio
  trackEvent(
    experimentId: string,
    event: string,
    metadata?: Record<string, unknown>
  ): void {
    const userId = this.getOrCreateUserId();
    const assignmentKey = `${userId}:${experimentId}`;
    const assignment = this.assignments.get(assignmentKey);

    if (!assignment) return;

    assignment.events.push({
      event,
      timestamp: new Date(),
      metadata,
    });

    this.saveAssignments();
  }

  // Gestione esperimenti
  createExperiment(experiment: Omit<Experiment, 'id'>): Experiment {
    const id = `exp-${Date.now()}`;
    const newExperiment: Experiment = { ...experiment, id };
    this.experiments.set(id, newExperiment);
    this.saveExperiments();
    return newExperiment;
  }

  updateExperiment(id: string, updates: Partial<Experiment>): Experiment | null {
    const experiment = this.experiments.get(id);
    if (!experiment) return null;

    const updated = { ...experiment, ...updates };
    this.experiments.set(id, updated);
    this.saveExperiments();
    return updated;
  }

  deleteExperiment(id: string): boolean {
    const deleted = this.experiments.delete(id);
    if (deleted) {
      this.saveExperiments();
    }
    return deleted;
  }

  getExperiment(id: string): Experiment | undefined {
    return this.experiments.get(id);
  }

  getAllExperiments(): Experiment[] {
    return Array.from(this.experiments.values());
  }

  getActiveExperiments(): Experiment[] {
    return this.getAllExperiments().filter((e) => e.isActive);
  }

  // Calcola risultati
  calculateResults(experimentId: string): ExperimentResult | null {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return null;

    const experimentAssignments = Array.from(this.assignments.values()).filter(
      (a) => a.experimentId === experimentId
    );

    const variantResults = experiment.variants.map((variant) => {
      const variantAssignments = experimentAssignments.filter(
        (a) => a.variant === variant.id
      );

      const visitors = variantAssignments.length;
      const conversions = variantAssignments.filter((a) => a.converted).length;
      const conversionRate = visitors > 0 ? (conversions / visitors) * 100 : 0;

      return {
        variant: variant.id,
        visitors,
        conversions,
        conversionRate,
        isWinner: false,
      };
    });

    // Calcola vincitore (semplice, senza test statistico completo)
    const maxConversionRate = Math.max(...variantResults.map((v) => v.conversionRate));
    const winner = variantResults.find((v) => v.conversionRate === maxConversionRate);

    if (winner && winner.conversionRate > 0) {
      winner.isWinner = true;
    }

    return {
      experiment,
      variantResults,
    };
  }

  // Utility per componenti React
  getExperimentProps(experimentId: string): {
    variant: Variant | null;
    config: Record<string, unknown> | null;
    trackConversion: (metadata?: Record<string, unknown>) => void;
    trackEvent: (event: string, metadata?: Record<string, unknown>) => void;
  } {
    const variant = this.assignVariant(experimentId);
    const config = this.getVariantConfig(experimentId);

    return {
      variant,
      config,
      trackConversion: (metadata?: Record<string, unknown>) => {
        this.trackConversion(experimentId, metadata);
      },
      trackEvent: (event: string, metadata?: Record<string, unknown>) => {
        this.trackEvent(experimentId, event, metadata);
      },
    };
  }

  // Reset
  reset(): void {
    this.assignments.clear();
    if (typeof window !== 'undefined' && this.userId) {
      localStorage.removeItem(`ab_assignments_${this.userId}`);
    }
  }
}

// Esporta singleton
export const abTesting = new ABTestingManager();

// Hook per React
export function useABTesting() {
  return abTesting;
}

// Hook per usare un esperimento specifico
export function useExperiment(experimentId: string) {
  const variant = abTesting.assignVariant(experimentId);
  const config = abTesting.getVariantConfig(experimentId);
  const experiment = abTesting.getExperiment(experimentId);

  return {
    variant,
    config,
    experiment,
    trackConversion: (metadata?: Record<string, unknown>) => {
      abTesting.trackConversion(experimentId, metadata);
    },
    trackEvent: (event: string, metadata?: Record<string, unknown>) => {
      abTesting.trackEvent(experimentId, event, metadata);
    },
  };
}

// Componente HOC per varianti
export function withABTest<P extends object>(
  Component: React.ComponentType<P>,
  experimentId: string,
  variants: Record<Variant, React.ComponentType<P>>
): React.ComponentType<P> {
  return function ABTestWrapper(props: P) {
    const { variant } = useExperiment(experimentId);
    const VariantComponent = variant ? variants[variant] : Component;
    return <VariantComponent {...props} />;
  };
}

// Tipi esportati
export type {
  Variant,
  ExperimentType,
  Experiment,
  VariantConfig,
  Assignment,
  ExperimentResult,
};
