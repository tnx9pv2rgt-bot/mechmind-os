/**
 * Conditional Form Flow - Typeform-style Smart Branching
 * 
 * Sistema di logica condizionale per form dinamici con:
 * - Branching tree configurabile
 * - Skip logic basata su risposte
 * - Time estimation dinamica
 * - Supporto per sub-branch e condizioni annidate
 */

import { FormAnswers, FormBranch, FormFlowConfig, StepConfig, StepTiming } from './types';

/**
 * Configurazione base del form flow
 */
export const formFlowConfig: FormFlowConfig = {
  // Step base sempre presenti
  baseSteps: ['welcome', 'credentials'],
  
  // Configurazione timing per step (in minuti)
  stepTiming: {
    welcome: 0.5,
    credentials: 1,
    personalData: 2,
    businessData: 3,
    billingAddress: 1.5,
    internationalBilling: 2,
    taxId: 1,
    privacy: 1,
    vatConfirmation: 0.5,
    review: 2,
    businessDataSimplified: 2,
  },
  
  // Branching logic
  branches: {
    // Se customerType = 'private'
    private: {
      steps: ['personalData', 'privacy'],
      skip: ['businessData', 'billingAddress', 'internationalBilling', 'taxId', 'vatConfirmation'],
    },
    
    // Se customerType = 'business'
    business: {
      steps: ['businessData', 'billingAddress', 'privacy'],
      skip: ['personalData'],
    },
    
    // Se country != 'IT'
    international: {
      steps: ['internationalBilling', 'taxId'],
      addAfter: 'businessData',
      condition: (answers) => answers.country !== 'IT',
    },
    
    // Se VAT verificato (skip conferma)
    vatVerified: {
      skip: ['vatConfirmation'],
      autoComplete: true,
      condition: (answers) => answers.vatVerified === true,
    },
    
    // Se utente mobile - usa step semplificato
    mobile: {
      steps: ['businessDataSimplified'],
      skip: ['businessData'],
      condition: () => typeof window !== 'undefined' && window.innerWidth < 768,
    },
  },
};

/**
 * Configurazione dettagliata per ogni step
 */
export const stepConfigs: Record<string, StepConfig> = {
  welcome: {
    id: 'welcome',
    title: 'Benvenuto',
    description: 'Inizia la tua registrazione',
    skippable: false,
    validate: () => true,
  },
  credentials: {
    id: 'credentials',
    title: 'Credenziali',
    description: 'Crea il tuo account',
    skippable: false,
    validate: (answers) => !!answers.email && !!answers.password,
  },
  personalData: {
    id: 'personalData',
    title: 'Dati Personali',
    description: 'Informazioni personali',
    skippable: false,
    validate: (answers) => !!answers.firstName && !!answers.lastName,
  },
  businessData: {
    id: 'businessData',
    title: 'Dati Aziendali',
    description: 'Informazioni sulla tua azienda',
    skippable: false,
    validate: (answers) => !!answers.companyName && !!answers.vatNumber,
  },
  businessDataSimplified: {
    id: 'businessDataSimplified',
    title: 'Dati Aziendali',
    description: 'Informazioni azienda (versione mobile)',
    skippable: false,
    validate: (answers) => !!answers.companyName,
  },
  billingAddress: {
    id: 'billingAddress',
    title: 'Indirizzo Fatturazione',
    description: 'Dati di fatturazione',
    skippable: false,
    validate: (answers) => !!answers.address && !!answers.city && !!answers.zipCode,
  },
  internationalBilling: {
    id: 'internationalBilling',
    title: 'Dati Fatturazione Internazionale',
    description: 'Informazioni per fatturazione estera',
    skippable: false,
    validate: (answers) => !!answers.intAddress && !!answers.intTaxCode,
  },
  taxId: {
    id: 'taxId',
    title: 'Codice Fiscale/Tax ID',
    description: 'Identificativo fiscale internazionale',
    skippable: false,
    validate: (answers) => !!answers.taxId,
  },
  privacy: {
    id: 'privacy',
    title: 'Privacy',
    description: 'Consensi privacy',
    skippable: false,
    validate: (answers) => answers.privacyConsent === true,
  },
  vatConfirmation: {
    id: 'vatConfirmation',
    title: 'Conferma VAT',
    description: 'Verifica partita IVA',
    skippable: true,
    validate: () => true,
  },
  review: {
    id: 'review',
    title: 'Riepilogo',
    description: 'Verifica i tuoi dati',
    skippable: false,
    validate: () => true,
  },
};

/**
 * Calcola gli step attivi in base alle risposte
 */
