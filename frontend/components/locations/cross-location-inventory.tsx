'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Package,
  ArrowRightLeft,
  AlertTriangle,
  Building2,
  Search,
  Filter,
  Download,
  Plus,
  Truck,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Minus,
  Plus as PlusIcon,
  ShoppingCart,
  ExternalLink,
  BarChart3,
  MapPin,
  Mail,
  Phone,
  Star,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

interface Location {
  id: string;
  name: string;
  city: string;
}

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  supplier: string;
  locations: Record<string, { quantity: number; minLevel: number; maxLevel: number }>;
  unitCost: number;
}

interface TransferRequest {
  id: string;
  itemId: string;
  itemName: string;
  fromLocation: string;
  toLocation: string;
  quantity: number;
  status: 'pending' | 'approved' | 'shipped' | 'received' | 'cancelled';
  requestedAt: Date;
  requestedBy: string;
}

interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  categories: string[];
  rating: number;
  leadTime: number;
  isActive: boolean;
}

interface CrossLocationInventoryProps {
  locations: Location[];
}

// Mock inventory data
const mockInventory: InventoryItem[] = [
  {
    id: 'INV-001',
    name: 'Olio motore 5W30 Castrol',
    sku: 'OIL-5W30-CAS-5L',
    category: 'Oli e Lubrificanti',
    supplier: 'Castrol Italia',
    unitCost: 28.5,
    locations: {
      'LOC-001': { quantity: 45, minLevel: 20, maxLevel: 100 },
      'LOC-002': { quantity: 62, minLevel: 30, maxLevel: 120 },
      'LOC-003': { quantity: 18, minLevel: 15, maxLevel: 80 },
      'LOC-004': { quantity: 8, minLevel: 10, maxLevel: 50 },
    },
  },
  {
    id: 'INV-002',
    name: 'Freni anteriori Brembo',
    sku: 'BRK-BREM-FT-001',
    category: 'Freni',
    supplier: 'Brembo SpA',
    unitCost: 85.0,
    locations: {
      'LOC-001': { quantity: 12, minLevel: 15, maxLevel: 40 },
      'LOC-002': { quantity: 28, minLevel: 20, maxLevel: 50 },
      'LOC-003': { quantity: 6, minLevel: 10, maxLevel: 30 },
      'LOC-004': { quantity: 3, minLevel: 5, maxLevel: 20 },
    },
  },
  {
    id: 'INV-003',
    name: 'Filtro aria Bosch',
    sku: 'AIR-BOSCH-001',
    category: 'Filtri',
    supplier: 'Bosch Automotive',
    unitCost: 15.75,
    locations: {
      'LOC-001': { quantity: 28, minLevel: 10, maxLevel: 60 },
      'LOC-002': { quantity: 35, minLevel: 15, maxLevel: 70 },
      'LOC-003': { quantity: 22, minLevel: 10, maxLevel: 50 },
      'LOC-004': { quantity: 9, minLevel: 8, maxLevel: 40 },
    },
  },
  {
    id: 'INV-004',
    name: 'Candele NGK Iridium',
    sku: 'SPK-NGK-IRD-001',
    category: 'Accensione',
    supplier: 'NGK Spark Plugs',
    unitCost: 12.9,
    locations: {
      'LOC-001': { quantity: 8, minLevel: 12, maxLevel: 50 },
      'LOC-002': { quantity: 42, minLevel: 20, maxLevel: 80 },
      'LOC-003': { quantity: 15, minLevel: 10, maxLevel: 40 },
      'LOC-004': { quantity: 4, minLevel: 8, maxLevel: 30 },
    },
  },
  {
    id: 'INV-005',
    name: 'Pastiglie freno Textar',
    sku: 'PAD-TXT-FT-001',
    category: 'Freni',
    supplier: 'TMD Friction',
    unitCost: 45.0,
    locations: {
      'LOC-001': { quantity: 18, minLevel: 10, maxLevel: 40 },
      'LOC-002': { quantity: 24, minLevel: 15, maxLevel: 50 },
      'LOC-003': { quantity: 11, minLevel: 8, maxLevel: 30 },
      'LOC-004': { quantity: 6, minLevel: 6, maxLevel: 25 },
    },
  },
  {
    id: 'INV-006',
    name: 'Batteria Varta 60Ah',
    sku: 'BAT-VAR-60AH',
    category: 'Batterie',
    supplier: 'Varta Automotive',
    unitCost: 120.0,
    locations: {
      'LOC-001': { quantity: 6, minLevel: 5, maxLevel: 20 },
      'LOC-002': { quantity: 12, minLevel: 8, maxLevel: 25 },
      'LOC-003': { quantity: 4, minLevel: 4, maxLevel: 15 },
      'LOC-004': { quantity: 2, minLevel: 3, maxLevel: 12 },
    },
  },
];

