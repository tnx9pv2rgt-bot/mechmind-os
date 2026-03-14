/**
 * Contrast Tests
 * Tests for color contrast utilities
 */

import {
  hexToRgb,
  getLuminance,
  getContrastRatio,
  meetsContrastRequirement,
  checkContrast,
  findAccessibleColor,
  getIdealTextColor,
  checkThemeContrast,
  CONTRAST_REQUIREMENTS,
  COLORS,
} from '@/lib/accessibility/contrast';

describe('hexToRgb', () => {
  it('should convert 6-digit hex to RGB', () => {
    expect(hexToRgb('#FFFFFF')).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    expect(hexToRgb('#FF0000')).toEqual({ r: 255, g: 0, b: 0 });
    expect(hexToRgb('#00FF00')).toEqual({ r: 0, g: 255, b: 0 });
    expect(hexToRgb('#0000FF')).toEqual({ r: 0, g: 0, b: 255 });
  });

  it('should convert 3-digit hex to RGB', () => {
    expect(hexToRgb('#FFF')).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb('#000')).toEqual({ r: 0, g: 0, b: 0 });
    expect(hexToRgb('#F00')).toEqual({ r: 255, g: 0, b: 0 });
  });

  it('should handle hex without hash', () => {
    expect(hexToRgb('FFFFFF')).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb('000000')).toEqual({ r: 0, g: 0, b: 0 });
  });

  it('should return null for invalid hex', () => {
    expect(hexToRgb('')).toBeNull();
    expect(hexToRgb('GGG')).toBeNull();
    expect(hexToRgb('#12')).toBeNull();
  });
});

describe('getLuminance', () => {
  it('should calculate luminance for black and white', () => {
    expect(getLuminance(0, 0, 0)).toBe(0);
    expect(getLuminance(255, 255, 255)).toBe(1);
  });

  it('should calculate luminance for colors', () => {
    const redLuminance = getLuminance(255, 0, 0);
    expect(redLuminance).toBeGreaterThan(0);
    expect(redLuminance).toBeLessThan(1);

    const greenLuminance = getLuminance(0, 255, 0);
    expect(greenLuminance).toBeGreaterThan(redLuminance); // Green is brighter
  });
});

describe('getContrastRatio', () => {
  it('should calculate contrast ratio for black and white', () => {
    const ratio = getContrastRatio('#000000', '#FFFFFF');
    expect(ratio).toBe(21); // Maximum contrast
  });

  it('should calculate contrast ratio for same colors', () => {
    const ratio = getContrastRatio('#FFFFFF', '#FFFFFF');
    expect(ratio).toBe(1); // No contrast
  });

  it('should be symmetric', () => {
    const ratio1 = getContrastRatio('#FF0000', '#00FF00');
    const ratio2 = getContrastRatio('#00FF00', '#FF0000');
    expect(ratio1).toBe(ratio2);
  });

  it('should return null for invalid colors', () => {
    expect(getContrastRatio('invalid', '#FFFFFF')).toBeNull();
    expect(getContrastRatio('#FFFFFF', 'invalid')).toBeNull();
  });
});

describe('meetsContrastRequirement', () => {
  it('should validate AA normal contrast', () => {
    expect(meetsContrastRequirement('#000000', '#FFFFFF', 'AA', 'normal')).toBe(true);
    expect(meetsContrastRequirement('#FFFFFF', '#767676', 'AA', 'normal')).toBe(true);
  });

  it('should validate AA large contrast', () => {
    expect(meetsContrastRequirement('#FFFFFF', '#767676', 'AA', 'large')).toBe(true);
  });

  it('should validate AAA contrast', () => {
    expect(meetsContrastRequirement('#000000', '#FFFFFF', 'AAA', 'normal')).toBe(true);
    expect(meetsContrastRequirement('#000000', '#595959', 'AAA', 'normal')).toBe(false);
  });
});

describe('checkContrast', () => {
  it('should return complete contrast info', () => {
    const result = checkContrast('#000000', '#FFFFFF');
    expect(result).not.toBeNull();
    expect(result?.ratio).toBe(21);
    expect(result?.passesAA).toBe(true);
    expect(result?.passesAAA).toBe(true);
    expect(result?.passesAALarge).toBe(true);
    expect(result?.passesAAALarge).toBe(true);
    expect(result?.recommendedLevel).toBe('AAA');
  });

  it('should handle failing contrast', () => {
    const result = checkContrast('#FFFFFF', '#EEEEEE');
    expect(result?.passesAA).toBe(false);
    expect(result?.recommendedLevel).toBe('AA');
  });

  it('should return null for invalid colors', () => {
    expect(checkContrast('invalid', '#FFFFFF')).toBeNull();
  });
});

describe('findAccessibleColor', () => {
  it('should return preferred color if accessible', () => {
    const result = findAccessibleColor('#FFFFFF', '#000000');
    expect(result?.color).toBe('#000000');
    expect(result?.isPreferred).toBe(true);
  });

  it('should find alternative if preferred fails', () => {
    const result = findAccessibleColor('#FFFFFF', '#EEEEEE', ['#000000']);
    expect(result?.color).toBe('#000000');
    expect(result?.isPreferred).toBe(false);
  });

  it('should return null if no accessible color found', () => {
    const result = findAccessibleColor('#FFFFFF', '#EEEEEE', ['#DDDDDD']);
    expect(result).toBeNull();
  });
});

describe('getIdealTextColor', () => {
  it('should return black for light backgrounds', () => {
    expect(getIdealTextColor('#FFFFFF')).toBe('#000000');
    expect(getIdealTextColor('#EEEEEE')).toBe('#000000');
    expect(getIdealTextColor('#FFFF00')).toBe('#000000');
  });

  it('should return white for dark backgrounds', () => {
    expect(getIdealTextColor('#000000')).toBe('#FFFFFF');
    expect(getIdealTextColor('#333333')).toBe('#FFFFFF');
    expect(getIdealTextColor('#0000FF')).toBe('#FFFFFF');
  });
});

describe('checkThemeContrast', () => {
  it('should check all theme colors', () => {
    const report = checkThemeContrast(COLORS);
    expect(report.primary).not.toBeNull();
    expect(report.secondary).not.toBeNull();
    expect(report.destructive).not.toBeNull();
    expect(typeof report.allPassAA).toBe('boolean');
    expect(typeof report.allPassAAA).toBe('boolean');
  });

  it('should identify contrast issues', () => {
    const badTheme = {
      background: '#FFFFFF',
      foreground: '#EEEEEE', // Poor contrast
      primary: '#EEEEEE',
      primaryForeground: '#FFFFFF',
    };
    const report = checkThemeContrast(badTheme);
    expect(report.allPassAA).toBe(false);
  });
});

describe('Contrast Requirements Constants', () => {
  it('should have correct AA requirements', () => {
    expect(CONTRAST_REQUIREMENTS.AA.normal).toBe(4.5);
    expect(CONTRAST_REQUIREMENTS.AA.large).toBe(3);
  });

  it('should have correct AAA requirements', () => {
    expect(CONTRAST_REQUIREMENTS.AAA.normal).toBe(7);
    expect(CONTRAST_REQUIREMENTS.AAA.large).toBe(4.5);
  });
});

describe('Color Constants', () => {
  it('should have valid hex colors', () => {
    Object.entries(COLORS).forEach(([name, value]) => {
      expect(hexToRgb(value)).not.toBeNull();
    });
  });
});
