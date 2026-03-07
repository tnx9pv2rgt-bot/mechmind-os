'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Search, 
  ScanLine,
  Car,
  Package,
  ShoppingCart,
  Filter,
  ArrowUpDown,
  ExternalLink,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Part, PartSearchResult, Supplier, PartCategory } from '@/types/parts'

interface PartsSearchProps {
  onAddToCart: (part: Part, quantity: number) => void
  vehicleId?: string
  vehicleInfo?: {
    make: string
    model: string
    year: number
    vin?: string
  }
}

const MOCK_PARTS: Part[] = [
  {
    id: '1',
    supplier: 'autodoc',
    supplierPartNumber: 'BP-12345',
    name: 'Kit Pastiglie Freni Anteriori',
    description: 'Pastiglie freno ceramiche ad alte prestazioni',
    category: 'brakes',
    brand: 'Brembo',
    oemNumbers: ['8J0698151', '8J0698151A'],
    crossReferences: ['BP12345', 'FDB4418'],
    price: { net: 45.90, gross: 55.08, currency: 'EUR' },
    availability: { status: 'in_stock', quantity: 156 },
    images: [],
    documents: [],
    specifications: { 'Spessore': '18mm', 'Materiale': 'Ceramica' },
    warranty: { months: 24, type: 'standard' },
    ratings: { average: 4.7, count: 234 },
    fitment: [{ make: 'Audi', model: 'A3', yearFrom: 2012, yearTo: 2020 }],
    weight: 2.1,
    dimensions: { length: 20, width: 15, height: 5 },
  },
  {
    id: '2',
    supplier: 'misterauto',
    supplierPartNumber: 'FIL-9876',
    name: 'Filtro Olio Motore',
    description: 'Filtro olio originale equiparato',
    category: 'filters',
    brand: 'Mann-Filter',
    oemNumbers: ['06L115562', '06L115562B'],
    crossReferences: ['HU6007X', 'OX388D'],
    price: { net: 12.50, gross: 15.00, currency: 'EUR' },
    availability: { status: 'in_stock', quantity: 89 },
    images: [],
    documents: [],
    specifications: { 'Diametro': '76mm', 'Altezza': '123mm' },
    warranty: { months: 12, type: 'standard' },
    ratings: { average: 4.9, count: 567 },
    fitment: [{ make: 'VW', model: 'Golf VII', yearFrom: 2012, yearTo: 2020 }],
    weight: 0.3,
    dimensions: { length: 8, width: 8, height: 13 },
  },
  {
    id: '3',
    supplier: 'bosch',
    supplierPartNumber: 'BOS-4455',
    name: 'Candele Accensione Iridium',
    description: 'Candele al iridio durata 100.000km',
    category: 'engine',
    brand: 'Bosch',
    oemNumbers: ['06K905601M'],
    crossReferences: ['FR7KI332S', 'ZKER6A10EG'],
    price: { net: 18.90, gross: 22.68, currency: 'EUR' },
    availability: { status: 'low_stock', quantity: 12 },
    images: [],
    documents: [],
    specifications: { 'Filettatura': 'M14x1.25', 'Gap': '0.8mm' },
    warranty: { months: 24, type: 'extended' },
    ratings: { average: 4.8, count: 189 },
    fitment: [{ make: 'Audi', model: 'A4', yearFrom: 2015 }],
    weight: 0.1,
    dimensions: { length: 10, width: 2, height: 2 },
  },
]

const CATEGORY_ICONS: Record<PartCategory, string> = {
  engine: '⚙️',
  brakes: '🛑',
  suspension: '🔧',
  electrical: '⚡',
  exhaust: '💨',
  transmission: '⚙️',
  cooling: '❄️',
  filters: '🔄',
  body: '🚗',
  interior: '🪑',
  accessories: '➕',
}

