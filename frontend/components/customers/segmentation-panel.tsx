'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Users,
  Plus,
  Trash2,
  Edit,
  Play,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  Filter,
  Crown,
  AlertTriangle,
  Car,
  Euro,
  Calendar,
  Tag,
  Eye,
  Download,
  Mail,
  Target,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

// Types
interface SegmentRule {
  id: string;
  field: string;
  operator:
    | 'equals'
    | 'not_equals'
    | 'greater_than'
    | 'less_than'
    | 'contains'
    | 'not_contains'
    | 'before'
    | 'after';
  value: string | number;
}

interface Segment {
  id: string;
  name: string;
  description: string;
  rules: SegmentRule[];
  color: string;
  customerCount: number;
  lastUpdated: string;
  isActive: boolean;
}

// Mock Data
const mockCustomers = [
  {
    id: '1',
    firstName: 'Mario',
    lastName: 'Rossi',
    totalSpent: 8750,
    lastVisit: '2026-02-15',
    vehicleMake: 'Fiat',
    avgOrder: 350,
  },
  {
    id: '2',
    firstName: 'Laura',
    lastName: 'Bianchi',
    totalSpent: 1250,
    lastVisit: '2025-03-10',
    vehicleMake: 'Ford',
    avgOrder: 150,
  },
  {
    id: '3',
    firstName: 'Giuseppe',
    lastName: 'Verdi',
    totalSpent: 6200,
    lastVisit: '2026-01-20',
    vehicleMake: 'BMW',
    avgOrder: 450,
  },
  {
    id: '4',
    firstName: 'Anna',
    lastName: 'Neri',
    totalSpent: 450,
    lastVisit: '2026-02-25',
    vehicleMake: 'Volkswagen',
    avgOrder: 200,
  },
  {
    id: '5',
    firstName: 'Roberto',
    lastName: 'Ferrari',
    totalSpent: 12300,
    lastVisit: '2026-02-20',
    vehicleMake: 'Ford',
    avgOrder: 500,
  },
  {
    id: '6',
    firstName: 'Sofia',
    lastName: 'Conti',
    totalSpent: 890,
    lastVisit: '2025-08-15',
    vehicleMake: 'Renault',
    avgOrder: 120,
  },
  {
    id: '7',
    firstName: 'Marco',
    lastName: 'Esposito',
    totalSpent: 2100,
    lastVisit: '2025-12-10',
    vehicleMake: 'Toyota',
    avgOrder: 280,
  },
  {
    id: '8',
    firstName: 'Chiara',
    lastName: 'Ricci',
    totalSpent: 320,
    lastVisit: '2026-02-26',
    vehicleMake: 'Ford',
    avgOrder: 180,
  },
];

const defaultSegments: Segment[] = [
  {
    id: '1',
    name: 'Clienti VIP',
    description: 'Clienti con spesa totale superiore a €5.000',
    rules: [{ id: 'r1', field: 'totalSpent', operator: 'greater_than', value: 5000 }],
    color: 'amber',
    customerCount: 3,
    lastUpdated: '2026-02-20',
    isActive: true,
  },
  {
    id: '2',
    name: 'Clienti a Rischio',
    description: 'Clienti senza visita negli ultimi 12 mesi',
    rules: [{ id: 'r1', field: 'lastVisit', operator: 'before', value: '2025-02-28' }],
    color: 'red',
    customerCount: 2,
    lastUpdated: '2026-02-25',
    isActive: true,
  },
  {
    id: '3',
    name: 'Proprietari Ford',
    description: 'Clienti con veicoli Ford',
    rules: [{ id: 'r1', field: 'vehicleMake', operator: 'equals', value: 'Ford' }],
    color: 'blue',
    customerCount: 3,
    lastUpdated: '2026-02-26',
    isActive: true,
  },
  {
    id: '4',
    name: 'Ordini Alto Valore',
    description: 'Clienti con ordine medio superiore a €300',
    rules: [{ id: 'r1', field: 'avgOrder', operator: 'greater_than', value: 300 }],
    color: 'green',
    customerCount: 3,
    lastUpdated: '2026-02-26',
    isActive: true,
  },
];

