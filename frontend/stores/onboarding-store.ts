import { create } from 'zustand';

type ShopType = 'meccanica' | 'carrozzeria' | 'elettrauto' | 'gommista' | 'multimarca' | 'concessionaria';
type TeamSize = 'solo' | '2-5' | '6+';
type MigrationSource = 'zero' | 'excel' | 'altro-gestionale';
type Priority = 'appuntamenti' | 'fatturare' | 'lavorazioni' | 'comunicare';

interface OnboardingAnswers {
  shopType: ShopType | null;
  teamSize: TeamSize | null;
  migration: MigrationSource | null;
  priorities: Priority[];
}

interface OnboardingState {
  step: 1 | 2 | 3 | 4;
  answers: OnboardingAnswers;
  setShopType: (type: ShopType) => void;
  setTeamSize: (size: TeamSize) => void;
  setMigration: (source: MigrationSource) => void;
  togglePriority: (priority: Priority) => void;
  nextStep: () => void;
  prevStep: () => void;
  canProceed: () => boolean;
  reset: () => void;
}

const initialAnswers: OnboardingAnswers = {
  shopType: null,
  teamSize: null,
  migration: null,
  priorities: [],
};

export const useOnboardingStore = create<OnboardingState>()((set, get) => ({
  step: 1,
  answers: { ...initialAnswers },

  setShopType: (type: ShopType): void =>
    set((state) => ({
      answers: { ...state.answers, shopType: type },
    })),

  setTeamSize: (size: TeamSize): void =>
    set((state) => ({
      answers: { ...state.answers, teamSize: size },
    })),

  setMigration: (source: MigrationSource): void =>
    set((state) => ({
      answers: { ...state.answers, migration: source },
    })),

  togglePriority: (priority: Priority): void =>
    set((state) => {
      const current = [...state.answers.priorities];
      const index = current.indexOf(priority);

      if (index !== -1) {
        current.splice(index, 1);
      } else if (current.length >= 2) {
        current.shift();
        current.push(priority);
      } else {
        current.push(priority);
      }

      return { answers: { ...state.answers, priorities: current } };
    }),

  nextStep: (): void => {
    const { step, canProceed } = get();
    if (!canProceed()) return;
    if (step < 4) {
      set({ step: (step + 1) as 1 | 2 | 3 | 4 });
    }
  },

  prevStep: (): void => {
    const { step } = get();
    if (step > 1) {
      set({ step: (step - 1) as 1 | 2 | 3 | 4 });
    }
  },

  canProceed: (): boolean => {
    const { step, answers } = get();
    switch (step) {
      case 1:
        return answers.shopType !== null;
      case 2:
        return answers.teamSize !== null;
      case 3:
        return answers.migration !== null;
      case 4:
        return answers.priorities.length >= 1;
      default:
        return false;
    }
  },

  reset: (): void =>
    set({
      step: 1,
      answers: { ...initialAnswers, priorities: [] },
    }),
}));

export type { ShopType, TeamSize, MigrationSource, Priority, OnboardingAnswers, OnboardingState };
