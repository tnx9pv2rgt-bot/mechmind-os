/**
 * Input Mask Configurations
 * Best Practice 2026: IMask for production-grade input masking
 */

export const maskConfigs = {
  // P.IVA: IT + 11 numeri
  piva: {
    mask: 'IT 00000000000',
    lazy: false,
    prepare: (str: string) => str.toUpperCase(),
    definitions: {
      '0': /[0-9]/
    }
  },

  // CAP: 5 numeri
  cap: {
    mask: '00000',
    lazy: true,
    definitions: {
      '0': /[0-9]/
    }
  },

  // Codice SDI: 7 caratteri alfanumerici maiuscoli
  sdi: {
    mask: 'AAAAAAA',
    lazy: true,
    prepare: (str: string) => str.toUpperCase(),
    definitions: {
      'A': /[A-Z0-9]/
    }
  },

  // Telefono italiano: +39 XXX XXX XXXX
  phone: {
    mask: '+39 000 000 0000',
    lazy: false,
    definitions: {
      '0': /[0-9]/
    }
  },

  // Data: GG/MM/AAAA
  date: {
    mask: '00/00/0000',
    lazy: true,
    definitions: {
      '0': /[0-9]/
    }
  },

  // Codice Fiscale: 16 caratteri
  codiceFiscale: {
    mask: 'AAAAAA00A00A000A',
    lazy: true,
    prepare: (str: string) => str.toUpperCase(),
    definitions: {
      'A': /[A-Z]/,
      '0': /[0-9]/
    }
  }
} as const;

export type MaskType = keyof typeof maskConfigs;
export const getMaskConfig = (type: MaskType) => maskConfigs[type];
