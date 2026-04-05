import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

export type FontFamily =
  | 'system'
  | 'inter'
  | 'plus-jakarta'
  | 'dm-sans'
  | 'nunito'
  | 'poppins'
  | 'roboto'
  | 'lato'
  | 'open-sans'
  | 'montserrat';

export type FontSize = 'small' | 'medium' | 'large';
export type Density = 'compact' | 'normal' | 'spacious';
export type BorderRadius = 'none' | 'small' | 'medium' | 'large' | 'pill';
export type SidebarPosition = 'left' | 'right';
export type SidebarBehavior = 'expanded' | 'collapsed' | 'auto';
export type SidebarTheme = 'dark' | 'light' | 'follow';
export type ContentWidth = 'full' | 'centered';
export type AnimationLevel = 'full' | 'reduced' | 'none';
export type ContrastLevel = 'normal' | 'high';

export interface ColorPreset {
  name: string;
  value: string;
}

export const COLOR_PRESETS: ColorPreset[] = [
  { name: 'Blu', value: '#2e95ff' },
  { name: 'Verde', value: '#10a37f' },
  { name: 'Viola', value: '#8b5cf6' },
  { name: 'Rosso', value: '#ef4444' },
  { name: 'Arancione', value: '#f97316' },
  { name: 'Rosa', value: '#ec4899' },
  { name: 'Ciano', value: '#06b6d4' },
  { name: 'Giallo', value: '#eab308' },
  { name: 'Indaco', value: '#6366f1' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Lime', value: '#84cc16' },
  { name: 'Fucsia', value: '#d946ef' },
];

export const FONT_OPTIONS: { value: FontFamily; label: string; css: string }[] = [
  { value: 'system', label: 'Sistema', css: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  { value: 'inter', label: 'Inter', css: 'var(--font-inter), "Inter", sans-serif' },
  { value: 'plus-jakarta', label: 'Plus Jakarta Sans', css: 'var(--font-plus-jakarta), "Plus Jakarta Sans", sans-serif' },
  { value: 'dm-sans', label: 'DM Sans', css: 'var(--font-dm-sans), "DM Sans", sans-serif' },
  { value: 'nunito', label: 'Nunito', css: 'var(--font-nunito), "Nunito", sans-serif' },
  { value: 'poppins', label: 'Poppins', css: 'var(--font-poppins), "Poppins", sans-serif' },
  { value: 'roboto', label: 'Roboto', css: 'var(--font-roboto), "Roboto", sans-serif' },
  { value: 'lato', label: 'Lato', css: 'var(--font-lato), "Lato", sans-serif' },
  { value: 'open-sans', label: 'Open Sans', css: 'var(--font-open-sans), "Open Sans", sans-serif' },
  { value: 'montserrat', label: 'Montserrat', css: 'var(--font-montserrat), "Montserrat", sans-serif' },
];

export interface ThemeState {
  // Mode
  theme: ThemeMode;
  // Colors
  primaryColor: string;
  sidebarColor: string;
  // Typography
  fontFamily: FontFamily;
  fontSize: FontSize;
  // Layout
  density: Density;
  borderRadius: BorderRadius;
  sidebarPosition: SidebarPosition;
  sidebarBehavior: SidebarBehavior;
  sidebarTheme: SidebarTheme;
  contentWidth: ContentWidth;
  // Accessibility
  animations: AnimationLevel;
  contrast: ContrastLevel;
  // Actions
  setTheme: (theme: ThemeMode) => void;
  setPrimaryColor: (color: string) => void;
  setSidebarColor: (color: string) => void;
  setFontFamily: (font: FontFamily) => void;
  setFontSize: (size: FontSize) => void;
  setDensity: (density: Density) => void;
  setBorderRadius: (radius: BorderRadius) => void;
  setSidebarPosition: (position: SidebarPosition) => void;
  setSidebarBehavior: (behavior: SidebarBehavior) => void;
  setSidebarTheme: (theme: SidebarTheme) => void;
  setContentWidth: (width: ContentWidth) => void;
  setAnimations: (level: AnimationLevel) => void;
  setContrast: (level: ContrastLevel) => void;
  resetToDefaults: () => void;
}

const DEFAULT_STATE = {
  theme: 'system' as ThemeMode,
  primaryColor: '#2e95ff',
  sidebarColor: '#171717',
  fontFamily: 'system' as FontFamily,
  fontSize: 'medium' as FontSize,
  density: 'normal' as Density,
  borderRadius: 'large' as BorderRadius,
  sidebarPosition: 'left' as SidebarPosition,
  sidebarBehavior: 'expanded' as SidebarBehavior,
  sidebarTheme: 'follow' as SidebarTheme,
  contentWidth: 'full' as ContentWidth,
  animations: 'full' as AnimationLevel,
  contrast: 'normal' as ContrastLevel,
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,
      setTheme: (theme: ThemeMode): void => set({ theme }),
      setPrimaryColor: (primaryColor: string): void => set({ primaryColor }),
      setSidebarColor: (sidebarColor: string): void => set({ sidebarColor }),
      setFontFamily: (fontFamily: FontFamily): void => set({ fontFamily }),
      setFontSize: (fontSize: FontSize): void => set({ fontSize }),
      setDensity: (density: Density): void => set({ density }),
      setBorderRadius: (borderRadius: BorderRadius): void => set({ borderRadius }),
      setSidebarPosition: (sidebarPosition: SidebarPosition): void => set({ sidebarPosition }),
      setSidebarBehavior: (sidebarBehavior: SidebarBehavior): void => set({ sidebarBehavior }),
      setSidebarTheme: (sidebarTheme: SidebarTheme): void => set({ sidebarTheme }),
      setContentWidth: (contentWidth: ContentWidth): void => set({ contentWidth }),
      setAnimations: (animations: AnimationLevel): void => set({ animations }),
      setContrast: (contrast: ContrastLevel): void => set({ contrast }),
      resetToDefaults: (): void => set(DEFAULT_STATE),
    }),
    {
      name: 'mechmind-theme',
    },
  ),
);

// Backward compatibility export
export type Theme = ThemeMode;
