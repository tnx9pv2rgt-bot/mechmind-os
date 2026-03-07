/**
 * Color Contrast Utilities
 * WCAG 2.1 - Criterion 1.4.3: Contrast (Minimum)
 * WCAG 2.1 - Criterion 1.4.6: Contrast (Enhanced)
 * WCAG 2.1 - Criterion 1.4.11: Non-text Contrast
 */

export type ContrastLevel = 'AA' | 'AAA';
export type TextSize = 'normal' | 'large';

export interface ContrastRequirements {
  AA: { normal: number; large: number };
  AAA: { normal: number; large: number };
}

// Rapporti di contrasto richiesti
export const CONTRAST_REQUIREMENTS: ContrastRequirements = {
  AA: { normal: 4.5, large: 3 },
  AAA: { normal: 7, large: 4.5 },
};

// Rapporto contrasto per elementi non-testuali (UI components)
export const NON_TEXT_CONTRAST_RATIO = 3;

/**
 * Converte colore hex in RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleanHex = hex.replace('#', '');
  
  // Supporta sia 3 che 6 cifre
  const expanded = cleanHex.length === 3
    ? cleanHex.split('').map(c => c + c).join('')
    : cleanHex;

  if (expanded.length !== 6) return null;

  const r = parseInt(expanded.substring(0, 2), 16);
  const g = parseInt(expanded.substring(2, 4), 16);
  const b = parseInt(expanded.substring(4, 6), 16);

  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;

  return { r, g, b };
}

/**
 * Converte RGB in valore di luminosità relativa
 * Formula WCAG 2.1
 */
