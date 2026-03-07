/**
 * Smart Field Prioritization
 * Algoritmi di prioritizzazione intelligente dei campi profilo
 */

import { FieldPriorityConfig, UserContext, ProfilingField } from './types'

// Configurazione predefinita delle priorità
export const DEFAULT_PRIORITY_CONFIG: FieldPriorityConfig = {
  high: ['phone', 'address.street', 'address.city', 'address.zipCode'], // Necessari per ordini
  medium: ['pec', 'sdi', 'companyName', 'vat'], // Necessari per fatturazione
  low: ['marketingPrefs.email', 'marketingPrefs.sms', 'industry', 'companySize'], // Opzionali
}

// Mappatura dell'ordine di priorità per il sorting
const PRIORITY_ORDER: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2,
}

/**
 * Ottiene la priorità di un campo
 */
function getFieldPriority(fieldName: string, config: FieldPriorityConfig = DEFAULT_PRIORITY_CONFIG): string {
  // Controlla nelle diverse categorie di priorità
  if (config.high.some(f => fieldName === f || fieldName.startsWith(f))) return 'high'
  if (config.medium.some(f => fieldName === f || fieldName.startsWith(f))) return 'medium'
  if (config.low.some(f => fieldName === f || fieldName.startsWith(f))) return 'low'
  
  // Default a medium per campi non configurati
  return 'medium'
}

/**
 * Ordina i campi mancanti per priorità
 */
export function prioritizeFields(
  missingFields: string[],
  userContext?: UserContext,
  config: FieldPriorityConfig = DEFAULT_PRIORITY_CONFIG
): string[] {
  // Se l'utente ha già effettuato ordini, prioritizza i campi di fatturazione
  const adjustedConfig = { ...config }
  
  if (userContext?.hasOrders) {
    // Sposta i campi di fatturazione in high priority
    adjustedConfig.high = [...config.high, 'companyName', 'vat', 'pec', 'sdi']
  }
  
  if (userContext?.hasInvoices) {
    // Se ha già ricevuto fatture, la fatturazione è già a posto
    adjustedConfig.medium = config.medium.filter(f => !['pec', 'sdi'].includes(f))
  }
  
  return [...missingFields].sort((a, b) => {
    const aPriority = getFieldPriority(a, adjustedConfig)
    const bPriority = getFieldPriority(b, adjustedConfig)
    
    return PRIORITY_ORDER[aPriority] - PRIORITY_ORDER[bPriority]
  })
}

/**
 * Calcola il punteggio di importanza di un campo basato sul contesto utente
 */
export function calculateFieldImportance(
  fieldName: string,
  userContext?: UserContext
): number {
  let score = 0
  
  // Punteggio base sulla priorità
  const priority = getFieldPriority(fieldName)
  score += priority === 'high' ? 100 : priority === 'medium' ? 50 : 10
  
  // Aggiustamenti basati sul contesto
  if (userContext) {
    // Se l'utente ha effettuato ordini, i campi di contatto sono più importanti
    if (userContext.hasOrders && ['phone', 'address.street'].some(f => fieldName.includes(f))) {
      score += 50
    }
    
    // Se l'utente non accede da molto tempo, prioritizza campi veloci da compilare
    const daysSinceLogin = userContext.lastLoginAt 
      ? Math.floor((Date.now() - new Date(userContext.lastLoginAt).getTime()) / (1000 * 60 * 60 * 24))
      : 0
    
    if (daysSinceLogin > 30 && !fieldName.includes('address')) {
      score += 20 // Campi non-indirizzo sono più veloci
    }
  }
  
  return score
}

/**
 * Raggruppa i campi per categoria
 */
export function groupFieldsByCategory(fields: string[]): Record<string, string[]> {
  const categories: Record<string, string[]> = {
    contact: [],
    billing: [],
    marketing: [],
    business: [],
  }
  
  fields.forEach(field => {
    if (['phone', 'email', 'address.street', 'address.city', 'address.zipCode', 'address.province'].includes(field)) {
      categories.contact.push(field)
    } else if (['pec', 'sdi', 'vat', 'fiscalCode'].includes(field)) {
      categories.billing.push(field)
    } else if (field.includes('marketingPrefs') || field === 'industry') {
      categories.marketing.push(field)
    } else {
      categories.business.push(field)
    }
  })
  
  return categories
}

/**
 * Seleziona il prossimo campo ottimale da richiedere
 */
export function selectNextField(
  missingFields: string[],
  userContext?: UserContext
): string | null {
  if (missingFields.length === 0) return null
  
  const prioritized = prioritizeFields(missingFields, userContext)
  return prioritized[0]
}

/**
 * Genera un messaggio personalizzato basato sui campi mancanti
 */
export function generateIncentiveMessage(
  missingFields: string[],
  stageIncentive: string | null
): string {
  const highPriorityCount = missingFields.filter(f => 
    DEFAULT_PRIORITY_CONFIG.high.includes(f)
  ).length
  
  if (highPriorityCount > 0) {
    return `Completa ${highPriorityCount} campo${highPriorityCount > 1 ? 'chi' : ''} essenziale${highPriorityCount > 1 ? 'i' : ''} per sbloccare: ${stageIncentive}`
  }
  
  return `Aggiungi ${missingFields.length} campo${missingFields.length > 1 ? 'pi' : ''} e ricevi: ${stageIncentive}`
}
