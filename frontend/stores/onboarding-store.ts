import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ShopType =
  | 'meccanica'
  | 'carrozzeria'
  | 'elettrauto'
  | 'gommista'
  | 'multimarca'
  | 'concessionaria';
type TeamSize = 'solo' | '2-5' | '6+';
type Priority = 'appuntamenti' | 'fatturare' | 'lavorazioni' | 'comunicare';
type SectorAnswers = Record<string, string>;

interface OnboardingAnswers {
  shopName: string;
  shopCity: string;
  shopType: ShopType | null;
  teamSize: TeamSize | null;
  priorities: Priority[];
  sectorAnswers: SectorAnswers;
}

interface OnboardingState {
  step: 1 | 2 | 3 | 4 | 5;
  answers: OnboardingAnswers;
  setShopName: (name: string) => void;
  setShopCity: (city: string) => void;
  setShopType: (type: ShopType) => void;
  setTeamSize: (size: TeamSize) => void;
  togglePriority: (priority: Priority) => void;
  setSectorAnswer: (key: string, value: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  canProceed: () => boolean;
  reset: () => void;
}

const initialAnswers: OnboardingAnswers = {
  shopName: '',
  shopCity: '',
  shopType: null,
  teamSize: null,
  priorities: [],
  sectorAnswers: {},
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      step: 1,
      answers: { ...initialAnswers },

      setShopName: (name: string): void =>
        set(state => ({ answers: { ...state.answers, shopName: name } })),

      setShopCity: (city: string): void =>
        set(state => ({ answers: { ...state.answers, shopCity: city } })),

      setShopType: (type: ShopType): void =>
        set(state => ({
          answers: { ...state.answers, shopType: type, sectorAnswers: {} },
        })),

      setTeamSize: (size: TeamSize): void =>
        set(state => ({ answers: { ...state.answers, teamSize: size } })),

      togglePriority: (priority: Priority): void =>
        set(state => {
          const current = [...state.answers.priorities];
          const index = current.indexOf(priority);
          if (index !== -1) {
            current.splice(index, 1);
          } else if (current.length < 2) {
            current.push(priority);
          }
          return { answers: { ...state.answers, priorities: current } };
        }),

      setSectorAnswer: (key: string, value: string): void =>
        set(state => ({
          answers: {
            ...state.answers,
            sectorAnswers: { ...state.answers.sectorAnswers, [key]: value },
          },
        })),

      nextStep: (): void => {
        const { step, canProceed } = get();
        if (!canProceed()) return;
        if (step < 5) set({ step: (step + 1) as 1 | 2 | 3 | 4 | 5 });
      },

      prevStep: (): void => {
        const { step } = get();
        if (step > 1) set({ step: (step - 1) as 1 | 2 | 3 | 4 | 5 });
      },

      canProceed: (): boolean => {
        const { step, answers } = get();
        switch (step) {
          case 1:
            return answers.shopName.trim().length >= 2;
          case 2:
            return answers.shopType !== null;
          case 3:
            return true; // domande settoriali opzionali
          case 4:
            return answers.teamSize !== null;
          case 5:
            return answers.priorities.length >= 1;
          default:
            return false;
        }
      },

      reset: (): void => set({ step: 1, answers: { ...initialAnswers } }),
    }),
    {
      name: 'mechmind-onboarding',
      version: 2,
      migrate: (persisted: unknown, fromVersion: number) => {
        if (fromVersion < 2) {
          const old = persisted as { step?: number; answers?: Partial<OnboardingAnswers> };
          return {
            step: Math.min(old.step ?? 1, 5) as 1 | 2 | 3 | 4 | 5,
            answers: { ...initialAnswers, ...(old.answers ?? {}), sectorAnswers: {} },
          };
        }
        return persisted;
      },
      partialize: (state: OnboardingState) => ({
        step: state.step,
        answers: state.answers,
      }),
    }
  )
);

export type { ShopType, TeamSize, Priority, SectorAnswers, OnboardingAnswers, OnboardingState };
