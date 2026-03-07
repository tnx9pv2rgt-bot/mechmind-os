'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

// Types
interface SegmentRule {
  id: string
  field: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains' | 'before' | 'after'
  value: string | number
}

interface Segment {
  id: string
  name: string
  description: string
  rules: SegmentRule[]
  color: string
  customerCount: number
  lastUpdated: string
  isActive: boolean
}

// Mock Data
const mockCustomers = [
  { id: '1', firstName: 'Mario', lastName: 'Rossi', totalSpent: 8750, lastVisit: '2026-02-15', vehicleMake: 'Fiat', avgOrder: 350 },
  { id: '2', firstName: 'Laura', lastName: 'Bianchi', totalSpent: 1250, lastVisit: '2025-03-10', vehicleMake: 'Ford', avgOrder: 150 },
  { id: '3', firstName: 'Giuseppe', lastName: 'Verdi', totalSpent: 6200, lastVisit: '2026-01-20', vehicleMake: 'BMW', avgOrder: 450 },
  { id: '4', firstName: 'Anna', lastName: 'Neri', totalSpent: 450, lastVisit: '2026-02-25', vehicleMake: 'Volkswagen', avgOrder: 200 },
  { id: '5', firstName: 'Roberto', lastName: 'Ferrari', totalSpent: 12300, lastVisit: '2026-02-20', vehicleMake: 'Ford', avgOrder: 500 },
  { id: '6', firstName: 'Sofia', lastName: 'Conti', totalSpent: 890, lastVisit: '2025-08-15', vehicleMake: 'Renault', avgOrder: 120 },
  { id: '7', firstName: 'Marco', lastName: 'Esposito', totalSpent: 2100, lastVisit: '2025-12-10', vehicleMake: 'Toyota', avgOrder: 280 },
  { id: '8', firstName: 'Chiara', lastName: 'Ricci', totalSpent: 320, lastVisit: '2026-02-26', vehicleMake: 'Ford', avgOrder: 180 },
]

const defaultSegments: Segment[] = [
  {
    id: '1',
    name: 'VIP Customers',
    description: 'Clienti con spesa totale superiore a €5.000',
    rules: [{ id: 'r1', field: 'totalSpent', operator: 'greater_than', value: 5000 }],
    color: 'amber',
    customerCount: 3,
    lastUpdated: '2026-02-20',
    isActive: true,
  },
  {
    id: '2',
    name: 'At-Risk Customers',
    description: 'Clienti senza visita negli ultimi 12 mesi',
    rules: [{ id: 'r1', field: 'lastVisit', operator: 'before', value: '2025-02-28' }],
    color: 'red',
    customerCount: 2,
    lastUpdated: '2026-02-25',
    isActive: true,
  },
  {
    id: '3',
    name: 'Ford Owners',
    description: 'Clienti con veicoli Ford',
    rules: [{ id: 'r1', field: 'vehicleMake', operator: 'equals', value: 'Ford' }],
    color: 'blue',
    customerCount: 3,
    lastUpdated: '2026-02-26',
    isActive: true,
  },
  {
    id: '4',
    name: 'High-Value Orders',
    description: 'Clienti con ordine medio superiore a €300',
    rules: [{ id: 'r1', field: 'avgOrder', operator: 'greater_than', value: 300 }],
    color: 'green',
    customerCount: 3,
    lastUpdated: '2026-02-26',
    isActive: true,
  },
]

const fieldOptions = [
  { value: 'totalSpent', label: 'Totale Speso', type: 'number', icon: Euro },
  { value: 'lastVisit', label: 'Ultima Visita', type: 'date', icon: Calendar },
  { value: 'vehicleMake', label: 'Marca Veicolo', type: 'string', icon: Car },
  { value: 'avgOrder', label: 'Ordine Medio', type: 'number', icon: Target },
  { value: 'firstName', label: 'Nome', type: 'string', icon: Users },
  { value: 'lastName', label: 'Cognome', type: 'string', icon: Users },
]

