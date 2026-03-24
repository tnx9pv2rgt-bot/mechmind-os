import { create } from 'zustand';

export interface CommandPaletteState {
  open: boolean;
  query: string;
  toggle: () => void;
  setQuery: (q: string) => void;
  close: () => void;
}

export const useCommandPaletteStore = create<CommandPaletteState>()((set) => ({
  open: false,
  query: '',
  toggle: (): void => set((state) => ({ open: !state.open, query: state.open ? '' : state.query })),
  setQuery: (q: string): void => set({ query: q }),
  close: (): void => set({ open: false, query: '' }),
}));
