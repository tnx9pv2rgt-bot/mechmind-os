import { z } from 'zod'

// Unità di misura per le righe fattura
export const unitMeasureOptions = [
  { value: 'pz', label: 'Pezzi' },
  { value: 'ore', label: 'Ore' },
  { value: 'kg', label: 'Chilogrammi' },
  { value: 'lt', label: 'Litri' },
] as const

// Stati fattura
export const invoiceStatusOptions = [
  { value: 'draft', label: 'Bozza', color: 'bg-apple-gray' },
  { value: 'issued', label: 'Emessa', color: 'bg-apple-blue' },
  { value: 'paid', label: 'Pagata', color: 'bg-apple-green' },
  { value: 'overdue', label: 'Scaduta', color: 'bg-apple-red' },
  { value: 'cancelled', label: 'Annullata', color: 'bg-gray-400' },
] as const

// Aliquote IVA
export const vatRateOptions = [
  { value: 4, label: '4%' },
  { value: 5, label: '5%' },
  { value: 10, label: '10%' },
  { value: 22, label: '22%' },
] as const

// Metodi di pagamento
export const paymentMethodOptions = [
  { value: 'bank_transfer', label: 'Bonifico Bancario' },
  { value: 'cash', label: 'Contanti' },
  { value: 'card', label: 'Carta di Credito/Debito' },
  { value: 'check', label: 'Assegno' },
] as const

// Schema per singola riga fattura
export const invoiceLineSchema = z.object({
  id: z.string(),
  description: z.string().min(1, 'La descrizione è obbligatoria'),
  quantity: z.number().min(0.01, 'La quantità deve essere maggiore di 0'),
  unitMeasure: z.enum(['pz', 'ore', 'kg', 'lt']),
  unitPrice: z.number().min(0, 'Il prezzo non può essere negativo'),
  discount: z.number().min(0).max(100).default(0),
})

// Schema completo fattura
export const invoiceFormSchema = z.object({
  customerId: z.string().min(1, 'Seleziona un cliente'),
  vehicleId: z.string().optional(),
  invoiceNumber: z.string().min(1, 'Il numero fattura è obbligatorio'),
  issueDate: z.string().min(1, 'La data di emissione è obbligatoria'),
  dueDate: z.string().min(1, 'La data di scadenza è obbligatoria'),
  status: z.enum(['draft', 'issued', 'paid', 'overdue', 'cancelled']),
  lines: z.array(invoiceLineSchema).min(1, 'Aggiungi almeno una riga'),
  vatRate: z.number().min(0).max(100),
  notes: z.string().max(1000).optional(),
  paymentMethod: z.enum(['bank_transfer', 'cash', 'card', 'check']),
})

export type InvoiceLine = z.infer<typeof invoiceLineSchema>
export type InvoiceFormData = z.infer<typeof invoiceFormSchema>

// Funzione per calcolare l'importo di una riga
export function calculateLineTotal(line: InvoiceLine): number {
  const grossAmount = line.quantity * line.unitPrice
  const discountAmount = grossAmount * (line.discount / 100)
  return grossAmount - discountAmount
}

// Funzione per calcolare i totali
export function calculateTotals(lines: InvoiceLine[], vatRate: number) {
  const subtotal = lines.reduce((sum, line) => sum + calculateLineTotal(line), 0)
  const vatAmount = subtotal * (vatRate / 100)
  const total = subtotal + vatAmount
  
  return {
    subtotal,
    vatAmount,
    total,
  }
}

// Genera numero fattura automatico
export function generateInvoiceNumber(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `FAT-${year}${month}-${random}`
}
