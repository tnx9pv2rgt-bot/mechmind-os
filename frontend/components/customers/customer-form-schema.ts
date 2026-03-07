import { z } from 'zod'

/**
 * Validazione Codice Fiscale Italiano
 * Algoritmo ufficiale Agenzia delle Entrate
 */
function validateCF(cf: string): boolean {
  if (!cf || cf.length !== 16) return false
  
  const cfUpper = cf.toUpperCase()
  const cfPattern = /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST]{1}[0-9LMNPQRSTUV]{2}[A-Z]{1}[0-9LMNPQRSTUV]{3}[A-Z]{1}$/
  
  if (!cfPattern.test(cfUpper)) return false
  
  // Validazione carattere di controllo
  const mapCharToNum: Record<string, number> = {
    '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5, 'G': 6, 'H': 7, 'I': 8, 'J': 9,
    'K': 10, 'L': 11, 'M': 12, 'N': 13, 'O': 14, 'P': 15, 'Q': 16, 'R': 17, 'S': 18, 'T': 19,
    'U': 20, 'V': 21, 'W': 22, 'X': 23, 'Y': 24, 'Z': 25
  }
  
  const mapOddPos: Record<string, number> = {
    '0': 1, '1': 0, '2': 5, '3': 7, '4': 9, '5': 13, '6': 15, '7': 17, '8': 19, '9': 21,
    'A': 1, 'B': 0, 'C': 5, 'D': 7, 'E': 9, 'F': 13, 'G': 15, 'H': 17, 'I': 19, 'J': 21,
    'K': 2, 'L': 4, 'M': 18, 'N': 20, 'O': 11, 'P': 3, 'Q': 6, 'R': 8, 'S': 12, 'T': 14,
    'U': 16, 'V': 10, 'W': 22, 'X': 25, 'Y': 24, 'Z': 23
  }
  
  let sum = 0
  for (let i = 0; i < 15; i++) {
    const char = cfUpper[i]
    if (i % 2 === 0) {
      // Posizione dispari (0-based = pari)
      sum += mapOddPos[char] || 0
    } else {
      // Posizione pari (0-based = dispari)
      sum += mapCharToNum[char] || 0
    }
  }
  
  const controlChar = String.fromCharCode(65 + (sum % 26))
  return cfUpper[15] === controlChar
}

/**
 * Validazione Telefono Italiano
 * Formati accettati: +39 3xx xxx xxxx, 3xx xxx xxxx, etc.
 */
function validateItalianPhone(phone: string): boolean {
  if (!phone) return true // Opzionale
  const cleaned = phone.replace(/[\s\-\.\(\)]/g, '')
  const phonePattern = /^(\+39)?[0-9]{9,10}$/
  return phonePattern.test(cleaned)
}

export const customerFormSchema = z.object({
  nome: z
    .string()
    .min(2, 'Il nome deve contenere almeno 2 caratteri')
    .max(50, 'Il nome non può superare 50 caratteri')
    .regex(/^[a-zA-ZàèéìòùÀÈÉÌÒÙ\s'-]+$/, 'Il nome contiene caratteri non validi'),
  
  cognome: z
    .string()
    .min(2, 'Il cognome deve contenere almeno 2 caratteri')
    .max(50, 'Il cognome non può superare 50 caratteri')
    .regex(/^[a-zA-ZàèéìòùÀÈÉÌÒÙ\s'-]+$/, 'Il cognome contiene caratteri non validi'),
  
  email: z
    .string()
    .min(1, 'L\'email è obbligatoria')
    .email('Inserisci un\'email valida')
    .max(100, 'L\'email non può superare 100 caratteri'),
  
  telefono: z
    .string()
    .optional()
    .refine(
      (val) => !val || validateItalianPhone(val),
      'Inserisci un numero di telefono italiano valido (es. +39 333 123 4567)'
    ),
  
  codiceFiscale: z
    .string()
    .optional()
    .refine(
      (val) => !val || validateCF(val),
      'Codice Fiscale non valido. Verifica di aver inserito correttamente i 16 caratteri'
    ),
  
  indirizzo: z
    .string()
    .max(200, 'L\'indirizzo non può superare 200 caratteri')
    .optional(),
  
  citta: z
    .string()
    .max(50, 'La città non può superare 50 caratteri')
    .optional(),
  
  cap: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^[0-9]{5}$/.test(val),
      'Il CAP deve essere composto da 5 cifre'
    ),
  
  note: z
    .string()
    .max(1000, 'Le note non possono superare 1000 caratteri')
    .optional(),
})

export type CustomerFormData = z.infer<typeof customerFormSchema>

export const defaultCustomerValues: Partial<CustomerFormData> = {
  nome: '',
  cognome: '',
  email: '',
  telefono: '',
  codiceFiscale: '',
  indirizzo: '',
  citta: '',
  cap: '',
  note: '',
}