const operatorOptions = [
  { value: 'equals', label: 'Uguale a', types: ['string', 'number', 'date'] },
  { value: 'not_equals', label: 'Diverso da', types: ['string', 'number', 'date'] },
  { value: 'greater_than', label: 'Maggiore di', types: ['number', 'date'] },
  { value: 'less_than', label: 'Minore di', types: ['number', 'date'] },
  { value: 'contains', label: 'Contiene', types: ['string'] },
  { value: 'not_contains', label: 'Non contiene', types: ['string'] },
  { value: 'before', label: 'Prima del', types: ['date'] },
  { value: 'after', label: 'Dopo il', types: ['date'] },
]

const colorOptions = [
  { value: 'amber', label: 'Ambra', bg: 'bg-amber-100 text-amber-800', border: 'border-amber-200' },
  { value: 'red', label: 'Rosso', bg: 'bg-red-100 text-red-800', border: 'border-red-200' },
  { value: 'blue', label: 'Blu', bg: 'bg-blue-100 text-blue-800', border: 'border-blue-200' },
  { value: 'green', label: 'Verde', bg: 'bg-green-100 text-green-800', border: 'border-green-200' },
  { value: 'purple', label: 'Viola', bg: 'bg-purple-100 text-purple-800', border: 'border-purple-200' },
  { value: 'pink', label: 'Rosa', bg: 'bg-pink-100 text-pink-800', border: 'border-pink-200' },
  { value: 'cyan', label: 'Ciano', bg: 'bg-cyan-100 text-cyan-800', border: 'border-cyan-200' },
]