export function PartsSearch({ onAddToCart, vehicleId, vehicleInfo }: PartsSearchProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchMethod, setSearchMethod] = useState<'vin' | 'plate' | 'oem' | 'keyword'>('keyword')
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<Part[]>(MOCK_PARTS)
  const [selectedCategory, setSelectedCategory] = useState<PartCategory | null>(null)
  const [cart, setCart] = useState<{ part: Part; quantity: number }[]>([])

  const handleSearch = () => {
    setIsSearching(true)
    // Simulate API call
    setTimeout(() => {
      setIsSearching(false)
      // Filter mock results
      const filtered = MOCK_PARTS.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.oemNumbers.some(o => o.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      setResults(filtered.length > 0 ? filtered : MOCK_PARTS)
    }, 800)
  }

  const handleAddToCart = (part: Part) => {
    const existing = cart.find(c => c.part.id === part.id)
    if (existing) {
      setCart(cart.map(c => c.part.id === part.id ? { ...c, quantity: c.quantity + 1 } : c))
    } else {
      setCart([...cart, { part, quantity: 1 }])
    }
    onAddToCart(part, 1)
  }

  const getAvailabilityBadge = (status: Part['availability']['status'], quantity: number) => {
    switch (status) {
      case 'in_stock':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />{quantity} disp.</Badge>
      case 'low_stock':
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertCircle className="h-3 w-3 mr-1" />{quantity} rimasti</Badge>
      case 'out_of_stock':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Esaurito</Badge>
      default:
        return <Badge variant="outline">Ordinabile</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Vehicle Context */}
      {vehicleInfo && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Car className="h-8 w-8 text-blue-600" />
              <div>
                <p className="font-medium">{vehicleInfo.make} {vehicleInfo.model} ({vehicleInfo.year})</p>
                <p className="text-sm text-gray-500">VIN: {vehicleInfo.vin || 'Non disponibile'}</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-white">Ricerca compatibile</Badge>
          </CardContent>
        </Card>
      )}

      {/* Search Bar */}
      <Card>
        <CardContent className="p-4">
          <Tabs value={searchMethod} onValueChange={(v) => setSearchMethod(v as any)}>
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="vin">VIN</TabsTrigger>
              <TabsTrigger value="plate">Targa</TabsTrigger>
              <TabsTrigger value="oem">Codice OEM</TabsTrigger>
              <TabsTrigger value="keyword">Parola chiave</TabsTrigger>
            </TabsList>
            
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  className="pl-10"
                  placeholder={
                    searchMethod === 'vin' ? 'Inserisci VIN (17 caratteri)...' :
                    searchMethod === 'plate' ? 'Inserisci targa...' :
                    searchMethod === 'oem' ? 'Codice OEM o ricambista...' :
                    'Cerca ricambi (es. pastiglie freni)...'
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button onClick={handleSearch} disabled={isSearching}>
                {isSearching ? 'Ricerca...' : 'Cerca'}
              </Button>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="grid grid-cols-12 gap-6">
        {/* Filters */}
        <div className="col-span-3 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtri
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">CATEGORIA</p>
                <div className="space-y-1">
                  {Object.entries(CATEGORY_ICONS).map(([cat, icon]) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat as PartCategory)}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors",
                        selectedCategory === cat ? "bg-blue-100 text-blue-800" : "hover:bg-gray-100"
                      )}
                    >
                      <span>{icon}</span>
                      <span className="capitalize">{cat}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">FORNITORI</p>
                <div className="space-y-1">
                  {['autodoc', 'misterauto', 'bosch'].map(supplier => (
                    <label key={supplier} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="rounded" />
                      <span className="capitalize">{supplier}</span>
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results List */}
        <div className="col-span-9 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{results.length} risultati trovati</p>
            <Button variant="ghost" size="sm">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              Ordina per prezzo
            </Button>
          </div>

          {results.map(part => (
            <Card key={part.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Image Placeholder */}
                  <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Package className="h-8 w-8 text-gray-400" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-lg">{part.name}</h3>
                        <p className="text-sm text-gray-500">{part.description}</p>
                        
                        <div className="flex items-center gap-3 mt-2">
                          <Badge variant="outline">{part.brand}</Badge>
                          <Badge variant="secondary">{part.supplier}</Badge>
                          {part.ratings.count > 0 && (
                            <span className="text-sm text-yellow-600">
                              ★ {part.ratings.average} ({part.ratings.count})
                            </span>
                          )}
                        </div>

                        {part.oemNumbers.length > 0 && (
                          <div className="mt-2 text-xs text-gray-500">
                            OEM: {part.oemNumbers.join(', ')}
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-600">
                          €{part.price.gross.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">IVA incl.</p>
                        <div className="mt-2">
                          {getAvailabilityBadge(part.availability.status, part.availability.quantity)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Garanzia: {part.warranty.months} mesi</span>
                        {part.weight > 0 && <span>Peso: {part.weight}kg</span>}
                      </div>
                      <Button size="sm" onClick={() => handleAddToCart(part)}>
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Aggiungi
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

import { Separator } from '@/components/ui/separator'
