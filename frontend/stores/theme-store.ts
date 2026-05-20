import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ThemePreset = 'officina' | 'ufficio' | 'manager' | 'custom';

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
export type TableDensity = 'compact' | 'normal' | 'spacious';
export type BorderRadius = 'none' | 'small' | 'medium' | 'large' | 'pill';
export type SidebarPosition = 'left' | 'right';
export type SidebarBehavior = 'expanded' | 'collapsed' | 'auto';
export type SidebarTheme = 'dark' | 'light' | 'follow';
export type ContentWidth = 'full' | 'centered';
export type AnimationLevel = 'full' | 'reduced' | 'none';
export type ContrastLevel = 'normal' | 'high';
export type ToastPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';
export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
export type TimeFormat = '24h' | '12h';
export type DecimalSeparator = 'comma' | 'dot';
export type ChartPalette = 'brand' | 'rainbow' | 'monochrome' | 'pastel' | 'vivid';

export interface StatusColors {
  nuovo: string;
  in_lavorazione: string;
  attesa_ricambi: string;
  completato: string;
  annullato: string;
  urgente: string;
}

export interface ColorPreset {
  name: string;
  value: string;
}

export const DEFAULT_STATUS_COLORS: StatusColors = {
  nuovo: '#3b82f6',
  in_lavorazione: '#f97316',
  attesa_ricambi: '#eab308',
  completato: '#22c55e',
  annullato: '#6b7280',
  urgente: '#ef4444',
};

export const STATUS_LABELS: Record<keyof StatusColors, string> = {
  nuovo: 'Nuovo',
  in_lavorazione: 'In lavorazione',
  attesa_ricambi: 'Attesa ricambi',
  completato: 'Completato',
  annullato: 'Annullato',
  urgente: 'Urgente',
};

export const CHART_PALETTES: Record<ChartPalette, { name: string; colors: string[] }> = {
  brand: { name: 'Brand', colors: [] },
  rainbow: {
    name: 'Arcobaleno',
    colors: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'],
  },
  monochrome: {
    name: 'Monocromatico',
    colors: ['#111827', '#374151', '#6b7280', '#9ca3af', '#d1d5db', '#f3f4f6'],
  },
  pastel: {
    name: 'Pastello',
    colors: ['#fca5a5', '#fdba74', '#fde68a', '#86efac', '#93c5fd', '#c4b5fd'],
  },
  vivid: {
    name: 'Vivace',
    colors: ['#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#2563eb', '#7c3aed'],
  },
};

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
  {
    value: 'system',
    label: 'Sistema',
    css: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  { value: 'inter', label: 'Inter', css: 'var(--font-inter), "Inter", sans-serif' },
  {
    value: 'plus-jakarta',
    label: 'Plus Jakarta',
    css: 'var(--font-plus-jakarta), "Plus Jakarta Sans", sans-serif',
  },
  { value: 'dm-sans', label: 'DM Sans', css: 'var(--font-dm-sans), "DM Sans", sans-serif' },
  { value: 'nunito', label: 'Nunito', css: 'var(--font-nunito), "Nunito", sans-serif' },
  { value: 'poppins', label: 'Poppins', css: 'var(--font-poppins), "Poppins", sans-serif' },
  { value: 'roboto', label: 'Roboto', css: 'var(--font-roboto), "Roboto", sans-serif' },
  { value: 'lato', label: 'Lato', css: 'var(--font-lato), "Lato", sans-serif' },
  {
    value: 'open-sans',
    label: 'Open Sans',
    css: 'var(--font-open-sans), "Open Sans", sans-serif',
  },
  {
    value: 'montserrat',
    label: 'Montserrat',
    css: 'var(--font-montserrat), "Montserrat", sans-serif',
  },
];

const DEFAULT_STATE = {
  theme: 'system' as ThemeMode,
  preset: 'custom' as ThemePreset,
  primaryColor: '#2e95ff',
  sidebarColor: '#171717',
  fontFamily: 'system' as FontFamily,
  fontSize: 'medium' as FontSize,
  density: 'normal' as Density,
  tableDensity: 'normal' as TableDensity,
  borderRadius: 'large' as BorderRadius,
  sidebarPosition: 'left' as SidebarPosition,
  sidebarBehavior: 'expanded' as SidebarBehavior,
  sidebarTheme: 'follow' as SidebarTheme,
  contentWidth: 'full' as ContentWidth,
  animations: 'full' as AnimationLevel,
  contrast: 'normal' as ContrastLevel,
  toastPosition: 'top-right' as ToastPosition,
  dateFormat: 'DD/MM/YYYY' as DateFormat,
  timeFormat: '24h' as TimeFormat,
  decimalSeparator: 'comma' as DecimalSeparator,
  chartPalette: 'brand' as ChartPalette,
  statusColors: DEFAULT_STATUS_COLORS,
  hiddenNavItems: [] as string[],
};

type PresetData = Partial<
  Omit<
    typeof DEFAULT_STATE,
    | 'preset'
    | 'hiddenNavItems'
    | 'toastPosition'
    | 'dateFormat'
    | 'timeFormat'
    | 'decimalSeparator'
    | 'statusColors'
  >
>;

