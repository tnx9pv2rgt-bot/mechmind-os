/**
 * Type definitions for Conditional Form Flow
 */

/**
 * Tipo per le risposte del form
 */
export type FormAnswers = Record<string, any>;

/**
 * Condizione per un branch
 */
export type BranchCondition = (answers: FormAnswers) => boolean;

/**
 * Configurazione di un branch
 */
export interface FormBranch {
  /** Step da aggiungere quando il branch è attivo */
  steps?: string[];
  /** Step da saltare quando il branch è attivo */
  skip?: string[];
  /** Step dopo cui inserire i nuovi step (per sub-branch) */
  addAfter?: string;
  /** Auto-completa lo step senza mostrarlo */
  autoComplete?: boolean;
  /** Condizione per attivare il branch */
  condition?: BranchCondition;
}

/**
 * Timing per ogni step (in minuti)
 */
export type StepTiming = Record<string, number>;

/**
 * Configurazione completa del form flow
 */
export interface FormFlowConfig {
  /** Step base sempre presenti */
  baseSteps: string[];
  /** Timing stimato per ogni step */
  stepTiming: StepTiming;
  /** Definizione dei branch */
  branches: Record<string, FormBranch>;
}

/**
 * Configurazione di uno step
 */
export interface StepConfig {
  /** ID univoco dello step */
  id: string;
  /** Titolo visualizzato */
  title: string;
  /** Descrizione dello step */
  description: string;
  /** Se lo step può essere saltato */
  skippable: boolean;
  /** Funzione di validazione */
  validate: (answers: FormAnswers) => boolean;
  /** Icona opzionale */
  icon?: string;
  /** Se lo step è condizionale */
  conditional?: boolean;
  /** Condizione per mostrare lo step */
  showCondition?: BranchCondition;
}

/**
 * Stato del form flow
 */
export interface FormFlowState {
  /** Step attualmente attivi */
  activeSteps: string[];
  /** Indice dello step corrente */
  currentStepIndex: number;
  /** ID dello step corrente */
  currentStepId: string;
  /** Tempo stimato rimanente (in minuti) */
  estimatedTime: number;
  /** Progressione percentuale */
  progress: number;
  /** Se è possibile andare indietro */
  canGoBack: boolean;
  /** Se è possibile andare avanti */
  canGoNext: boolean;
  /** Se è l'ultimo step */
  isLastStep: boolean;
  /** Se è il primo step */
  isFirstStep: boolean;
  /** Storico degli step visitati */
  visitedSteps: string[];
  /** Risposte accumulate */
  answers: FormAnswers;
}

/**
 * Azioni disponibili per il form flow
 */
export interface FormFlowActions {
  /** Vai allo step successivo */
  goToNext: () => void;
  /** Vai allo step precedente */
  goToPrevious: () => void;
  /** Vai a uno specifico step */
  goToStep: (stepIndex: number) => void;
  /** Aggiorna le risposte */
  updateAnswers: (answers: Partial<FormAnswers>) => void;
  /** Salta uno step */
  skipStep: (stepId: string) => void;
  /** Resetta il form */
  reset: () => void;
  /** Completa il form */
  complete: () => void;
}

/**
 * Hook return type
 */
export type UseConditionalFlowReturn = FormFlowState & FormFlowActions;

/**
 * Props per il ConditionalStepRenderer
 */
export interface ConditionalStepRendererProps {
  /** Risposte correnti */
  answers: FormAnswers;
  /** Callback quando cambia lo step */
  onStepChange?: (stepIndex: number, stepId: string) => void;
  /** Callback quando vengono aggiornate le risposte */
  onAnswersChange?: (answers: FormAnswers) => void;
  /** Callback al completamento */
  onComplete?: (answers: FormAnswers) => void;
  /** Configurazione personalizzata */
  config?: FormFlowConfig;
  /** Componenti custom per gli step */
  customComponents?: Record<string, React.ComponentType<any>>;
  /** Classe CSS wrapper */
  className?: string;
}

/**
 * Props per DynamicProgress
 */
export interface DynamicProgressProps {
  /** Step corrente (1-based) */
  current: number;
  /** Totale step */
  total: number;
  /** Tempo stimato rimanente in minuti */
  estimatedTime: number;
  /** Classe CSS aggiuntiva */
  className?: string;
  /** Se mostrare gli indicatori dei singoli step */
  showStepIndicators?: boolean;
  /** Se mostrare il tempo stimato */
  showTimeEstimate?: boolean;
}

/**
 * Props per ConditionalNavigation
 */
export interface ConditionalNavigationProps {
  /** Se può andare indietro */
  canGoBack: boolean;
  /** Se può andare avanti */
  canGoNext: boolean;
  /** Se è l'ultimo step */
  isLastStep: boolean;
  /** Callback per andare indietro */
  onBack: () => void;
  /** Callback per andare avanti */
  onNext: () => void;
  /** Testo bottone indietro */
  backLabel?: string;
  /** Testo bottone avanti */
  nextLabel?: string;
  /** Testo bottone completamento */
  completeLabel?: string;
  /** Se è in stato di loading */
  isLoading?: boolean;
  /** Se il form è valido */
  isValid?: boolean;
}

/**
 * Eventi del form flow
 */
export interface FormFlowEvents {
  /** Quando lo step cambia */
  onStepChange: { stepIndex: number; stepId: string; previousStepId?: string };
  /** Quando le risposte vengono aggiornate */
  onAnswersUpdate: { answers: FormAnswers; changedField: string };
  /** Quando il form è completo */
  onComplete: { answers: FormAnswers; completedAt: Date };
  /** Quando uno step viene validato */
  onStepValidate: { stepId: string; isValid: boolean };
  /** Quando uno step viene saltato */
  onStepSkip: { stepId: string; reason: string };
  /** Errore nel form flow */
  onError: { error: Error; context: string };
}

/**
 * Opzioni per l'URL sync
 */
export interface URLSyncOptions {
  /** Se sincronizzare con l'URL */
  enabled: boolean;
  /** Nome del parametro query */
  paramName: string;
  /** Se usare hash routing */
  useHash?: boolean;
  /** Se sostituire la history o fare push */
  replace?: boolean;
}

/**
 * Configurazione completa hook
 */
export interface UseConditionalFlowOptions {
  /** Risposte iniziali */
  initialAnswers?: FormAnswers;
  /** Configurazione personalizzata */
  config?: FormFlowConfig;
  /** Opzioni URL sync */
  urlSync?: URLSyncOptions;
  /** Callback quando cambia lo step */
  onStepChange?: (stepIndex: number, stepId: string) => void;
  /** Callback quando vengono aggiornate le risposte */
  onAnswersChange?: (answers: FormAnswers) => void;
  /** Callback al completamento */
  onComplete?: (answers: FormAnswers) => void;
}