// Mock transfer requests
const mockTransfers: TransferRequest[] = [
  {
    id: 'TRF-001',
    itemId: 'INV-004',
    itemName: 'Candele NGK Iridium',
    fromLocation: 'LOC-002',
    toLocation: 'LOC-001',
    quantity: 10,
    status: 'shipped',
    requestedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    requestedBy: 'Mario Rossi',
  },
  {
    id: 'TRF-002',
    itemId: 'INV-002',
    itemName: 'Freni anteriori Brembo',
    fromLocation: 'LOC-002',
    toLocation: 'LOC-003',
    quantity: 5,
    status: 'pending',
    requestedAt: new Date(Date.now() - 1000 * 60 * 60 * 4),
    requestedBy: 'Giuseppe Verdi',
  },
  {
    id: 'TRF-003',
    itemId: 'INV-001',
    itemName: 'Olio motore 5W30 Castrol',
    fromLocation: 'LOC-001',
    toLocation: 'LOC-004',
    quantity: 15,
    status: 'approved',
    requestedAt: new Date(Date.now() - 1000 * 60 * 60 * 6),
    requestedBy: 'Anna Neri',
  },
];

// Mock suppliers
const mockSuppliers: Supplier[] = [
  {
    id: 'SUP-001',
    name: 'Castrol Italia',
    email: 'ordini@castrol.it',
    phone: '+39 02 1234 5678',
    categories: ['Oli e Lubrificanti'],
    rating: 4.8,
    leadTime: 3,
    isActive: true,
  },
  {
    id: 'SUP-002',
    name: 'Brembo SpA',
    email: 'commercial@brembo.it',
    phone: '+39 030 6091',
    categories: ['Freni'],
    rating: 4.9,
    leadTime: 5,
    isActive: true,
  },
  {
    id: 'SUP-003',
    name: 'Bosch Automotive',
    email: 'orders@bosch.it',
    phone: '+39 02 4567 8901',
    categories: ['Filtri', 'Elettronica'],
    rating: 4.7,
    leadTime: 4,
    isActive: true,
  },
  {
    id: 'SUP-004',
    name: 'NGK Spark Plugs',
    email: 'italy@ngkntk.com',
    phone: '+39 02 3456 7890',
    categories: ['Accensione'],
    rating: 4.6,
    leadTime: 4,
    isActive: true,
  },
];

