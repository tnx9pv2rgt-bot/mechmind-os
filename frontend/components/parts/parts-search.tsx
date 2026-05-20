'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Part, PartSearchResult, Supplier, PartCategory } from '@/types/parts';

interface PartsSearchProps {
  onAddToCart: (part: Part, quantity: number) => void;
  vehicleId?: string;
  vehicleInfo?: {
    make: string;
    model: string;
    year: number;
    vin?: string;
  };
}

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
};

export function PartsSearch({ onAddToCart, vehicleId, vehicleInfo }: PartsSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMethod, setSearchMethod] = useState<'vin' | 'plate' | 'oem' | 'keyword'>('keyword');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<Part[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<PartCategory | null>(null);
  const [cart, setCart] = useState<{ part: Part; quantity: number }[]>([]);

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        method: searchMethod,
        ...(vehicleId ? { vehicleId } : {}),
        ...(selectedCategory ? { category: selectedCategory } : {}),
      });
      const res = await fetch(`/api/parts/search?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.parts || data.results || []);
      }
    } catch {
      // API unavailable — results remain empty
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddToCart = (part: Part) => {
    const existing = cart.find(c => c.part.id === part.id);
    if (existing) {
      setCart(cart.map(c => (c.part.id === part.id ? { ...c, quantity: c.quantity + 1 } : c)));
    } else {
      setCart([...cart, { part, quantity: 1 }]);
    }
    onAddToCart(part, 1);
  };

  const getAvailabilityBadge = (status: Part['availability']['status'], quantity: number) => {
    switch (status) {
      case 'in_stock':
        return (
          <Badge className='bg-[var(--status-success-subtle)] text-[var(--status-success)]'>
            <CheckCircle className='h-3 w-3 mr-1' />
            {quantity} disp.
          </Badge>
        );
      case 'low_stock':
        return (
          <Badge className='bg-[var(--status-warning)]/20 text-[var(--status-warning)]'>
            <AlertCircle className='h-3 w-3 mr-1' />
            {quantity} rimasti
          </Badge>
        );
      case 'out_of_stock':
        return (
          <Badge variant='secondary'>
            <Clock className='h-3 w-3 mr-1' />
            Esaurito
          </Badge>
        );
      default:
        return <Badge variant='outline'>Ordinabile</Badge>;
    }
  };

  return (
    <div className='space-y-6'>
      {/* Vehicle Context */}
      {vehicleInfo && (
        <Card className='bg-[var(--status-info-subtle)] border-[var(--status-info)]/30'>
          <CardContent className='p-4 flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <Car className='h-8 w-8 text-[var(--status-info)]' />
              <div>
                <p className='font-medium'>
                  {vehicleInfo.make} {vehicleInfo.model} ({vehicleInfo.year})
                </p>
                <p className='text-sm text-[var(--text-tertiary)]'>VIN: {vehicleInfo.vin || 'Non disponibile'}</p>
              </div>
            </div>
            <Badge variant='outline' className='bg-[var(--surface-primary)]'>
              Ricerca compatibile
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Search Bar */}
      <Card>
        <CardContent className='p-4'>
          <Tabs
            value={searchMethod}
            onValueChange={v => setSearchMethod(v as 'vin' | 'plate' | 'oem' | 'keyword')}
          >
            <TabsList className='grid grid-cols-4 mb-4'>
              <TabsTrigger value='vin'>VIN</TabsTrigger>
              <TabsTrigger value='plate'>Targa</TabsTrigger>
              <TabsTrigger value='oem'>Codice OEM</TabsTrigger>
              <TabsTrigger value='keyword'>Parola chiave</TabsTrigger>
            </TabsList>

            <div className='flex gap-2'>
              <div className='flex-1 relative'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]' />
                <Input
                  className='pl-10'
                  placeholder={
                    searchMethod === 'vin'
                      ? 'Inserisci VIN (17 caratteri)...'
                      : searchMethod === 'plate'
                        ? 'Inserisci targa...'
                        : searchMethod === 'oem'
                          ? 'Codice OEM o ricambista...'
                          : 'Cerca ricambi (es. pastiglie freni)...'
                  }
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
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
      <div className='grid grid-cols-12 gap-6'>
        {/* Filters */}
        <div className='col-span-3 space-y-4'>
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='text-sm flex items-center gap-2'>
                <Filter className='h-4 w-4' />
                Filtri
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div>
                <p className='text-xs font-medium text-[var(--text-tertiary)] mb-2'>CATEGORIA</p>
                <div className='space-y-1'>
                  {Object.entries(CATEGORY_ICONS).map(([cat, icon]) => (
                    <button
                      key={cat}
                      onClick={() =>
                        setSelectedCategory(selectedCategory === cat ? null : (cat as PartCategory))
                      }
                      className={cn(
                        'w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors',
                        selectedCategory === cat ? 'bg-[var(--status-info-subtle)] text-[var(--status-info)]' : 'hover:bg-[var(--surface-secondary)]'
                      )}
                    >
                      <span>{icon}</span>
                      <span className='capitalize'>{cat}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <p className='text-xs font-medium text-[var(--text-tertiary)] mb-2'>FORNITORI</p>
                <div className='space-y-1'>
                  {['autodoc', 'misterauto', 'bosch'].map(supplier => (
                    <label key={supplier} className='flex items-center gap-2 text-sm'>
                      <input type='checkbox' className='rounded' />
                      <span className='capitalize'>{supplier}</span>
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results List */}
        <div className='col-span-9 space-y-4'>
          <div className='flex items-center justify-between'>
            <p className='text-sm text-[var(--text-tertiary)]'>{results.length} risultati trovati</p>
            <Button variant='ghost' size='sm'>
              <ArrowUpDown className='h-4 w-4 mr-2' />
              Ordina per prezzo
            </Button>
          </div>

          {results.map(part => (
            <Card key={part.id} className='hover:shadow-md transition-shadow'>
              <CardContent className='p-4'>
                <div className='flex gap-4'>
                  {/* Image Placeholder */}
                  <div className='w-24 h-24 bg-[var(--surface-secondary)] rounded-lg flex items-center justify-center flex-shrink-0'>
                    <Package className='h-8 w-8 text-[var(--text-tertiary)]' />
                  </div>

                  {/* Info */}
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-start justify-between'>
                      <div>
                        <h3 className='font-medium text-lg'>{part.name}</h3>
                        <p className='text-sm text-[var(--text-tertiary)]'>{part.description}</p>

                        <div className='flex items-center gap-3 mt-2'>
                          <Badge variant='outline'>{part.brand}</Badge>
                          <Badge variant='secondary'>{part.supplier}</Badge>
                          {part.ratings.count > 0 && (
                            <span className='text-sm text-[var(--status-warning)]'>
                              ★ {part.ratings.average} ({part.ratings.count})
                            </span>
                          )}
                        </div>

                        {part.oemNumbers.length > 0 && (
                          <div className='mt-2 text-xs text-[var(--text-tertiary)]'>
                            OEM: {part.oemNumbers.join(', ')}
                          </div>
                        )}
                      </div>

                      <div className='text-right'>
                        <p className='text-2xl font-bold text-[var(--status-info)]'>
                          €{part.price.gross.toFixed(2)}
                        </p>
                        <p className='text-xs text-[var(--text-tertiary)]'>IVA incl.</p>
                        <div className='mt-2'>
                          {getAvailabilityBadge(
                            part.availability.status,
                            part.availability.quantity
                          )}
                        </div>
                      </div>
                    </div>

                    <div className='flex items-center justify-between mt-4 pt-4 border-t'>
                      <div className='flex items-center gap-4 text-sm text-[var(--text-tertiary)]'>
                        <span>Garanzia: {part.warranty.months} mesi</span>
                        {part.weight > 0 && <span>Peso: {part.weight}kg</span>}
                      </div>
                      <Button size='sm' onClick={() => handleAddToCart(part)}>
                        <ShoppingCart className='h-4 w-4 mr-2' />
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
  );
}

import { Separator } from '@/components/ui/separator';
