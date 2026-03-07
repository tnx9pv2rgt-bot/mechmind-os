/**
 * Parts Form Schema
 * Apple Design 2026 - Validazione inventario ricambi
 */

import { z } from 'zod'

// Categorie ricambi
export const PartCategory = z.enum([
  'filters',
  'brakes',
  'oil',
  'tires',
  'electrical',
  'mechanical',
  'bodywork',
  'suspension',
  'transmission',
  'cooling',
  'interior',
  'accessories',
])

// Stato stock
export const StockStatus = z.enum([
  'in_stock',
  'low_stock',
  'out_of_stock',
  'discontinued',
])

// Schema per compatibilità
export const CompatibilitySchema = z.object({
  make: z.string().min(1, 'Marca richiesta'),
  model: z.string().min(1, 'Modello richiesto'),
  yearFrom: z.number().min(1900, 'Anno non valido').max(2100, 'Anno non valido'),
  yearTo: z.number().min(1900, 'Anno non valido').max(2100, 'Anno non valido').optional(),
  engineCodes: z.array(z.string()).optional(),
  notes: z.string().max(500, 'Note troppo lunghe').optional(),
})

// Schema completo del form ricambi
export const PartFormSchema = z.object({
  // Informazioni base
  code: z
    .string()
    .min(3, 'Il codice deve essere di almeno 3 caratteri')
    .max(50, 'Codice troppo lungo')
    .regex(/^[A-Z0-9\-_.\/]+$/, 'Il codice può contenere solo lettere maiuscole, numeri, - _ . /'),
  name: z
    .string()
    .min(2, 'Il nome deve essere di almeno 2 caratteri')
    .max(200, 'Nome troppo lungo'),
  description: z
    .string()
    .max(2000, 'Descrizione troppo lunga')
    .optional(),
  category: PartCategory,
  
  // Fornitore
  supplier: z.string().min(1, 'Fornitore richiesto').max(100),
  supplierCode: z.string().max(50).optional(),
  
  // Prezzi
  purchasePrice: z
    .number()
    .min(0, 'Il prezzo non può essere negativo')
    .max(999999, 'Prezzo troppo alto'),
  sellingPrice: z
    .number()
    .min(0, 'Il prezzo non può essere negativo')
    .max(999999, 'Prezzo troppo alto'),
  vatRate: z
    .number()
    .min(0, 'IVA non valida')
    .max(100, 'IVA non valida')
    .default(22),
  
  // Stock
  stockQuantity: z
    .number()
    .int('La quantità deve essere un numero intero')
    .min(0, 'La quantità non può essere negativa')
    .max(999999, 'Quantità troppo alta'),
  minStockLevel: z
    .number()
    .int('La quantità deve essere un numero intero')
    .min(0, 'La quantità non può essere negativa')
    .max(999999, 'Quantità troppo alta'),
  maxStockLevel: z
    .number()
    .int('La quantità deve essere un numero intero')
    .min(0, 'La quantità non può essere negativa')
    .max(999999, 'Quantità troppo alta')
    .optional(),
  reorderPoint: z
    .number()
    .int('La quantità deve essere un numero intero')
    .min(0, 'La quantità non può essere negativa')
    .optional(),
  
  // Ubicazione
  location: z.string().max(100).optional(),
  warehouseZone: z.string().max(50).optional(),
  shelfNumber: z.string().max(20).optional(),
  drawerNumber: z.string().max(20).optional(),
  
  // Codici
  oemCode: z.string().max(50).optional(),
  eanCode: z.string().max(50).optional(),
  compatibleCodes: z.array(z.string().max(50)).max(20, 'Massimo 20 codici compatibili'),
  
  // Compatibilità veicoli
  vehicleCompatibility: z.array(CompatibilitySchema).max(100, 'Massimo 100 veicoli compatibili'),
  
  // Immagini
  images: z.array(
    z.object({
      id: z.string(),
      url: z.string().optional(),
      file: z.instanceof(File).optional(),
      isPrimary: z.boolean().default(false),
      caption: z.string().max(200).optional(),
    })
  ).max(10, 'Massimo 10 immagini'),
  
  // Note
  internalNotes: z.string().max(2000, 'Note troppo lunghe').optional(),
  installationNotes: z.string().max(2000, 'Note troppo lunghe').optional(),
  
  // Garanzia
  warrantyMonths: z.number().int().min(0).max(120).default(24),
  
  // Dimensioni (opzionale)
  weight: z.number().min(0).optional(),
  dimensions: z.object({
    length: z.number().min(0).optional(),
    width: z.number().min(0).optional(),
    height: z.number().min(0).optional(),
  }).optional(),
})

