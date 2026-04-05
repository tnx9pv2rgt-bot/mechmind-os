'use client';

import { useEffect } from 'react';
import { useThemeStore, FONT_OPTIONS } from '@/stores/theme-store';

/** Convert hex to OKLCH string for CSS */
function hexToOKLCH(hex: string): { l: number; c: number; h: number; css: string } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  // sRGB → linear RGB
  const toLinear = (v: number): number => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);

  // Linear RGB → OKLab
  const l_ = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m_ = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s_ = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const bOK = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;

  // OKLab → OKLCH
  const C = Math.sqrt(a * a + bOK * bOK);
  let H = (Math.atan2(bOK, a) * 180) / Math.PI;
  if (H < 0) H += 360;

  return {
    l: Math.round(L * 1000) / 1000,
    c: Math.round(C * 1000) / 1000,
    h: Math.round(H * 10) / 10,
    css: `oklch(${(Math.round(L * 1000) / 1000)} ${(Math.round(C * 1000) / 1000)} ${(Math.round(H * 10) / 10)})`,
  };
}

/** Convert hex to HSL string for shadcn/ui compat */
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

/** Applies all theme settings as CSS custom properties on :root */
export function useThemeApplier(): void {
  const {
    primaryColor,
    sidebarColor,
    fontFamily,
    fontSize,
    density,
    borderRadius,
    contentWidth,
    animations,
    contrast,
  } = useThemeStore();

  useEffect(() => {
    const root = document.documentElement;

    // ── Brand color (OKLCH for modern palette, HSL for shadcn compat) ──
    const oklch = hexToOKLCH(primaryColor);
    const hsl = hexToHSL(primaryColor);

    root.style.setProperty('--brand', oklch.css);
    root.style.setProperty('--brand-hue', String(oklch.h));
    root.style.setProperty('--brand-chroma', String(oklch.c));
    root.style.setProperty('--brand-lightness', String(oklch.l));
    root.style.setProperty('--color-primary', primaryColor);

    // shadcn/ui HSL compat
    root.style.setProperty('--primary', hsl);
    root.style.setProperty('--accent', hsl);
    root.style.setProperty('--ring', hsl);

    // ── Sidebar color ──
    root.style.setProperty('--sidebar-bg', sidebarColor);

    // ── Font family ──
    const fontOption = FONT_OPTIONS.find(f => f.value === fontFamily);
    if (fontOption) {
      root.style.setProperty('--font-custom', fontOption.css);
      document.body.style.fontFamily = fontOption.css;
    }

    // ── Font size ──
    const fontSizeMap = { small: '15px', medium: '17px', large: '19px' };
    root.style.setProperty('--font-size-base', fontSizeMap[fontSize]);
    document.body.style.fontSize = fontSizeMap[fontSize];

    // ── Density (scale-based approach like Radix UI) ──
    const densityMap = {
      compact: { scale: '0.85', pagePadding: '12px', cardPadding: '16px', gap: '8px', itemPadding: '6px 12px' },
      normal: { scale: '1', pagePadding: '24px', cardPadding: '24px', gap: '16px', itemPadding: '8px 16px' },
      spacious: { scale: '1.15', pagePadding: '32px', cardPadding: '32px', gap: '24px', itemPadding: '12px 20px' },
    };
    const d = densityMap[density];
    root.style.setProperty('--density-scale', d.scale);
    root.style.setProperty('--density-page-padding', d.pagePadding);
    root.style.setProperty('--density-card-padding', d.cardPadding);
    root.style.setProperty('--density-gap', d.gap);
    root.style.setProperty('--density-item-padding', d.itemPadding);

    // ── Border radius (derives sm/md/lg from base) ──
    const radiusMap = { none: '0px', small: '4px', medium: '8px', large: '12px', pill: '20px' };
    const baseRadius = radiusMap[borderRadius];
    root.style.setProperty('--radius-custom', baseRadius);
    root.style.setProperty('--radius-sm', `calc(${baseRadius} * 0.5)`);
    root.style.setProperty('--radius-md', baseRadius);
    root.style.setProperty('--radius-lg', `calc(${baseRadius} * 1.5)`);

    // ── Content width ──
    root.style.setProperty('--content-max-width', contentWidth === 'centered' ? '1200px' : '100%');

    // ── Animations ──
    if (animations === 'none') {
      root.style.setProperty('--animation-duration', '0ms');
    } else if (animations === 'reduced') {
      root.style.setProperty('--animation-duration', '100ms');
    } else {
      root.style.setProperty('--animation-duration', '300ms');
    }

    // ── Contrast ──
    if (contrast === 'high') {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
  }, [primaryColor, sidebarColor, fontFamily, fontSize, density, borderRadius, contentWidth, animations, contrast]);
}