export function calculateSteps(answers: FormAnswers, config: FormFlowConfig = formFlowConfig): string[] {
  let steps = [...config.baseSteps];
  const { branches } = config;
  
  // Branch su customerType
  if (answers.customerType === 'private') {
    if (branches.private?.steps) steps.push(...branches.private.steps);
  } else if (answers.customerType === 'business') {
    // Verifica se mobile per usare step semplificato
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    if (isMobile && branches.mobile?.steps) {
      steps.push(...branches.mobile.steps);
    } else if (branches.business?.steps) {
      steps.push(...branches.business.steps);
    }

    // Sub-branch per internazionale
    if (branches.international?.condition?.(answers) && branches.international.steps) {
      const addAfter = branches.international.addAfter || 'businessData';
      const idx = steps.indexOf(addAfter);
      if (idx !== -1) {
        steps.splice(idx + 1, 0, ...branches.international.steps);
      }
    }
    
    // Aggiungi vatConfirmation se necessario
    if (!branches.vatVerified?.condition?.(answers)) {
      const privacyIdx = steps.indexOf('privacy');
      if (privacyIdx !== -1) {
        steps.splice(privacyIdx, 0, 'vatConfirmation');
      }
    }
  }
  
  // Skip condizionale basato su branch
  Object.values(branches).forEach((branch) => {
    if (branch.skip && branch.condition?.(answers)) {
      steps = steps.filter((s) => !branch.skip?.includes(s));
    }
  });
  
  // Aggiungi step di review finale
  if (!steps.includes('review')) {
    steps.push('review');
  }
  
  // Rimuovi duplicati mantenendo l'ordine
  return [...new Set(steps)];
}

/**
 * Calcola il tempo stimato per completare gli step rimanenti
 */
export function calculateTime(
  steps: string[],
  currentStepIndex: number,
  timing: StepTiming = formFlowConfig.stepTiming
): number {
  const remainingSteps = steps.slice(currentStepIndex);
  const totalMinutes = remainingSteps.reduce((acc, step) => {
    return acc + (timing[step] || 1);
  }, 0);
  
  // Arrotonda al mezzo minuto più vicino
  return Math.ceil(totalMinutes * 2) / 2;
}

/**
 * Calcola la progressione percentuale
 */
export function calculateProgress(currentStepIndex: number, totalSteps: number): number {
  if (totalSteps === 0) return 0;
  return Math.min(((currentStepIndex + 1) / totalSteps) * 100, 100);
}

/**
 * Verifica se uno step deve essere saltato
 */
export function shouldSkipStep(
  stepId: string,
  answers: FormAnswers,
  config: FormFlowConfig = formFlowConfig
): boolean {
  // Controlla tutti i branch per vedere se lo step deve essere saltato
  return Object.values(config.branches).some(
    (branch) => branch.skip?.includes(stepId) && branch.condition?.(answers)
  );
}

/**
 * Ottiene lo step precedente valido (gestisce back navigation con skip)
 */
export function getPreviousValidStep(
  currentIndex: number,
  activeSteps: string[],
  answers: FormAnswers,
  config: FormFlowConfig = formFlowConfig
): number {
  for (let i = currentIndex - 1; i >= 0; i--) {
    const stepId = activeSteps[i];
    if (!shouldSkipStep(stepId, answers, config)) {
      return i;
    }
  }
  return 0;
}

/**
 * Ottiene il prossimo step valido
 */
export function getNextValidStep(
  currentIndex: number,
  activeSteps: string[],
  answers: FormAnswers,
  config: FormFlowConfig = formFlowConfig
): number {
  for (let i = currentIndex + 1; i < activeSteps.length; i++) {
    const stepId = activeSteps[i];
    if (!shouldSkipStep(stepId, answers, config)) {
      return i;
    }
  }
  return activeSteps.length - 1;
}

/**
 * Valida uno specifico step
 */
export function validateStep(stepId: string, answers: FormAnswers): boolean {
  const config = stepConfigs[stepId];
  if (!config) return true;
  return config.validate(answers);
}

/**
 * Ottiene tutti gli step che devono essere validati prima di un certo step
 */
export function getStepsToValidate(
  targetStepId: string,
  activeSteps: string[],
  answers: FormAnswers
): { stepId: string; isValid: boolean }[] {
  const targetIndex = activeSteps.indexOf(targetStepId);
  if (targetIndex === -1) return [];
  
  return activeSteps.slice(0, targetIndex).map((stepId) => ({
    stepId,
    isValid: validateStep(stepId, answers),
  }));
}

/**
 * Verifica se tutti gli step precedenti sono validi
 */
export function arePreviousStepsValid(
  targetStepId: string,
  activeSteps: string[],
  answers: FormAnswers
): boolean {
  const validations = getStepsToValidate(targetStepId, activeSteps, answers);
  return validations.every((v) => v.isValid);
}