export function CrossLocationInventory({ locations }: CrossLocationInventoryProps) {
  const [activeTab, setActiveTab] = useState<'inventory' | 'transfers' | 'suppliers'>('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [transferQuantity, setTransferQuantity] = useState(1);
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');

  // Filter inventory
  const filteredInventory = mockInventory.filter(item => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(mockInventory.map(i => i.category)))];

  // Calculate stock status
  const getStockStatus = (quantity: number, minLevel: number) => {
    if (quantity <= minLevel * 0.5)
      return { label: 'Critico', color: 'bg-[var(--status-error)]', textColor: 'text-[var(--status-error)]' };
    if (quantity <= minLevel)
      return { label: 'Basso', color: 'bg-[var(--status-warning)]', textColor: 'text-[var(--status-warning)]' };
    return { label: 'OK', color: 'bg-[var(--status-success)]', textColor: 'text-[var(--status-success)]' };
  };

  // Calculate totals
  const calculateTotalValue = () => {
    return mockInventory.reduce((total, item) => {
      const itemTotal = Object.values(item.locations).reduce((sum, loc) => sum + loc.quantity, 0);
      return total + itemTotal * item.unitCost;
    }, 0);
  };

  const getLowStockCount = () => {
    let count = 0;
    mockInventory.forEach(item => {
      Object.entries(item.locations).forEach(([_, loc]) => {
        if (loc.quantity <= loc.minLevel) count++;
      });
    });
    return count;
  };

  const getTransferStatusColor = (status: TransferRequest['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-status-pending text-[var(--text-primary)]';
      case 'approved':
        return 'bg-[var(--status-info)] text-[var(--text-on-brand)]';
      case 'shipped':
        return 'bg-brand-600 text-[var(--text-on-brand)]';
      case 'received':
        return 'bg-[var(--status-success)] text-[var(--text-on-brand)]';
      case 'cancelled':
        return 'bg-[var(--status-error)] text-[var(--text-on-brand)]';
    }
  };

  const getTransferStatusLabel = (status: TransferRequest['status']) => {
    switch (status) {
      case 'pending':
        return 'In attesa';
      case 'approved':
        return 'Approvato';
      case 'shipped':
        return 'Spedito';
      case 'received':
        return 'Ricevuto';
      case 'cancelled':
        return 'Annullato';
    }
  };

  const openTransferModal = (item: InventoryItem) => {
    setSelectedItem(item);
    // Find location with highest stock
    const entries = Object.entries(item.locations);
    const maxLoc = entries.reduce(
      (max, curr) => (curr[1].quantity > max[1].quantity ? curr : max),
      entries[0]
    );
    setFromLocation(maxLoc[0]);
    setToLocation('');
    setTransferQuantity(1);
    setShowTransferModal(true);
  };

  return (
    <div className='space-y-6'>
      {/* Stats Overview */}
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <div className='workshop-card bg-gradient-to-br from-[var(--status-info)]/5 to-[var(--status-info)]/10 dark:from-[var(--status-info)]/40/20 dark:to-[var(--status-info)]/20'>
          <div className='flex items-center gap-3'>
            <div className='h-12 w-12 rounded-lg bg-[var(--status-info-subtle)]0/20 flex items-center justify-center'>
              <Package className='h-6 w-6 text-[var(--status-info)] dark:text-[var(--status-info)]' />
            </div>
            <div>
              <p className='text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'>Valore Totale Stock</p>
              <p className='text-xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                {formatCurrency(calculateTotalValue())}
              </p>
            </div>
          </div>
        </div>
        <div className='workshop-card bg-gradient-to-br from-[var(--status-error)]/5 to-[var(--status-error)]/10 dark:from-[var(--status-error)]/40/20 dark:to-[var(--status-error)]/20'>
          <div className='flex items-center gap-3'>
            <div className='h-12 w-12 rounded-lg bg-[var(--status-error-subtle)]0/20 flex items-center justify-center'>
              <AlertTriangle className='h-6 w-6 text-[var(--status-error)] dark:text-[var(--status-error)]' />
            </div>
            <div>
              <p className='text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'>Stock Critici/Bassi</p>
              <p className='text-xl font-bold text-[var(--status-error)]'>{getLowStockCount()}</p>
            </div>
          </div>
        </div>
        <div className='workshop-card bg-gradient-to-br from-[var(--status-warning)]/5 to-[var(--status-warning)]/10 dark:from-[var(--status-warning)]/40/20 dark:to-[var(--status-warning)]/20'>
          <div className='flex items-center gap-3'>
            <div className='h-12 w-12 rounded-lg bg-[var(--status-warning)]/100/20 flex items-center justify-center'>
              <ArrowRightLeft className='h-6 w-6 text-[var(--status-warning)] dark:text-[var(--status-warning)]' />
            </div>
            <div>
              <p className='text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'>Trasferimenti Attivi</p>
              <p className='text-xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                {
                  mockTransfers.filter(t => ['pending', 'approved', 'shipped'].includes(t.status))
                    .length
                }
              </p>
            </div>
          </div>
        </div>
        <div className='workshop-card bg-gradient-to-br from-[var(--status-success)]/5 to-[var(--status-success)]/10 dark:from-[var(--status-success)]/40/20 dark:to-[var(--status-success)]/20'>
          <div className='flex items-center gap-3'>
            <div className='h-12 w-12 rounded-lg bg-[var(--status-success-subtle)]0/20 flex items-center justify-center'>
              <Truck className='h-6 w-6 text-[var(--status-success)] dark:text-[var(--status-success)]' />
            </div>
            <div>
              <p className='text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'>Fornitori Attivi</p>
              <p className='text-xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                {mockSuppliers.filter(s => s.isActive).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className='flex items-center gap-2 bg-[var(--surface-secondary)] dark:bg-[var(--surface-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-default)] p-1 w-fit'>
        <button
          onClick={() => setActiveTab('inventory')}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2',
            activeTab === 'inventory'
              ? 'bg-brand-600 text-[var(--text-on-brand)]'
              : 'text-[var(--text-secondary)] dark:text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-hover)]'
          )}
        >
          <Package className='h-4 w-4' />
          Inventario
        </button>
        <button
          onClick={() => setActiveTab('transfers')}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2',
            activeTab === 'transfers'
              ? 'bg-brand-600 text-[var(--text-on-brand)]'
              : 'text-[var(--text-secondary)] dark:text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-hover)]'
          )}
        >
          <ArrowRightLeft className='h-4 w-4' />
          Trasferimenti
        </button>
        <button
          onClick={() => setActiveTab('suppliers')}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2',
            activeTab === 'suppliers'
              ? 'bg-brand-600 text-[var(--text-on-brand)]'
              : 'text-[var(--text-secondary)] dark:text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-hover)]'
          )}
        >
          <Truck className='h-4 w-4' />
          Fornitori
        </button>
      </div>

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <div className='space-y-4'>
          {/* Filters */}
          <div className='flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between'>
            <div className='flex items-center gap-4'>
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]' />
                <Input
                  placeholder='Cerca prodotto...'
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className='pl-10 w-64'
                />
              </div>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className='px-3 py-2 border border-[var(--border-default)] dark:border-[var(--border-default)] rounded-md text-sm bg-[var(--surface-secondary)] dark:bg-[var(--surface-primary)] text-[var(--text-primary)] dark:text-[var(--text-primary)]'
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? 'Tutte le categorie' : cat}
                  </option>
                ))}
              </select>
            </div>
            <div className='flex items-center gap-3'>
              <Button variant='outline' size='sm'>
                <Filter className='mr-2 h-4 w-4' />
                Filtri
              </Button>
              <Button variant='outline' size='sm'>
                <Download className='mr-2 h-4 w-4' />
                Esporta
              </Button>
              <Button size='sm'>
                <Plus className='mr-2 h-4 w-4' />
                Aggiungi Prodotto
              </Button>
            </div>
          </div>

          {/* Inventory Table */}
          <div className='workshop-card overflow-hidden p-0'>
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead className='bg-[var(--surface-secondary)] dark:bg-[var(--surface-primary)] border-b border-[var(--border-default)] dark:border-[var(--border-default)]'>
                  <tr>
                    <th className='px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                      Prodotto
                    </th>
                    <th className='px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                      Categoria
                    </th>
                    <th className='px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                      Fornitore
                    </th>
                    {locations.map(loc => (
                      <th
                        key={loc.id}
                        className='px-4 py-3 text-center text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'
                      >
                        <div className='flex flex-col items-center'>
                          <span>{loc.city}</span>
                          <span className='text-xs font-normal text-[var(--text-tertiary)]'>Stock/Min</span>
                        </div>
                      </th>
                    ))}
                    <th className='px-4 py-3 text-right text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                      Azioni
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-[var(--border-default)] dark:divide-gray-700'>
                  {filteredInventory.map(item => (
                    <tr key={item.id} className='hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-hover)]/50'>
                      <td className='px-4 py-3'>
                        <div>
                          <p className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>{item.name}</p>
                          <p className='text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'>{item.sku}</p>
                        </div>
                      </td>
                      <td className='px-4 py-3 text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'>
                        {item.category}
                      </td>
                      <td className='px-4 py-3 text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'>
                        {item.supplier}
                      </td>
                      {locations.map(loc => {
                        const locData = item.locations[loc.id];
                        const status = locData
                          ? getStockStatus(locData.quantity, locData.minLevel)
                          : null;
                        return (
                          <td key={loc.id} className='px-4 py-3 text-center'>
                            {locData ? (
                              <div className='flex flex-col items-center'>
                                <span className={cn('font-medium', status?.textColor)}>
                                  {locData.quantity}
                                </span>
                                <span className='text-xs text-[var(--text-tertiary)]'>/ {locData.minLevel}</span>
                              </div>
                            ) : (
                              <span className='text-[var(--text-tertiary)]'>-</span>
                            )}
                          </td>
                        );
                      })}
                      <td className='px-4 py-3 text-right'>
                        <Button variant='outline' size='sm' onClick={() => openTransferModal(item)}>
                          <ArrowRightLeft className='mr-2 h-4 w-4' />
                          Trasferisci
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Transfers Tab */}
      {activeTab === 'transfers' && (
        <div className='space-y-4'>
          <div className='flex items-center justify-between'>
            <h3 className='text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
              Richieste di Trasferimento
            </h3>
            <Button size='sm'>
              <Plus className='mr-2 h-4 w-4' />
              Nuova Richiesta
            </Button>
          </div>

          <div className='workshop-card overflow-hidden p-0'>
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead className='bg-[var(--surface-secondary)] dark:bg-[var(--surface-primary)] border-b border-[var(--border-default)] dark:border-[var(--border-default)]'>
                  <tr>
                    <th className='px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                      ID
                    </th>
                    <th className='px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                      Prodotto
                    </th>
                    <th className='px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                      Da
                    </th>
                    <th className='px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                      A
                    </th>
                    <th className='px-4 py-3 text-center text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                      Quantità
                    </th>
                    <th className='px-4 py-3 text-center text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                      Stato
                    </th>
                    <th className='px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                      Richiesto da
                    </th>
                    <th className='px-4 py-3 text-right text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                      Azioni
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-[var(--border-default)] dark:divide-gray-700'>
                  {mockTransfers.map(transfer => (
                    <tr key={transfer.id} className='hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-hover)]/50'>
                      <td className='px-4 py-3 text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                        {transfer.id}
                      </td>
                      <td className='px-4 py-3 text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'>
                        {transfer.itemName}
                      </td>
                      <td className='px-4 py-3'>
                        <div className='flex items-center gap-2'>
                          <Building2 className='h-4 w-4 text-[var(--text-tertiary)]' />
                          <span className='text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'>
                            {locations.find(l => l.id === transfer.fromLocation)?.city}
                          </span>
                        </div>
                      </td>
                      <td className='px-4 py-3'>
                        <div className='flex items-center gap-2'>
                          <Building2 className='h-4 w-4 text-[var(--text-tertiary)]' />
                          <span className='text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'>
                            {locations.find(l => l.id === transfer.toLocation)?.city}
                          </span>
                        </div>
                      </td>
                      <td className='px-4 py-3 text-center font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                        {transfer.quantity}
                      </td>
                      <td className='px-4 py-3 text-center'>
                        <span
                          className={cn(
                            'px-2 py-1 text-xs font-medium rounded-full',
                            getTransferStatusColor(transfer.status)
                          )}
                        >
                          {getTransferStatusLabel(transfer.status)}
                        </span>
                      </td>
                      <td className='px-4 py-3 text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'>
                        {transfer.requestedBy}
                      </td>
                      <td className='px-4 py-3 text-right'>
                        <div className='flex items-center justify-end gap-2'>
                          {transfer.status === 'pending' && (
                            <>
                              <Button
                                variant='ghost'
                                size='sm'
                                className='h-8 w-8 p-0'
                                aria-label='Approva trasferimento'
                              >
                                <CheckCircle2 className='h-4 w-4 text-[var(--status-success)]' />
                              </Button>
                              <Button
                                variant='ghost'
                                size='sm'
                                className='h-8 w-8 p-0'
                                aria-label='Rifiuta trasferimento'
                              >
                                <XCircle className='h-4 w-4 text-[var(--status-error)]' />
                              </Button>
                            </>
                          )}
                          <Button variant='ghost' size='sm'>
                            Dettagli
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Suppliers Tab */}
      {activeTab === 'suppliers' && (
        <div className='space-y-4'>
          <div className='flex items-center justify-between'>
            <h3 className='text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
              Fornitori Centralizzati
            </h3>
            <Button size='sm'>
              <Plus className='mr-2 h-4 w-4' />
              Aggiungi Fornitore
            </Button>
          </div>

          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            {mockSuppliers.map(supplier => (
              <div key={supplier.id} className='workshop-card'>
                <div className='flex items-start justify-between mb-4'>
                  <div className='h-12 w-12 rounded-lg bg-[var(--brand)]/10 dark:bg-[var(--brand)]/40/30 flex items-center justify-center'>
                    <Truck className='h-6 w-6 text-[var(--brand)]' />
                  </div>
                  <span
                    className={cn(
                      'px-2 py-1 text-xs font-medium rounded-full',
                      supplier.isActive
                        ? 'bg-[var(--status-success)]/10 text-[var(--status-success)]'
                        : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)]'
                    )}
                  >
                    {supplier.isActive ? 'Attivo' : 'Inattivo'}
                  </span>
                </div>
                <h4 className='font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-1'>
                  {supplier.name}
                </h4>
                <div className='space-y-2 text-sm'>
                  <div className='flex items-center gap-2 text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'>
                    <Mail className='h-4 w-4' />
                    <a
                      href={`mailto:${supplier.email}`}
                      className='text-[var(--brand)] hover:underline truncate'
                    >
                      {supplier.email}
                    </a>
                  </div>
                  <div className='flex items-center gap-2 text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'>
                    <Phone className='h-4 w-4' />
                    <a href={`tel:${supplier.phone}`} className='text-[var(--brand)] hover:underline'>
                      {supplier.phone}
                    </a>
                  </div>
                </div>
                <div className='mt-4 pt-4 border-t border-[var(--border-default)] dark:border-[var(--border-default)]'>
                  <div className='flex items-center justify-between text-sm'>
                    <span className='text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'>Rating</span>
                    <div className='flex items-center gap-1'>
                      <Star className='h-4 w-4 text-[var(--status-warning)] fill-yellow-500' />
                      <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                        {supplier.rating}
                      </span>
                    </div>
                  </div>
                  <div className='flex items-center justify-between text-sm mt-2'>
                    <span className='text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'>Lead Time</span>
                    <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                      {supplier.leadTime} giorni
                    </span>
                  </div>
                </div>
                <div className='mt-4 flex gap-2'>
                  <Button variant='outline' size='sm' className='flex-1'>
                    <ShoppingCart className='mr-2 h-4 w-4' />
                    Ordina
                  </Button>
                  <Button variant='ghost' size='sm' className='px-3'>
                    <ExternalLink className='h-4 w-4' />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transfer Modal (simplified) */}
      {showTransferModal && selectedItem && (
        <div className='fixed inset-0 bg-[var(--surface-primary)]/50 flex items-center justify-center z-50 p-4'>
          <div className='bg-[var(--surface-secondary)] dark:bg-[var(--surface-primary)] rounded-lg shadow-xl max-w-md w-full p-6'>
            <h3 className='text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-4 flex items-center gap-2'>
              <ArrowRightLeft className='h-5 w-5 text-[var(--brand)]' />
              Trasferisci Stock
            </h3>
            <div className='space-y-4'>
              <div>
                <p className='text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)] mb-1'>Prodotto</p>
                <p className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>{selectedItem.name}</p>
                <p className='text-xs text-[var(--text-tertiary)]'>{selectedItem.sku}</p>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label
                    htmlFor='transferFromLocation'
                    className='text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)] block mb-2'
                  >
                    Da
                  </label>
                  <select
                    id='transferFromLocation'
                    value={fromLocation}
                    onChange={e => setFromLocation(e.target.value)}
                    className='w-full px-3 py-2 border border-[var(--border-default)] dark:border-[var(--border-default)] rounded-md text-sm bg-[var(--surface-secondary)] dark:bg-[var(--surface-primary)] text-[var(--text-primary)] dark:text-[var(--text-primary)]'
                  >
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>
                        {loc.city} ({selectedItem.locations[loc.id]?.quantity || 0} disp.)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor='transferToLocation'
                    className='text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)] block mb-2'
                  >
                    A
                  </label>
                  <select
                    id='transferToLocation'
                    value={toLocation}
                    onChange={e => setToLocation(e.target.value)}
                    className='w-full px-3 py-2 border border-[var(--border-default)] dark:border-[var(--border-default)] rounded-md text-sm bg-[var(--surface-secondary)] dark:bg-[var(--surface-primary)] text-[var(--text-primary)] dark:text-[var(--text-primary)]'
                  >
                    <option value=''>Seleziona...</option>
                    {locations
                      .filter(l => l.id !== fromLocation)
                      .map(loc => (
                        <option key={loc.id} value={loc.id}>
                          {loc.city}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <div>
                <label
                  htmlFor='transferQuantity'
                  className='text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)] block mb-2'
                >
                  Quantità
                </label>
                <div className='flex items-center gap-3'>
                  <button
                    onClick={() => setTransferQuantity(Math.max(1, transferQuantity - 1))}
                    className='h-8 w-8 rounded-md border border-[var(--border-default)] dark:border-[var(--border-default)] flex items-center justify-center hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-hover)]'
                    aria-label='Diminuisci quantità'
                  >
                    <Minus className='h-4 w-4' />
                  </button>
                  <span
                    id='transferQuantity'
                    className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] w-12 text-center'
                  >
                    {transferQuantity}
                  </span>
                  <button
                    onClick={() => setTransferQuantity(transferQuantity + 1)}
                    className='h-8 w-8 rounded-md border border-[var(--border-default)] dark:border-[var(--border-default)] flex items-center justify-center hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-hover)]'
                    aria-label='Aumenta quantità'
                  >
                    <PlusIcon className='h-4 w-4' />
                  </button>
                </div>
              </div>
            </div>
            <div className='flex items-center gap-3 mt-6'>
              <Button
                variant='outline'
                className='flex-1'
                onClick={() => setShowTransferModal(false)}
              >
                Annulla
              </Button>
              <Button
                className='flex-1'
                disabled={!toLocation}
                onClick={() => {
                  setShowTransferModal(false);
                  // Handle transfer logic
                }}
              >
                Conferma Trasferimento
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