const PRESET_CONFIGS: Record<Exclude<ThemePreset, 'custom'>, PresetData> = {
  officina: {
    theme: 'dark',
    primaryColor: '#ef4444',
    sidebarColor: '#171717',
    fontFamily: 'system',
    fontSize: 'medium',
    density: 'compact',
    tableDensity: 'compact',
    borderRadius: 'small',
    sidebarBehavior: 'collapsed',
    sidebarTheme: 'dark',
    contentWidth: 'full',
    animations: 'reduced',
    contrast: 'high',
    chartPalette: 'vivid',
  },
  ufficio: {
    theme: 'light',
    primaryColor: '#2e95ff',
    sidebarColor: '#f9f9f9',
    fontFamily: 'inter',
    fontSize: 'medium',
    density: 'normal',
    tableDensity: 'normal',
    borderRadius: 'large',
    sidebarBehavior: 'expanded',
    sidebarTheme: 'light',
    contentWidth: 'full',
    animations: 'full',
    contrast: 'normal',
    chartPalette: 'brand',
  },
  manager: {
    theme: 'system',
    primaryColor: '#8b5cf6',
    sidebarColor: '#1e1b4b',
    fontFamily: 'plus-jakarta',
    fontSize: 'large',
    density: 'spacious',
    tableDensity: 'normal',
    borderRadius: 'large',
    sidebarBehavior: 'expanded',
    sidebarTheme: 'dark',
    contentWidth: 'centered',
    animations: 'full',
    contrast: 'normal',
    chartPalette: 'rainbow',
  },
};

export interface ThemeState {
  theme: ThemeMode;
  preset: ThemePreset;
  primaryColor: string;
  sidebarColor: string;
  statusColors: StatusColors;
  chartPalette: ChartPalette;
  fontFamily: FontFamily;
  fontSize: FontSize;
  density: Density;
  tableDensity: TableDensity;
  borderRadius: BorderRadius;
  sidebarPosition: SidebarPosition;
  sidebarBehavior: SidebarBehavior;
  sidebarTheme: SidebarTheme;
  contentWidth: ContentWidth;
  animations: AnimationLevel;
  contrast: ContrastLevel;
  toastPosition: ToastPosition;
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  decimalSeparator: DecimalSeparator;
  hiddenNavItems: string[];
  applyPreset: (preset: Exclude<ThemePreset, 'custom'>) => void;
  setTheme: (theme: ThemeMode) => void;
  setPrimaryColor: (color: string) => void;
  setSidebarColor: (color: string) => void;
  setStatusColor: (key: keyof StatusColors, color: string) => void;
  setChartPalette: (palette: ChartPalette) => void;
  setFontFamily: (font: FontFamily) => void;
  setFontSize: (size: FontSize) => void;
  setDensity: (density: Density) => void;
  setTableDensity: (density: TableDensity) => void;
  setBorderRadius: (radius: BorderRadius) => void;
  setSidebarPosition: (position: SidebarPosition) => void;
  setSidebarBehavior: (behavior: SidebarBehavior) => void;
  setSidebarTheme: (theme: SidebarTheme) => void;
  setContentWidth: (width: ContentWidth) => void;
  setAnimations: (level: AnimationLevel) => void;
  setContrast: (level: ContrastLevel) => void;
  setToastPosition: (pos: ToastPosition) => void;
  setDateFormat: (format: DateFormat) => void;
  setTimeFormat: (format: TimeFormat) => void;
  setDecimalSeparator: (sep: DecimalSeparator) => void;
  toggleNavItem: (href: string) => void;
  resetToDefaults: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    set => ({
      ...DEFAULT_STATE,
      applyPreset: (preset): void => set({ ...PRESET_CONFIGS[preset], preset }),
      setTheme: (theme): void => set({ theme, preset: 'custom' }),
      setPrimaryColor: (primaryColor): void => set({ primaryColor, preset: 'custom' }),
      setSidebarColor: (sidebarColor): void => set({ sidebarColor, preset: 'custom' }),
      setStatusColor: (key, color): void =>
        set(state => ({ statusColors: { ...state.statusColors, [key]: color } })),
      setChartPalette: (chartPalette): void => set({ chartPalette, preset: 'custom' }),
      setFontFamily: (fontFamily): void => set({ fontFamily, preset: 'custom' }),
      setFontSize: (fontSize): void => set({ fontSize, preset: 'custom' }),
      setDensity: (density): void => set({ density, preset: 'custom' }),
      setTableDensity: (tableDensity): void => set({ tableDensity, preset: 'custom' }),
      setBorderRadius: (borderRadius): void => set({ borderRadius, preset: 'custom' }),
      setSidebarPosition: (sidebarPosition): void => set({ sidebarPosition, preset: 'custom' }),
      setSidebarBehavior: (sidebarBehavior): void => set({ sidebarBehavior, preset: 'custom' }),
      setSidebarTheme: (sidebarTheme): void => set({ sidebarTheme, preset: 'custom' }),
      setContentWidth: (contentWidth): void => set({ contentWidth, preset: 'custom' }),
      setAnimations: (animations): void => set({ animations, preset: 'custom' }),
      setContrast: (contrast): void => set({ contrast, preset: 'custom' }),
      setToastPosition: (toastPosition): void => set({ toastPosition }),
      setDateFormat: (dateFormat): void => set({ dateFormat }),
      setTimeFormat: (timeFormat): void => set({ timeFormat }),
      setDecimalSeparator: (decimalSeparator): void => set({ decimalSeparator }),
      toggleNavItem: (href): void =>
        set(state => ({
          hiddenNavItems: state.hiddenNavItems.includes(href)
            ? state.hiddenNavItems.filter(h => h !== href)
            : [...state.hiddenNavItems, href],
        })),
      resetToDefaults: (): void => set(DEFAULT_STATE),
    }),
    { name: 'mechmind-theme' }
  )
);

export type Theme = ThemeMode;
