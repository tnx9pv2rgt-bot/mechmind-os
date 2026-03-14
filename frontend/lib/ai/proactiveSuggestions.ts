/**
 * AI Proactive Suggestions - GitHub Copilot-style form assistance
 * Suggerimenti intelligenti che appaiono prima che l'utente chieda
 */

import { generateId } from '@/lib/utils';

// Types
export interface UserHistoryEntry {
  field: string;
  value: string | number | boolean | null;
  timestamp: number;
}

export interface ProactiveContext {
  currentField: string;
  currentValue: string;
  formData: Record<string, unknown>;
  userHistory?: UserHistoryEntry[];
  step: number;
}

export type SuggestionType = 'autofill' | 'correction' | 'optimization' | 'tip';

export interface SuggestionAction {
  label: string;
  handler: () => void;
}

export interface Suggestion {
  id: string;
  type: SuggestionType;
  message: string;
  action?: SuggestionAction;
  confidence: number;
  field?: string;
}

export type FillFieldFn = (field: string, value: string | number | boolean | null) => void;

// Cache per le chiamate API
interface CompanyData {
  name: string;
  address: string;
  city: string;
  cap: string;
  province: string;
}

const apiCache = new Map<string, { data: CompanyData | null; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 ore

/**
 * Classe principale per le suggestion proattive
 */
export class ProactiveAI {
  private fillField: FillFieldFn;
  private dismissedSuggestions: Set<string>;

  constructor(fillField: FillFieldFn) {
    this.fillField = fillField;
    this.dismissedSuggestions = this.loadDismissedSuggestions();
  }

  /**
   * Genera suggestion basate sul contesto attuale del form
   */
  async generateSuggestions(context: ProactiveContext): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    // 1. Email PEC suggestion
    const pecSuggestion = this.checkPecSuggestion(context);
    if (pecSuggestion) suggestions.push(pecSuggestion);

    // 2. Company data from VAT (Partita IVA italiana)
    const vatSuggestion = await this.checkVatSuggestion(context);
    if (vatSuggestion) suggestions.push(vatSuggestion);

    // 3. Password strength tip
    const passwordSuggestion = this.checkPasswordSuggestion(context);
    if (passwordSuggestion) suggestions.push(passwordSuggestion);

    // 4. Address correction
    const addressSuggestion = await this.checkAddressSuggestion(context);
    if (addressSuggestion) suggestions.push(addressSuggestion);

    // 5. Industry suggestion based on company name
    const industrySuggestion = this.checkIndustrySuggestion(context);
    if (industrySuggestion) suggestions.push(industrySuggestion);

    // 6. Smart default for business type
    const companyTypeSuggestion = this.checkCompanyTypeSuggestion(context);
    if (companyTypeSuggestion) suggestions.push(companyTypeSuggestion);

    // 7. Phone number formatting
    const phoneSuggestion = this.checkPhoneSuggestion(context);
    if (phoneSuggestion) suggestions.push(phoneSuggestion);

    // 8. CF (Codice Fiscale) validation and suggestion
    const cfSuggestion = this.checkCodiceFiscaleSuggestion(context);
    if (cfSuggestion) suggestions.push(cfSuggestion);

    // Filtra per confidence > 0.6 e suggestion non dismissate
    return suggestions
      .filter(s => s.confidence > 0.6)
      .filter(s => !this.isDismissed(s.id));
  }

  /**
   * Dismissa una suggestion (salva in localStorage)
   */
  dismissSuggestion(id: string): void {
    this.dismissedSuggestions.add(id);
    this.saveDismissedSuggestions();
  }

  /**
   * Controlla se suggerire PEC per email consumer
   */
  private checkPecSuggestion(context: ProactiveContext): Suggestion | null {
    if (context.currentField !== 'email') return null;
    
    const email = context.currentValue;
    const consumerDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'libero.it', 'virgilio.it'];
    
    const domain = email.split('@')[1];
    if (!domain || !consumerDomains.includes(domain.toLowerCase())) return null;

    const pecDomain = this.getPecDomain(domain);
    const pecEmail = email.replace(`@${domain}`, `@pec.${domain}`);

    return {
      id: `pec-suggestion-${email}`,
      type: 'optimization',
      message: `Per la fatturazione elettronica, considera di usare una PEC. Suggerimento: ${pecEmail}`,
      action: {
        label: 'Usa questa PEC',
        handler: () => this.fillField('pec', pecEmail)
      },
      confidence: 0.75,
      field: 'pec'
    };
  }

  /**
   * Controlla se recuperare dati aziendali dalla Partita IVA
   */
  private async checkVatSuggestion(context: ProactiveContext): Promise<Suggestion | null> {
    if (context.currentField !== 'vatNumber' && context.currentField !== 'partitaIva') return null;
    
    const vat = context.currentValue.replace(/\s/g, '');
    
    // Partita IVA italiana: 11 cifre
    if (!/^\d{11}$/.test(vat)) return null;

    try {
      const companyData = await this.fetchCompanyData(vat);
      if (!companyData) return null;

      return {
        id: `company-autofill-${vat}`,
        type: 'autofill',
        message: `Ho trovato: ${companyData.name} - ${companyData.address}. Vuoi autocompletare i dati?`,
        action: {
          label: 'Autocompleta',
          handler: () => {
            this.fillField('companyName', companyData.name);
            this.fillField('ragioneSociale', companyData.name);
            this.fillField('address', companyData.address);
            this.fillField('city', companyData.city);
            this.fillField('cap', companyData.cap);
            this.fillField('province', companyData.province);
          }
        },
        confidence: 0.95,
        field: 'companyName'
      };
    } catch (error) {
      console.error('Error fetching company data:', error);
      return null;
    }
  }

  /**
   * Controlla forza password
   */
  private checkPasswordSuggestion(context: ProactiveContext): Suggestion | null {
    if (context.currentField !== 'password' && context.currentField !== 'newPassword') return null;
    
    const password = context.currentValue;
    if (password.length === 0) return null;

    const strength = this.checkPasswordStrength(password);
    
    if (strength.score < 3) {
      const tips: string[] = [];
      if (!strength.hasNumber) tips.push('numeri');
      if (!strength.hasSymbol) tips.push('simboli');
      if (!strength.hasUpper) tips.push('lettere maiuscole');
      if (password.length < 8) tips.push('almeno 8 caratteri');

      return {
        id: `password-tip-${context.currentField}`,
        type: 'tip',
        message: `Aggiungi ${tips.join(', ')} per rendere la password più sicura`,
        confidence: 0.85,
        field: context.currentField
      };
    }

    return null;
  }

  /**
   * Controlla correzione indirizzo
   */
  private async checkAddressSuggestion(context: ProactiveContext): Promise<Suggestion | null> {
    if (context.currentField !== 'address' && context.currentField !== 'indirizzo') return null;
    
    const address = context.currentValue;
    if (address.length < 5) return null;

    // Pattern comuni di errori
    const corrections: Record<string, string> = {
      'via ': 'Via ',
      'viale ': 'Viale ',
      'corso ': 'Corso ',
      'piazza ': 'Piazza ',
      'piazzale ': 'Piazzale ',
      'largo ': 'Largo ',
      'borgo ': 'Borgo ',
      'strada ': 'Strada ',
    };

    let corrected = address;
    let hasCorrection = false;

    // Correggi maiuscole/minuscole
    for (const [wrong, right] of Object.entries(corrections)) {
      if (address.toLowerCase().startsWith(wrong) && !address.startsWith(right)) {
        corrected = right + address.slice(wrong.length);
        hasCorrection = true;
        break;
      }
    }

    // Correggi numero civico (es. "12a" -> "12/A")
    const civicoMatch = corrected.match(/(\d+)([a-z])$/i);
    if (civicoMatch && !corrected.includes('/')) {
      corrected = corrected.replace(/(\d+)([a-z])$/i, '$1/$2');
      hasCorrection = true;
    }

    if (!hasCorrection || corrected === address) return null;

    return {
      id: `address-correction-${address}`,
      type: 'correction',
      message: `Intendevi: "${corrected}"?`,
      action: {
        label: 'Correggi',
        handler: () => this.fillField(context.currentField, corrected)
      },
      confidence: 0.85,
      field: context.currentField
    };
  }

  /**
   * Predice settore dall'azienda
   */
  private checkIndustrySuggestion(context: ProactiveContext): Suggestion | null {
    if (context.currentField !== 'companyName' && context.currentField !== 'ragioneSociale') return null;
    
    const companyName = context.currentValue;
    if (companyName.length < 3) return null;
    
    // Se già settato, non suggerire
    if (context.formData.industry || context.formData.settore) return null;

    const industry = this.predictIndustry(companyName);
    if (!industry) return null;

    return {
      id: `industry-suggestion-${companyName}`,
      type: 'autofill',
      message: `Sembra che tu sia nel settore "${industry}". È corretto?`,
      action: {
        label: 'Sì, seleziona',
        handler: () => this.fillField('industry', industry)
      },
      confidence: 0.7,
      field: 'industry'
    };
  }

  /**
   * Controlla tipo azienda dal dominio email
   */
  private checkCompanyTypeSuggestion(context: ProactiveContext): Suggestion | null {
    if (context.currentField !== 'companyName' && context.currentField !== 'ragioneSociale') return null;
    
    const email = context.formData.email;
    if (!email || typeof email !== 'string') return null;

    const domain = email.split('@')[1];
    if (!domain) return null;

    const domainLower = domain.toLowerCase();
    let type: string | null = null;
    let confidence = 0.7;

    if (domainLower.includes('srl')) {
      type = 'SRL';
    } else if (domainLower.includes('spa')) {
      type = 'SPA';
    } else if (domainLower.includes('sas')) {
      type = 'SAS';
    } else if (domainLower.includes('snc')) {
      type = 'SNC';
    } else if (domainLower.includes('coop')) {
      type = 'Cooperativa';
    }

    if (!type) return null;

    // Se già settato, non suggerire
    if (context.formData.companyType || context.formData.tipoAzienda) return null;

    return {
      id: `company-type-${type}`,
      type: 'autofill',
      message: `Dal dominio email, sembra una ${type}. Vuoi selezionarlo?`,
      action: {
        label: 'Seleziona',
        handler: () => this.fillField('companyType', type)
      },
      confidence,
      field: 'companyType'
    };
  }

  /**
   * Controlla formattazione telefono
   */
  private checkPhoneSuggestion(context: ProactiveContext): Suggestion | null {
    if (context.currentField !== 'phone' && context.currentField !== 'telefono') return null;
    
    const phone = context.currentValue.replace(/\s/g, '');
    if (phone.length < 9) return null;

    // Se già formattato correttamente
    if (phone.startsWith('+39') || phone.startsWith('0039')) return null;

    // Numero italiano senza prefisso
    if (/^\d{9,10}$/.test(phone)) {
      const formatted = `+39 ${phone.replace(/(\d{3})(?=\d)/g, '$1 ').trim()}`;
      
      return {
        id: `phone-format-${phone}`,
        type: 'optimization',
        message: `Vuoi formattare il numero con il prefisso italiano?`,
        action: {
          label: 'Formatta',
          handler: () => this.fillField(context.currentField, formatted)
        },
        confidence: 0.8,
        field: context.currentField
      };
    }

    return null;
  }

  /**
   * Controlla validità Codice Fiscale
   */
  private checkCodiceFiscaleSuggestion(context: ProactiveContext): Suggestion | null {
    if (context.currentField !== 'codiceFiscale' && context.currentField !== 'cf') return null;
    
    const cf = context.currentValue.toUpperCase().replace(/\s/g, '');
    if (cf.length !== 16) return null;

    const isValid = this.validateCodiceFiscale(cf);
    
    if (!isValid) {
      return {
        id: `cf-validation-${cf}`,
        type: 'correction',
        message: 'Il Codice Fiscale inserito non sembra valido. Controlla le cifre.',
        confidence: 0.9,
        field: context.currentField
      };
    }

    return null;
  }

  // ==================== Helper Methods ====================

  /**
   * Predice il settore dal nome azienda
   */
  private predictIndustry(companyName: string): string | null {
    const keywords: Record<string, string> = {
      'auto': 'Automotive',
      'car': 'Automotive',
      'moto': 'Automotive',
      'motor': 'Automotive',
      'tech': 'Tecnologia',
      'software': 'Tecnologia',
      'digital': 'Tecnologia',
      'it': 'Tecnologia',
      'web': 'Tecnologia',
      'app': 'Tecnologia',
      'food': 'Food & Beverage',
      'ristor': 'Food & Beverage',
      'pizza': 'Food & Beverage',
      'caffe': 'Food & Beverage',
      'bar': 'Food & Beverage',
      'consul': 'Consulenza',
      'legal': 'Legale',
      'avv': 'Legale',
      'studio': 'Consulenza',
      'commercialista': 'Consulenza',
      'ragionier': 'Consulenza',
      'ingegner': 'Ingegneria',
      'arch': 'Architettura',
      'design': 'Design',
      'media': 'Media & Comunicazione',
      'marketing': 'Marketing',
      'shop': 'Retail',
      'store': 'Retail',
      'costruzioni': 'Edilizia',
      'edil': 'Edilizia',
      'immobiliar': 'Immobiliare',
      'sanit': 'Sanità',
      'farm': 'Farmacia',
      'sport': 'Sport',
      'fitness': 'Sport',
      'travel': 'Turismo',
      'tour': 'Turismo',
      'hotel': 'Ospitalità',
      'b&b': 'Ospitalità',
    };

    const lower = companyName.toLowerCase();
    for (const [keyword, industry] of Object.entries(keywords)) {
      if (lower.includes(keyword)) return industry;
    }

    return null;
  }

  /**
   * Controlla forza password
   */
  private checkPasswordStrength(password: string): {
    score: number;
    hasNumber: boolean;
    hasSymbol: boolean;
    hasUpper: boolean;
  } {
    let score = 0;
    const hasNumber = /\d/.test(password);
    const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);

    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (hasNumber) score += 1;
    if (hasSymbol) score += 1;
    if (hasUpper && hasLower) score += 1;

    return { score, hasNumber, hasSymbol, hasUpper };
  }

  /**
   * Recupera dati aziendali dalla Partita IVA
   */
  private async fetchCompanyData(vat: string): Promise<CompanyData | null> {
    const cacheKey = `vat:${vat}`;
    const cached = apiCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    try {
      const response = await fetch(`/api/company/from-vat?vat=${vat}`);
      if (!response.ok) return null;
      
      const data = await response.json();
      
      apiCache.set(cacheKey, { data, timestamp: Date.now() });
      
      return data;
    } catch (error) {
      console.error('Error fetching VAT data:', error);
      return null;
    }
  }

  /**
   * Ottiene dominio PEC
   */
  private getPecDomain(domain: string): string {
    // Alcuni provider hanno domini PEC specifici
    const pecDomains: Record<string, string> = {
      'gmail.com': 'pec.it',
      'libero.it': 'pec.libero.it',
      'virgilio.it': 'pec.virgilio.it',
    };

    return pecDomains[domain] || `pec.${domain}`;
  }

  /**
   * Valida Codice Fiscale italiano
   */
  private validateCodiceFiscale(cf: string): boolean {
    if (cf.length !== 16) return false;
    
    const validChars = /^[A-Z0-9]+$/;
    if (!validChars.test(cf)) return false;

    // Pattern: 3 lettere + 3 lettere + 2 numeri + 1 lettera + 2 numeri + 1 lettera + 3 numeri + 1 lettera
    const pattern = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;
    return pattern.test(cf);
  }

  /**
   * Carica suggestion dismissate dal localStorage
   */
  private loadDismissedSuggestions(): Set<string> {
    if (typeof window === 'undefined') return new Set();
    
    try {
      const stored = localStorage.getItem('proactive-ai-dismissed');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  }

  /**
   * Salva suggestion dismissate nel localStorage
   */
  private saveDismissedSuggestions(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(
        'proactive-ai-dismissed',
        JSON.stringify(Array.from(this.dismissedSuggestions))
      );
    } catch (error) {
      console.error('Error saving dismissed suggestions:', error);
    }
  }

  /**
   * Controlla se una suggestion è stata dismissata
   */
  private isDismissed(id: string): boolean {
    return this.dismissedSuggestions.has(id);
  }
}

// ==================== Utility Functions ====================

/**
 * Hook utility per debounce
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Crea un suggerimento personalizzato
 */
export function createSuggestion(
  type: SuggestionType,
  message: string,
  action?: SuggestionAction,
  confidence = 0.8,
  field?: string
): Suggestion {
  return {
    id: generateId(),
    type,
    message,
    action,
    confidence,
    field
  };
}
