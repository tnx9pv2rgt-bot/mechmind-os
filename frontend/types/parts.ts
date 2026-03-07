/**
 * Parts Supplier API Integration Types
 * Multi-supplier search with real-time pricing
 */

export type PartCategory = 
  | 'engine'
  | 'brakes'
  | 'suspension'
  | 'electrical'
  | 'exhaust'
  | 'transmission'
  | 'cooling'
  | 'filters'
  | 'body'
  | 'interior'
  | 'accessories'

export type Supplier = 
  | 'autodoc'
  | 'misterauto'
  | 'eurocarparts'
  | 'carparts'
  | 'rockauto'
  | 'bosch'
  | 'continental'
  | 'valeo'
  | 'lemforder'
  | 'sachs'
  | 'original'

export interface Part {
  id: string
  supplier: Supplier
  supplierPartNumber: string
  ean?: string
  name: string
  description: string
  category: PartCategory
  brand: string
  oemNumbers: string[]  // Original Equipment Manufacturer numbers
  crossReferences: string[]  // Interchangeable part numbers
  price: {
    net: number
    gross: number
    currency: string
  }
  availability: {
    status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'on_order'
    quantity: number
    eta?: Date  // Estimated Time of Arrival
  }
  images: string[]
  documents: {
    type: 'datasheet' | 'installation' | 'certificate'
    url: string
  }[]
  specifications: Record<string, string>
  warranty: {
    months: number
    type: 'standard' | 'extended' | 'lifetime'
  }
  ratings: {
    average: number
    count: number
  }
  fitment: {
    make: string
    model: string
    yearFrom: number
    yearTo?: number
    engineCodes?: string[]
    notes?: string
  }[]
  weight: number  // kg
  dimensions: {
    length: number
    width: number
    height: number
  }
}

export interface PartSearchResult {
  query: {
    vin?: string
    licensePlate?: string
    oemNumber?: string
    keyword?: string
    category?: PartCategory
  }
  totalResults: number
  filters: {
    brands: string[]
    categories: PartCategory[]
    priceRange: { min: number; max: number }
    availability: string[]
  }
  results: Part[]
  alternatives: Part[]  // Compatible alternatives
  oemEquivalents: Part[]  // OEM parts
}

export interface SupplierConfig {
  id: Supplier
  name: string
  logo: string
  region: 'EU' | 'US' | 'GLOBAL'
  isEnabled: boolean
  credentials?: {
    apiKey?: string
    username?: string
    password?: string
    accountId?: string
  }
  settings: {
    defaultMargin: number
    shippingDays: number
    minimumOrder: number
    supportsDropshipping: boolean
    supportsRealTime: boolean
  }
}

export interface PriceComparison {
  partNumber: string
  results: {
    supplier: Supplier
    part: Part
    totalPrice: number  // Including shipping
    deliveryDays: number
    inStock: boolean
  }[]
  bestPrice: Supplier
  fastestDelivery: Supplier
  bestValue: Supplier  // Price/delivery ratio
}

export interface PartsOrder {
  id: string
  supplier: Supplier
  status: 'draft' | 'submitted' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
  items: {
    part: Part
    quantity: number
    unitPrice: number
    lineTotal: number
  }[]
  totals: {
    subtotal: number
    shipping: number
    tax: number
    total: number
  }
  shipping: {
    address: string
    method: string
    trackingNumber?: string
    estimatedDelivery?: Date
  }
  createdAt: Date
  submittedAt?: Date
  confirmedAt?: Date
  shippedAt?: Date
  deliveredAt?: Date
}

export interface InventorySync {
  supplier: Supplier
  lastSync: Date
  partsUpdated: number
  partsAdded: number
  partsRemoved: number
  errors: string[]
}

export interface PartRecommendation {
  id: string
  vehicleId: string
  serviceType: string
  mileage: number
  recommendedParts: {
    part: Part
    reason: 'scheduled' | 'wear_indicator' | 'obd_alert' | 'predictive_ml'
    priority: 'low' | 'medium' | 'high'
    estimatedLaborHours: number
  }[]
  estimatedTotal: number
}

// Supplier metadata
export const SUPPLIER_INFO: Record<Supplier, { name: string; region: string; color: string }> = {
  autodoc: { name: 'Autodoc', region: 'EU', color: '#E31E24' },
  misterauto: { name: 'Mister Auto', region: 'EU', color: '#0055A4' },
  eurocarparts: { name: 'Euro Car Parts', region: 'EU', color: '#FF6B00' },
  carparts: { name: 'CarParts.com', region: 'US', color: '#1E88E5' },
  rockauto: { name: 'RockAuto', region: 'US', color: '#4CAF50' },
  bosch: { name: 'Bosch', region: 'GLOBAL', color: '#0095D9' },
  continental: { name: 'Continental', region: 'GLOBAL', color: '#FF6600' },
  valeo: { name: 'Valeo', region: 'GLOBAL', color: '#E30613' },
  lemforder: { name: 'Lemförder', region: 'EU', color: '#003366' },
  sachs: { name: 'Sachs', region: 'GLOBAL', color: '#CC0000' },
  original: { name: 'OEM Original', region: 'GLOBAL', color: '#333333' },
}