export function getLuminance(r: number, g: number, b: number): number {
  // Converte valori 0-255 in 0-1
  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;

  // Applica correzione gamma
  const rLinear = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const gLinear = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const bLinear = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Calcola rapporto di contrasto tra due colori
 */
export function getContrastRatio(color1: string, color2: string): number | null {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return null;

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  // Assicura che il più chiaro sia L1
  const L1 = Math.max(lum1, lum2);
  const L2 = Math.min(lum1, lum2);

  return (L1 + 0.05) / (L2 + 0.05);
}

/**
 * Verifica se il contrasto soddisfa WCAG
 */
export function meetsContrastRequirement(
  foreground: string,
  background: string,
  level: ContrastLevel = 'AA',
  textSize: TextSize = 'normal'
): boolean {
  const ratio = getContrastRatio(foreground, background);
  if (ratio === null) return false;

  const required = CONTRAST_REQUIREMENTS[level][textSize];
  return ratio >= required;
}

/**
 * Ottieni status contrasto con dettagli
 */
export interface ContrastResult {
  ratio: number;
  passesAA: boolean;
  passesAAA: boolean;
  passesAALarge: boolean;
  passesAAALarge: boolean;
  recommendedLevel: ContrastLevel;
}

export function checkContrast(foreground: string, background: string): ContrastResult | null {
  const ratio = getContrastRatio(foreground, background);
  if (ratio === null) return null;

  const passesAA = ratio >= CONTRAST_REQUIREMENTS.AA.normal;
  const passesAAA = ratio >= CONTRAST_REQUIREMENTS.AAA.normal;
  const passesAALarge = ratio >= CONTRAST_REQUIREMENTS.AA.large;
  const passesAAALarge = ratio >= CONTRAST_REQUIREMENTS.AAA.large;

  let recommendedLevel: ContrastLevel = 'AA';
  if (passesAAA) recommendedLevel = 'AAA';

  return {
    ratio: Math.round(ratio * 100) / 100,
    passesAA,
    passesAAA,
    passesAALarge,
    passesAAALarge,
    recommendedLevel,
  };
}

/**
 * Trova colore con contrasto sufficiente
 */
export function findAccessibleColor(
  background: string,
  preferredColor: string,
  alternatives: string[] = [],
  level: ContrastLevel = 'AA'
): { color: string; ratio: number; isPreferred: boolean } | null {
  const candidates = [preferredColor, ...alternatives];

  for (const color of candidates) {
    const ratio = getContrastRatio(color, background);
    if (ratio !== null && ratio >= CONTRAST_REQUIREMENTS[level].normal) {
      return {
        color,
        ratio,
        isPreferred: color === preferredColor,
      };
    }
  }

  return null;
}

/**
 * Calcola colore di testo ideale (nero o bianco) per un background
 */
export function getIdealTextColor(background: string): '#000000' | '#FFFFFF' {
  const rgb = hexToRgb(background);
  if (!rgb) return '#000000';

  const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

/**
 * Scorciatoie per colori comuni
 */
export const COLORS = {
  black: '#000000',
  white: '#FFFFFF',
  // Colori del tema Nexo
  primary: '#3b82f6',
  primaryForeground: '#ffffff',
  secondary: '#f1f5f9',
  secondaryForeground: '#0f172a',
  destructive: '#ef4444',
  destructiveForeground: '#ffffff',
  muted: '#f1f5f9',
  mutedForeground: '#64748b',
  accent: '#f1f5f9',
  accentForeground: '#0f172a',
  background: '#ffffff',
  foreground: '#0f172a',
  border: '#e2e8f0',
} as const;

/**
 * Verifica contrasto tema completo
 */
export interface ThemeContrastReport {
  primary: ContrastResult | null;
  secondary: ContrastResult | null;
  destructive: ContrastResult | null;
  muted: ContrastResult | null;
  accent: ContrastResult | null;
  allPassAA: boolean;
  allPassAAA: boolean;
}

export function checkThemeContrast(
  theme: Partial<typeof COLORS> = COLORS
): ThemeContrastReport {
  const bg = theme.background || COLORS.background;

  const report: ThemeContrastReport = {
    primary: checkContrast(theme.primaryForeground || COLORS.primaryForeground, theme.primary || COLORS.primary),
    secondary: checkContrast(theme.secondaryForeground || COLORS.secondaryForeground, theme.secondary || COLORS.secondary),
    destructive: checkContrast(theme.destructiveForeground || COLORS.destructiveForeground, theme.destructive || COLORS.destructive),
    muted: checkContrast(theme.mutedForeground || COLORS.mutedForeground, theme.muted || COLORS.muted),
    accent: checkContrast(theme.accentForeground || COLORS.accentForeground, theme.accent || COLORS.accent),
    allPassAA: false,
    allPassAAA: false,
  };

  report.allPassAA = !!(
    report.primary?.passesAA &&
    report.secondary?.passesAA &&
    report.destructive?.passesAA &&
    report.muted?.passesAA &&
    report.accent?.passesAA
  );

  report.allPassAAA = !!(
    report.primary?.passesAAA &&
    report.secondary?.passesAAA &&
    report.destructive?.passesAAA &&
    report.muted?.passesAAA &&
    report.accent?.passesAAA
  );

  return report;
}

/**
 * Genera colori sicuri per accessibility
 */
export function generateAccessibleColors(
  baseColor: string,
  background: string,
  level: ContrastLevel = 'AA'
): { light: string; dark: string } {
  const rgb = hexToRgb(baseColor);
  if (!rgb) return { light: '#ffffff', dark: '#000000' };

  const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
  const isDark = luminance < 0.5;

  // Se il colore base è scuro, genera versioni chiare e viceversa
  const requiredRatio = CONTRAST_REQUIREMENTS[level].normal;

  // Versione chiara
  let lightColor = '#ffffff';
  // Versione scura
  let darkColor = '#000000';

  // Verifica e aggiusta se necessario
  const lightRatio = getContrastRatio(lightColor, background);
  const darkRatio = getContrastRatio(darkColor, background);

  return {
    light: (lightRatio && lightRatio >= requiredRatio) ? lightColor : '#ffffff',
    dark: (darkRatio && darkRatio >= requiredRatio) ? darkColor : '#000000',
  };
}

export default {
  hexToRgb,
  getLuminance,
  getContrastRatio,
  meetsContrastRequirement,
  checkContrast,
  findAccessibleColor,
  getIdealTextColor,
  checkThemeContrast,
  generateAccessibleColors,
  CONTRAST_REQUIREMENTS,
  NON_TEXT_CONTRAST_RATIO,
  COLORS,
};