// Tipo derivato dallo schema
export type PartFormData = z.infer<typeof PartFormSchema>
export type PartCategoryType = z.infer<typeof PartCategory>
export type StockStatusType = z.infer<typeof StockStatus>

// Labels per categorie
export const CATEGORY_LABELS: Record<PartCategoryType, { label: string; icon: string; color: string }> = {
  filters: { label: 'Filtri', icon: 'Filter', color: '#0071e3' },
  brakes: { label: 'Freni', icon: 'CircleDot', color: '#ff3b30' },
  oil: { label: 'Olio', icon: 'Droplet', color: '#ff9500' },
  tires: { label: 'Pneumatici', icon: 'Circle', color: '#1d1d1f' },
  electrical: { label: 'Elettrico', icon: 'Zap', color: '#af52de' },
  mechanical: { label: 'Meccanica', icon: 'Cog', color: '#34c759' },
  bodywork: { label: 'Carrozzeria', icon: 'Square', color: '#5856d6' },
  suspension: { label: 'Sospensioni', icon: 'Activity', color: '#ff2d55' },
  transmission: { label: 'Trasmissione', icon: 'RotateCw', color: '#5ac8fa' },
  cooling: { label: 'Raffreddamento', icon: 'Thermometer', color: '#007aff' },
  interior: { label: 'Interni', icon: 'Armchair', color: '#bf5af2' },
  accessories: { label: 'Accessori', icon: 'Package', color: '#8e8e93' },
}

// Labels per stato stock
export const STOCK_STATUS_LABELS: Record<StockStatusType, { label: string; color: string; bgColor: string }> = {
  in_stock: { label: 'Disponibile', color: 'text-apple-green', bgColor: 'bg-apple-green/10' },
  low_stock: { label: 'Scorta Bassa', color: 'text-apple-orange', bgColor: 'bg-apple-orange/10' },
  out_of_stock: { label: 'Esaurito', color: 'text-apple-red', bgColor: 'bg-apple-red/10' },
  discontinued: { label: 'Fuori Produzione', color: 'text-apple-gray', bgColor: 'bg-apple-gray/10' },
}

// Valori predefiniti
export const defaultPartFormValues: Partial<PartFormData> = {
  category: 'filters',
  purchasePrice: 0,
  sellingPrice: 0,
  vatRate: 22,
  stockQuantity: 0,
  minStockLevel: 5,
  warrantyMonths: 24,
  compatibleCodes: [],
  vehicleCompatibility: [],
  images: [],
}

// Helper per calcolare lo stato dello stock
export function calculateStockStatus(
  quantity: number,
  minLevel: number,
  reorderPoint?: number
): StockStatusType {
  if (quantity === 0) return 'out_of_stock'
  if (reorderPoint && quantity <= reorderPoint) return 'low_stock'
  if (quantity <= minLevel) return 'low_stock'
  return 'in_stock'
}

// Helper per calcolare il margine
export function calculateMargin(
  purchasePrice: number,
  sellingPrice: number,
  vatRate: number = 22
): { marginPercent: number; marginAmount: number; markupPercent: number } {
  const purchaseWithVat = purchasePrice * (1 + vatRate / 100)
  const marginAmount = sellingPrice - purchaseWithVat
  const marginPercent = purchaseWithVat > 0 ? (marginAmount / purchaseWithVat) * 100 : 0
  const markupPercent = purchaseWithVat > 0 ? (marginAmount / purchaseWithVat) * 100 : 0
  
  return {
    marginPercent: Math.round(marginPercent * 100) / 100,
    marginAmount: Math.round(marginAmount * 100) / 100,
    markupPercent: Math.round(markupPercent * 100) / 100,
  }
}

// Helper per formattare il codice ricambio
export function formatPartCode(code: string): string {
  return code.toUpperCase().trim()
}

// Schema per validazione codice univoco (da usare con API)
export const uniqueCodeSchema = z.string().refine(
  async (code) => {
    // Qui verrà fatta la chiamata API per verificare l'univocità
    // Per ora restituiamo sempre true
    return true
  },
  {
    message: 'Questo codice è già in uso',
  }
)
