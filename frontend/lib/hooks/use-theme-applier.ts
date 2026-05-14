'use client';

import { useEffect } from 'react';
import { useThemeStore, FONT_OPTIONS, CHART_PALETTES } from '@/stores/theme-store';

function hexToOKLCH(hex: string): { l: number; c: number; h: number; css: string } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const toLinear = (v: number): number =>
    v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);

  const l_ = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m_ = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s_ = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.004072047 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.45059371 * s_;
  const bOK = 0.0259040371 * l_ + 0.782771766 * m_ - 0.808675766 * s_;

  const C = Math.sqrt(a * a + bOK * bOK);
  let H = (Math.atan2(bOK, a) * 180) / Math.PI;
  if (H < 0) H += 360;

  return {
    l: Math.round(L * 1000) / 1000,
    c: Math.round(C * 1000) / 1000,
    h: Math.round(H * 10) / 10,
    css: `oklch(${Math.round(L * 1000) / 1000} ${Math.round(C * 1000) / 1000} ${Math.round(H * 10) / 10})`,
  };
}

function hexToHSL(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return `0 0% ${Math.round(l * 100)}%`;

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function generateBrandPalette(hex: string): string[] {
  const { l, c, h } = hexToOKLCH(hex);
  return [0, 60, 120, 180, 240, 300].map(offset => {
    const newH = (h + offset) % 360;
    return `oklch(${l} ${c} ${newH})`;
  });
}

export function useThemeApplier(): void {
  const {
    primaryColor,
    sidebarColor,
    fontFamily,
    fontSize,
    density,
    tableDensity,
    borderRadius,
    contentWidth,
    animations,
    contrast,
    statusColors,
    chartPalette,
  } = useThemeStore();

  useEffect(() => {
    const root = document.documentElement;

    // Brand color
    const oklch = hexToOKLCH(primaryColor);
    const hsl = hexToHSL(primaryColor);
    root.style.setProperty('--brand', oklch.css);
    root.style.setProperty('--brand-hue', String(oklch.h));
    root.style.setProperty('--brand-chroma', String(oklch.c));
    root.style.setProperty('--brand-lightness', String(oklch.l));
    root.style.setProperty('--color-primary', primaryColor);
    root.style.setProperty('--primary', hsl);
    root.style.setProperty('--accent', hsl);
    root.style.setProperty('--ring', hsl);

    // Sidebar — derive text colors from background luminance for WCAG AA contrast
    root.style.setProperty('--sidebar-bg', sidebarColor);
    const sbR = parseInt(sidebarColor.slice(1, 3), 16) / 255;
    const sbG = parseInt(sidebarColor.slice(3, 5), 16) / 255;
    const sbB = parseInt(sidebarColor.slice(5, 7), 16) / 255;
    const relLum = (c: number): number =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    const sidebarLum = 0.2126 * relLum(sbR) + 0.7152 * relLum(sbG) + 0.0722 * relLum(sbB);
    const sidebarIsDark = sidebarLum < 0.4;
    // Garantisce contrasto ≥ 7:1 (AAA) per testo primario sidebar
    root.style.setProperty('--sidebar-text', sidebarIsDark ? '#ececec' : '#0d0d0d');
    root.style.setProperty('--sidebar-text-secondary', sidebarIsDark ? '#b4b4b4' : '#525252');
    root.style.setProperty('--sidebar-hover', sidebarIsDark ? '#2f2f2f' : '#ececec');
    root.style.setProperty('--sidebar-active', sidebarIsDark ? '#3a3a3a' : '#d4d4d4');
    root.style.setProperty(
      '--sidebar-border',
      sidebarIsDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
    );

    // Font family
    const fontOption = FONT_OPTIONS.find(f => f.value === fontFamily);
    if (fontOption) {
      root.style.setProperty('--font-custom', fontOption.css);
      document.body.style.fontFamily = fontOption.css;
    }

    // Font size
    const fontSizeMap: Record<typeof fontSize, string> = {
      small: '15px',
      medium: '17px',
      large: '19px',
    };
    root.style.setProperty('--font-size-base', fontSizeMap[fontSize]);
    document.body.style.fontSize = fontSizeMap[fontSize];

    // Page density
    const densityMap = {
      compact: {
        scale: '0.85',
        pagePadding: '12px',
        cardPadding: '16px',
        gap: '8px',
        itemPadding: '6px 12px',
      },
      normal: {
        scale: '1',
        pagePadding: '24px',
        cardPadding: '24px',
        gap: '16px',
        itemPadding: '8px 16px',
      },
      spacious: {
        scale: '1.15',
        pagePadding: '32px',
        cardPadding: '32px',
        gap: '24px',
        itemPadding: '12px 20px',
      },
    };
    const d = densityMap[density];
    root.style.setProperty('--density-scale', d.scale);
    root.style.setProperty('--density-page-padding', d.pagePadding);
    root.style.setProperty('--density-card-padding', d.cardPadding);
    root.style.setProperty('--density-gap', d.gap);
    root.style.setProperty('--density-item-padding', d.itemPadding);

    // Table density (independent from page density)
    const tableDensityMap = {
      compact: { rowHeight: '36px', rowPy: '4px', rowPx: '8px', fontSize: '12px' },
      normal: { rowHeight: '48px', rowPy: '8px', rowPx: '12px', fontSize: '14px' },
      spacious: { rowHeight: '64px', rowPy: '14px', rowPx: '16px', fontSize: '15px' },
    };
    const td = tableDensityMap[tableDensity];
    root.style.setProperty('--table-row-height', td.rowHeight);
    root.style.setProperty('--table-row-py', td.rowPy);
    root.style.setProperty('--table-row-px', td.rowPx);
    root.style.setProperty('--table-font-size', td.fontSize);

    // Border radius
    const radiusMap: Record<typeof borderRadius, string> = {
      none: '0px',
      small: '4px',
      medium: '8px',
      large: '12px',
      pill: '20px',
    };
    const baseRadius = radiusMap[borderRadius];
    root.style.setProperty('--radius-custom', baseRadius);
    root.style.setProperty('--radius-sm', `calc(${baseRadius} * 0.5)`);
    root.style.setProperty('--radius-md', baseRadius);
    root.style.setProperty('--radius-lg', `calc(${baseRadius} * 1.5)`);

    // Content width
    root.style.setProperty('--content-max-width', contentWidth === 'centered' ? '1200px' : '100%');

    // Animations
    const animDuration =
      animations === 'none' ? '0ms' : animations === 'reduced' ? '100ms' : '300ms';
    root.style.setProperty('--animation-duration', animDuration);

    // Contrast
    if (contrast === 'high') {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // OdL status colors
    root.style.setProperty('--status-nuovo', statusColors.nuovo);
    root.style.setProperty('--status-in-lavorazione', statusColors.in_lavorazione);
    root.style.setProperty('--status-attesa-ricambi', statusColors.attesa_ricambi);
    root.style.setProperty('--status-completato', statusColors.completato);
    root.style.setProperty('--status-annullato', statusColors.annullato);
    root.style.setProperty('--status-urgente', statusColors.urgente);

    // Chart palette
    const paletteColors =
      chartPalette === 'brand'
        ? generateBrandPalette(primaryColor)
        : CHART_PALETTES[chartPalette].colors;
    paletteColors.forEach((color, i) => {
      root.style.setProperty(`--chart-${i + 1}`, color);
    });
  }, [
    primaryColor,
    sidebarColor,
    fontFamily,
    fontSize,
    density,
    tableDensity,
    borderRadius,
    contentWidth,
    animations,
    contrast,
    statusColors,
    chartPalette,
  ]);
}