// Components
function SegmentBadge({ color, name, count }: { color: string; name: string; count: number }) {
  const colorConfig = colorOptions.find(c => c.value === color) || colorOptions[0]

  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${colorConfig.bg}`}>
      <Tag className="h-3.5 w-3.5" />
      {name}
      <span className={`ml-1 rounded-full bg-white/50 px-2 py-0.5 text-xs`}>
        {count}
      </span>
    </span>
  )
}

function RuleRow({
  rule,
  onUpdate,
  onDelete,
}: {
  rule: SegmentRule
  onUpdate: (rule: SegmentRule) => void
  onDelete: () => void
}) {
  const selectedField = fieldOptions.find(f => f.value === rule.field)
  const availableOperators = operatorOptions.filter(o => o.types.includes(selectedField?.type || 'string'))

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
      <select
        value={rule.field}
        onChange={(e) => onUpdate({ ...rule, field: e.target.value })}
        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700"
      >
        {fieldOptions.map(field => (
          <option key={field.value} value={field.value}>{field.label}</option>
        ))}
      </select>

      <select
        value={rule.operator}
        onChange={(e) => onUpdate({ ...rule, operator: e.target.value as SegmentRule['operator'] })}
        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700"
      >
        {availableOperators.map(op => (
          <option key={op.value} value={op.value}>{op.label}</option>
        ))}
      </select>

      {selectedField?.type === 'date' && (rule.operator === 'before' || rule.operator === 'after') ? (
        <select
          value={rule.value as string}
          onChange={(e) => onUpdate({ ...rule, value: e.target.value })}
          className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700"
        >
          <option value="2025-02-28">12 mesi fa</option>
          <option value="2025-08-28">6 mesi fa</option>
          <option value="2025-11-28">3 mesi fa</option>
          <option value="2026-01-28">1 mese fa</option>
        </select>
      ) : (
        <Input
          type={selectedField?.type === 'number' ? 'number' : 'text'}
          value={rule.value}
          onChange={(e) => onUpdate({ ...rule, value: selectedField?.type === 'number' ? Number(e.target.value) : e.target.value })}
          placeholder="Valore..."
          className="flex-1"
        />
      )}

      <Button variant="ghost" size="icon" onClick={onDelete} className="text-status-urgent hover:text-status-urgent">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}

export function SegmentationPanel() {
  const [segments, setSegments] = useState<Segment[]>(defaultSegments)
  const [editingSegment, setEditingSegment] = useState<Segment | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [previewSegment, setPreviewSegment] = useState<Segment | null>(null)
  const [expandedSegment, setExpandedSegment] = useState<string | null>(null)

  const calculateSegmentCount = (rules: SegmentRule[]): number => {
    return mockCustomers.filter(customer => {
      return rules.every(rule => {
        const customerValue = customer[rule.field as keyof typeof customer]
        const ruleValue = rule.value

        switch (rule.operator) {
          case 'equals':
            return customerValue === ruleValue
          case 'not_equals':
            return customerValue !== ruleValue
          case 'greater_than':
            return Number(customerValue) > Number(ruleValue)
          case 'less_than':
            return Number(customerValue) < Number(ruleValue)
          case 'contains':
            return String(customerValue).toLowerCase().includes(String(ruleValue).toLowerCase())
          case 'not_contains':
            return !String(customerValue).toLowerCase().includes(String(ruleValue).toLowerCase())
          case 'before':
            return new Date(customerValue as string) < new Date(ruleValue as string)
          case 'after':
            return new Date(customerValue as string) > new Date(ruleValue as string)
          default:
            return true
        }
      })
    }).length
  }

  const handleCreateSegment = () => {
    setIsCreating(true)
    setEditingSegment({
      id: Date.now().toString(),
      name: '',
      description: '',
      rules: [{ id: Date.now().toString(), field: 'totalSpent', operator: 'greater_than', value: 0 }],
      color: 'blue',
      customerCount: 0,
      lastUpdated: new Date().toISOString().split('T')[0],
      isActive: true,
    })
  }

  const handleSaveSegment = () => {
    if (!editingSegment || !editingSegment.name) return

    const segmentWithCount = {
      ...editingSegment,
      customerCount: calculateSegmentCount(editingSegment.rules),
      lastUpdated: new Date().toISOString().split('T')[0],
    }

    if (isCreating) {
      setSegments([...segments, segmentWithCount])
    } else {
      setSegments(segments.map(s => s.id === segmentWithCount.id ? segmentWithCount : s))
    }

    setEditingSegment(null)
    setIsCreating(false)
  }

  const handleDeleteSegment = (id: string) => {
    setSegments(segments.filter(s => s.id !== id))
  }

  const previewCustomers = useMemo(() => {
    if (!previewSegment) return []
    return mockCustomers.filter(customer => {
      return previewSegment.rules.every(rule => {
        const customerValue = customer[rule.field as keyof typeof customer]
        const ruleValue = rule.value

        switch (rule.operator) {
          case 'equals':
            return customerValue === ruleValue
          case 'not_equals':
            return customerValue !== ruleValue
          case 'greater_than':
            return Number(customerValue) > Number(ruleValue)
          case 'less_than':
            return Number(customerValue) < Number(ruleValue)
          case 'contains':
            return String(customerValue).toLowerCase().includes(String(ruleValue).toLowerCase())
          case 'not_contains':
            return !String(customerValue).toLowerCase().includes(String(ruleValue).toLowerCase())
          case 'before':
            return new Date(customerValue as string) < new Date(ruleValue as string)
          case 'after':
            return new Date(customerValue as string) > new Date(ruleValue as string)
          default:
            return true
        }
      })
    })
  }, [previewSegment])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Audience Segmentation</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Create and manage customer segments for targeted marketing
          </p>
        </div>
        <Button onClick={handleCreateSegment}>
          <Plus className="mr-2 h-4 w-4" />
          New Segment
        </Button>
      </div>

      {/* Segments Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {segments.map((segment) => (
          <div
            key={segment.id}
            className={`workshop-card relative ${expandedSegment === segment.id ? 'ring-2 ring-brand-500' : ''}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <SegmentBadge color={segment.color} name={segment.name} count={segment.customerCount} />
                </div>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{segment.description}</p>
                <p className="mt-2 text-xs text-gray-500">
                  Last updated: {segment.lastUpdated}
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPreviewSegment(segment)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setEditingSegment(segment)
                    setIsCreating(false)
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteSegment(segment.id)}
                  className="text-status-urgent hover:text-status-urgent"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Rules Preview */}
            <div className="mt-4 space-y-2">
              {segment.rules.map((rule, idx) => {
                const field = fieldOptions.find(f => f.value === rule.field)
                const operator = operatorOptions.find(o => o.value === rule.operator)
                return (
                  <div key={rule.id} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Filter className="h-3.5 w-3.5" />
                    <span>{field?.label}</span>
                    <span className="text-gray-400">{operator?.label.toLowerCase()}</span>
                    <span className="font-medium">{rule.value}</span>
                  </div>
                )
              })}
            </div>

            {/* Actions */}
            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="sm" className="flex-1">
                <Mail className="mr-2 h-4 w-4" />
                Campaign
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      {(isCreating || editingSegment) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {isCreating ? 'Create New Segment' : 'Edit Segment'}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setEditingSegment(null)
                  setIsCreating(false)
                }}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {editingSegment && (
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Segment Name
                    </label>
                    <Input
                      value={editingSegment.name}
                      onChange={(e) => setEditingSegment({ ...editingSegment, name: e.target.value })}
                      placeholder="e.g., VIP Customers"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Description
                    </label>
                    <Input
                      value={editingSegment.description}
                      onChange={(e) => setEditingSegment({ ...editingSegment, description: e.target.value })}
                      placeholder="Describe this segment..."
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Color
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {colorOptions.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => setEditingSegment({ ...editingSegment, color: color.value })}
                          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${color.bg} ${
                            editingSegment.color === color.value ? 'ring-2 ring-offset-2 ring-gray-400' : ''
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
                  <div className="mb-3 flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Segment Rules
                    </label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setEditingSegment({
                          ...editingSegment,
                          rules: [
                            ...editingSegment.rules,
                            { id: Date.now().toString(), field: 'totalSpent', operator: 'greater_than', value: 0 },
                          ],
                        })
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Rule
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {editingSegment.rules.map((rule) => (
                      <RuleRow
                        key={rule.id}
                        rule={rule}
                        onUpdate={(updatedRule) =>
                          setEditingSegment({
                            ...editingSegment,
                            rules: editingSegment.rules.map((r) => (r.id === rule.id ? updatedRule : r)),
                          })
                        }
                        onDelete={() =>
                          setEditingSegment({
                            ...editingSegment,
                            rules: editingSegment.rules.filter((r) => r.id !== rule.id),
                          })
                        }
                      />
                    ))}
                  </div>
                </div>

                {/* Live Preview */}
                <div className="rounded-lg border border-brand-200 bg-brand-50 p-4 dark:border-brand-800 dark:bg-brand-900/20">
                  <div className="flex items-center gap-2">
                    <Play className="h-5 w-5 text-brand-600" />
                    <span className="font-semibold text-brand-900 dark:text-brand-100">
                      Preview: {calculateSegmentCount(editingSegment.rules)} customers match
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingSegment(null)
                      setIsCreating(false)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSaveSegment}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Segment
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewSegment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SegmentBadge color={previewSegment.color} name={previewSegment.name} count={previewCustomers.length} />
              </div>
              <Button variant="ghost" size="icon" onClick={() => setPreviewSegment(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="workshop-card">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Total Spent</th>
                    <th>Last Visit</th>
                    <th>Vehicle</th>
                    <th>Avg Order</th>
                  </tr>
                </thead>
                <tbody>
                  {previewCustomers.map((customer) => (
                    <tr key={customer.id}>
                      <td className="font-medium">{customer.firstName} {customer.lastName}</td>
                      <td>{formatCurrency(customer.totalSpent)}</td>
                      <td>{customer.lastVisit}</td>
                      <td>{customer.vehicleMake}</td>
                      <td>{formatCurrency(customer.avgOrder)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewCustomers.length === 0 && (
                <p className="py-8 text-center text-gray-500">No customers match this segment</p>
              )}
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setPreviewSegment(null)}>
                Close
              </Button>
              <Button>
                <Download className="mr-2 h-4 w-4" />
                Export List
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
