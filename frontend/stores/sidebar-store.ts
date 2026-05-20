import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SidebarState {
  expanded: boolean;
  mobileOpen: boolean;
  toggle: () => void;
  setMobileOpen: (open: boolean) => void;
  close: () => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      expanded: true,
      mobileOpen: false,
      toggle: (): void => set((state) => ({ expanded: !state.expanded })),
      setMobileOpen: (open: boolean): void => set({ mobileOpen: open }),
      close: (): void => set({ expanded: false, mobileOpen: false }),
    }),
    {
      name: 'mechmind-sidebar',
      partialize: (state) => ({ expanded: state.expanded }),
    },
  ),
);