const fieldOptions = [
  { value: 'totalSpent', label: 'Totale Speso', type: 'number', icon: Euro },
  { value: 'lastVisit', label: 'Ultima Visita', type: 'date', icon: Calendar },
  { value: 'vehicleMake', label: 'Marca Veicolo', type: 'string', icon: Car },
  { value: 'avgOrder', label: 'Ordine Medio', type: 'number', icon: Target },
  { value: 'firstName', label: 'Nome', type: 'string', icon: Users },
  { value: 'lastName', label: 'Cognome', type: 'string', icon: Users },
];

const operatorOptions = [
  { value: 'equals', label: 'Uguale a', types: ['string', 'number', 'date'] },
  { value: 'not_equals', label: 'Diverso da', types: ['string', 'number', 'date'] },
  { value: 'greater_than', label: 'Maggiore di', types: ['number', 'date'] },
  { value: 'less_than', label: 'Minore di', types: ['number', 'date'] },
  { value: 'contains', label: 'Contiene', types: ['string'] },
  { value: 'not_contains', label: 'Non contiene', types: ['string'] },
  { value: 'before', label: 'Prima del', types: ['date'] },
  { value: 'after', label: 'Dopo il', types: ['date'] },
];

const colorOptions = [
  { value: 'amber', label: 'Ambra', bg: 'bg-[var(--status-warning)]/10 text-[var(--status-warning)]', border: 'border-[var(--status-warning-subtle)]' },
  { value: 'red', label: 'Rosso', bg: 'bg-[var(--status-error-subtle)] text-[var(--status-error)]', border: 'border-[var(--status-error-subtle)]' },
  { value: 'blue', label: 'Blu', bg: 'bg-[var(--status-info-subtle)] text-[var(--status-info)]', border: 'border-[var(--status-info-subtle)]' },
  { value: 'green', label: 'Verde', bg: 'bg-[var(--status-success-subtle)] text-[var(--status-success)]', border: 'border-[var(--status-success-subtle)]' },
  {
    value: 'purple',
    label: 'Viola',
    bg: 'bg-[var(--brand)]/10 text-[var(--brand)]',
    border: 'border-[var(--brand-subtle)]',
  },
  { value: 'pink', label: 'Rosa', bg: 'bg-[var(--status-warning)]/10 text-[var(--status-warning)]', border: 'border-[var(--status-warning)]/20' },
  { value: 'cyan', label: 'Ciano', bg: 'bg-[var(--status-info)]/10 text-[var(--status-info)]', border: 'border-[var(--status-info)]/20' },
];

// Components
function SegmentBadge({ color, name, count }: { color: string; name: string; count: number }) {
  const colorConfig = colorOptions.find(c => c.value === color) || colorOptions[0];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${colorConfig.bg}`}
    >
      <Tag className='h-3.5 w-3.5' />
      {name}
      <span className={`ml-1 rounded-full bg-[var(--surface-secondary)] px-2 py-0.5 text-xs`}>{count}</span>
    </span>
  );
}

function RuleRow({
  rule,
  onUpdate,
  onDelete,
}: {
  rule: SegmentRule;
  onUpdate: (rule: SegmentRule) => void;
  onDelete: () => void;
}) {
  const selectedField = fieldOptions.find(f => f.value === rule.field);
  const availableOperators = operatorOptions.filter(o =>
    o.types.includes(selectedField?.type || 'string')
  );

  return (
    <div className='flex items-center gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-secondary)] p-3 dark:border-[var(--border-default)] dark:bg-[var(--surface-primary)]'>
      <select
        value={rule.field}
        onChange={e => onUpdate({ ...rule, field: e.target.value })}
        className='rounded-md border border-[var(--border-default)] bg-[var(--surface-secondary)] px-3 py-2 text-sm dark:border-[var(--border-default)] dark:bg-[var(--border-default)]'
      >
        {fieldOptions.map(field => (
          <option key={field.value} value={field.value}>
            {field.label}
          </option>
        ))}
      </select>

      <select
        value={rule.operator}
        onChange={e => onUpdate({ ...rule, operator: e.target.value as SegmentRule['operator'] })}
        className='rounded-md border border-[var(--border-default)] bg-[var(--surface-secondary)] px-3 py-2 text-sm dark:border-[var(--border-default)] dark:bg-[var(--border-default)]'
      >
        {availableOperators.map(op => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </select>

      {selectedField?.type === 'date' &&
      (rule.operator === 'before' || rule.operator === 'after') ? (
        <select
          value={rule.value as string}
          onChange={e => onUpdate({ ...rule, value: e.target.value })}
          className='flex-1 rounded-md border border-[var(--border-default)] bg-[var(--surface-secondary)] px-3 py-2 text-sm dark:border-[var(--border-default)] dark:bg-[var(--border-default)]'
        >
          <option value='2025-02-28'>12 mesi fa</option>
          <option value='2025-08-28'>6 mesi fa</option>
          <option value='2025-11-28'>3 mesi fa</option>
          <option value='2026-01-28'>1 mese fa</option>
        </select>
      ) : (
        <Input
          type={selectedField?.type === 'number' ? 'number' : 'text'}
          value={rule.value}
          onChange={e =>
            onUpdate({
              ...rule,
              value: selectedField?.type === 'number' ? Number(e.target.value) : e.target.value,
            })
          }
          placeholder='Valore...'
          className='flex-1'
        />
      )}

      <Button
        variant='ghost'
        size='icon'
        onClick={onDelete}
        className='text-[var(--status-error)] hover:text-[var(--status-error)]'
        aria-label='Elimina regola'
      >
        <Trash2 className='h-4 w-4' />
      </Button>
    </div>
  );
}

export function SegmentationPanel() {
  const [segments, setSegments] = useState<Segment[]>(defaultSegments);
  const [editingSegment, setEditingSegment] = useState<Segment | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [previewSegment, setPreviewSegment] = useState<Segment | null>(null);
  const [expandedSegment, setExpandedSegment] = useState<string | null>(null);

  const calculateSegmentCount = (rules: SegmentRule[]): number => {
    return mockCustomers.filter(customer => {
      return rules.every(rule => {
        const customerValue = customer[rule.field as keyof typeof customer];
        const ruleValue = rule.value;

        switch (rule.operator) {
          case 'equals':
            return customerValue === ruleValue;
          case 'not_equals':
            return customerValue !== ruleValue;
          case 'greater_than':
            return Number(customerValue) > Number(ruleValue);
          case 'less_than':
            return Number(customerValue) < Number(ruleValue);
          case 'contains':
            return String(customerValue).toLowerCase().includes(String(ruleValue).toLowerCase());
          case 'not_contains':
            return !String(customerValue).toLowerCase().includes(String(ruleValue).toLowerCase());
          case 'before':
            return new Date(customerValue as string) < new Date(ruleValue as string);
          case 'after':
            return new Date(customerValue as string) > new Date(ruleValue as string);
          default:
            return true;
        }
      });
    }).length;
  };

  const handleCreateSegment = () => {
    setIsCreating(true);
    setEditingSegment({
      id: Date.now().toString(),
      name: '',
      description: '',
      rules: [
        { id: Date.now().toString(), field: 'totalSpent', operator: 'greater_than', value: 0 },
      ],
      color: 'blue',
      customerCount: 0,
      lastUpdated: new Date().toISOString().split('T')[0],
      isActive: true,
    });
  };

  const handleSaveSegment = () => {
    if (!editingSegment || !editingSegment.name) return;

    const segmentWithCount = {
      ...editingSegment,
      customerCount: calculateSegmentCount(editingSegment.rules),
      lastUpdated: new Date().toISOString().split('T')[0],
    };

    if (isCreating) {
      setSegments([...segments, segmentWithCount]);
    } else {
      setSegments(segments.map(s => (s.id === segmentWithCount.id ? segmentWithCount : s)));
    }

    setEditingSegment(null);
    setIsCreating(false);
  };

  const handleDeleteSegment = (id: string) => {
    setSegments(segments.filter(s => s.id !== id));
  };

  const previewCustomers = useMemo(() => {
    if (!previewSegment) return [];
    return mockCustomers.filter(customer => {
      return previewSegment.rules.every(rule => {
        const customerValue = customer[rule.field as keyof typeof customer];
        const ruleValue = rule.value;

        switch (rule.operator) {
          case 'equals':
            return customerValue === ruleValue;
          case 'not_equals':
            return customerValue !== ruleValue;
          case 'greater_than':
            return Number(customerValue) > Number(ruleValue);
          case 'less_than':
            return Number(customerValue) < Number(ruleValue);
          case 'contains':
            return String(customerValue).toLowerCase().includes(String(ruleValue).toLowerCase());
          case 'not_contains':
            return !String(customerValue).toLowerCase().includes(String(ruleValue).toLowerCase());
          case 'before':
            return new Date(customerValue as string) < new Date(ruleValue as string);
          case 'after':
            return new Date(customerValue as string) > new Date(ruleValue as string);
          default:
            return true;
        }
      });
    });
  }, [previewSegment]);

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
            Segmentazione Pubblico
          </h2>
          <p className='text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'>
            Crea e gestisci segmenti clienti per marketing mirato
          </p>
        </div>
        <Button onClick={handleCreateSegment}>
          <Plus className='mr-2 h-4 w-4' />
          Nuovo Segmento
        </Button>
      </div>

      {/* Segments Grid */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {segments.map(segment => (
          <div
            key={segment.id}
            className={`workshop-card relative ${expandedSegment === segment.id ? 'ring-2 ring-brand-500' : ''}`}
          >
            <div className='flex items-start justify-between'>
              <div className='flex-1'>
                <div className='flex items-center gap-2'>
                  <SegmentBadge
                    color={segment.color}
                    name={segment.name}
                    count={segment.customerCount}
                  />
                </div>
                <p className='mt-2 text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'>
                  {segment.description}
                </p>
                <p className='mt-2 text-xs text-[var(--text-tertiary)]'>
                  Ultimo aggiornamento: {segment.lastUpdated}
                </p>
              </div>
              <div className='flex gap-1'>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() => setPreviewSegment(segment)}
                  aria-label='Anteprima segmento'
                >
                  <Eye className='h-4 w-4' />
                </Button>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() => {
                    setEditingSegment(segment);
                    setIsCreating(false);
                  }}
                  aria-label='Modifica segmento'
                >
                  <Edit className='h-4 w-4' />
                </Button>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() => handleDeleteSegment(segment.id)}
                  className='text-[var(--status-error)] hover:text-[var(--status-error)]'
                  aria-label='Elimina segmento'
                >
                  <Trash2 className='h-4 w-4' />
                </Button>
              </div>
            </div>

            {/* Rules Preview */}
            <div className='mt-4 space-y-2'>
              {segment.rules.map((rule, idx) => {
                const field = fieldOptions.find(f => f.value === rule.field);
                const operator = operatorOptions.find(o => o.value === rule.operator);
                return (
                  <div
                    key={rule.id}
                    className='flex items-center gap-2 text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'
                  >
                    <Filter className='h-3.5 w-3.5' />
                    <span>{field?.label}</span>
                    <span className='text-[var(--text-tertiary)]'>{operator?.label.toLowerCase()}</span>
                    <span className='font-medium'>{rule.value}</span>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className='mt-4 flex gap-2'>
              <Button variant='outline' size='sm' className='flex-1'>
                <Mail className='mr-2 h-4 w-4' />
                Campagna
              </Button>
              <Button variant='outline' size='sm' className='flex-1'>
                <Download className='mr-2 h-4 w-4' />
                Esporta
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      {(isCreating || editingSegment) && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-[var(--surface-primary)]/50 p-4'>
          <div className='max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-[var(--surface-secondary)] p-6 shadow-xl dark:bg-[var(--surface-primary)]'>
            <div className='mb-6 flex items-center justify-between'>
              <h3 className='text-lg font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                {isCreating ? 'Crea Nuovo Segmento' : 'Modifica Segmento'}
              </h3>
              <Button
                variant='ghost'
                size='icon'
                onClick={() => {
                  setEditingSegment(null);
                  setIsCreating(false);
                }}
                aria-label='Chiudi'
              >
                <X className='h-5 w-5' />
              </Button>
            </div>

            {editingSegment && (
              <div className='space-y-6'>
                {/* Basic Info */}
                <div className='space-y-4'>
                  <div>
                    <label className='mb-2 block text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                      Nome Segmento
                    </label>
                    <Input
                      value={editingSegment.name}
                      onChange={e => setEditingSegment({ ...editingSegment, name: e.target.value })}
                      placeholder='es. Clienti VIP'
                    />
                  </div>
                  <div>
                    <label className='mb-2 block text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                      Descrizione
                    </label>
                    <Input
                      value={editingSegment.description}
                      onChange={e =>
                        setEditingSegment({ ...editingSegment, description: e.target.value })
                      }
                      placeholder='Descrivi questo segmento...'
                    />
                  </div>
                  <div>
                    <label className='mb-2 block text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                      Colore
                    </label>
                    <div className='flex flex-wrap gap-2'>
                      {colorOptions.map(color => (
                        <button
                          key={color.value}
                          onClick={() =>
                            setEditingSegment({ ...editingSegment, color: color.value })
                          }
                          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${color.bg} ${
                            editingSegment.color === color.value
                              ? 'ring-2 ring-offset-2 ring-[var(--border-strong)]'
                              : ''
                          }`}
                        >
                          {color.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Rules Builder */}
                <div>
                  <div className='mb-3 flex items-center justify-between'>
                    <label className='text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                      Regole Segmento
                    </label>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() =>
                        setEditingSegment({
                          ...editingSegment,
                          rules: [
                            ...editingSegment.rules,
                            {
                              id: Date.now().toString(),
                              field: 'totalSpent',
                              operator: 'greater_than',
                              value: 0,
                            },
                          ],
                        })
                      }
                    >
                      <Plus className='mr-2 h-4 w-4' />
                      Aggiungi Regola
                    </Button>
                  </div>
                  <div className='space-y-3'>
                    {editingSegment.rules.map(rule => (
                      <RuleRow
                        key={rule.id}
                        rule={rule}
                        onUpdate={updatedRule =>
                          setEditingSegment({
                            ...editingSegment,
                            rules: editingSegment.rules.map(r =>
                              r.id === rule.id ? updatedRule : r
                            ),
                          })
                        }
                        onDelete={() =>
                          setEditingSegment({
                            ...editingSegment,
                            rules: editingSegment.rules.filter(r => r.id !== rule.id),
                          })
                        }
                      />
                    ))}
                  </div>
                </div>

                {/* Live Preview */}
                <div className='rounded-lg border border-brand-200 bg-[var(--brand)]/5 p-4 dark:border-brand-800 dark:bg-[var(--brand)]/40/20'>
                  <div className='flex items-center gap-2'>
                    <Play className='h-5 w-5 text-[var(--brand)]' />
                    <span className='font-semibold text-brand-900 dark:text-brand-100'>
                      Anteprima: {calculateSegmentCount(editingSegment.rules)} clienti
                      corrispondenti
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className='flex justify-end gap-3'>
                  <Button
                    variant='outline'
                    onClick={() => {
                      setEditingSegment(null);
                      setIsCreating(false);
                    }}
                  >
                    Annulla
                  </Button>
                  <Button onClick={handleSaveSegment}>
                    <Save className='mr-2 h-4 w-4' />
                    Salva Segmento
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewSegment && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-[var(--surface-primary)]/50 p-4'>
          <div className='max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-[var(--surface-secondary)] p-6 shadow-xl dark:bg-[var(--surface-primary)]'>
            <div className='mb-6 flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                <SegmentBadge
                  color={previewSegment.color}
                  name={previewSegment.name}
                  count={previewCustomers.length}
                />
              </div>
              <Button
                variant='ghost'
                size='icon'
                onClick={() => setPreviewSegment(null)}
                aria-label='Chiudi anteprima'
              >
                <X className='h-5 w-5' />
              </Button>
            </div>

            <div className='workshop-card'>
              <table className='data-table'>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Totale Speso</th>
                    <th>Ultima Visita</th>
                    <th>Veicolo</th>
                    <th>Ordine Medio</th>
                  </tr>
                </thead>
                <tbody>
                  {previewCustomers.map(customer => (
                    <tr key={customer.id}>
                      <td className='font-medium'>
                        {customer.firstName} {customer.lastName}
                      </td>
                      <td>{formatCurrency(customer.totalSpent)}</td>
                      <td>{customer.lastVisit}</td>
                      <td>{customer.vehicleMake}</td>
                      <td>{formatCurrency(customer.avgOrder)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewCustomers.length === 0 && (
                <p className='py-8 text-center text-[var(--text-tertiary)]'>
                  Nessun cliente corrisponde a questo segmento
                </p>
              )}
            </div>

            <div className='mt-4 flex justify-end gap-3'>
              <Button variant='outline' onClick={() => setPreviewSegment(null)}>
                Chiudi
              </Button>
              <Button>
                <Download className='mr-2 h-4 w-4' />
                Esporta Lista
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
