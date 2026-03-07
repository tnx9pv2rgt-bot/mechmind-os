'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Wrench, 
  Calendar, 
  User, 
  Euro,
  Clock,
  ChevronDown,
  ChevronUp,
  FileText,
  Image as ImageIcon,
  CheckCircle2
} from 'lucide-react'
import { getServiceHistoryByVehicleId } from '@/lib/mock/vehicles'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { ServiceType, ServiceHistoryEntry } from '@/types/vehicles'

// Service Type Badge
function ServiceTypeBadge({ type }: { type: ServiceType }) {
  const labels: Record<ServiceType, string> = {
    oil_change: 'Cambio Olio',
    tire_rotation: 'Cambio Gomme',
    brake_service: 'Freni',
    inspection: 'Controllo',
    diagnostic: 'Diagnosi',
    repair: 'Riparazione',
    maintenance: 'Manutenzione',
    other: 'Altro',
  }
  
  const colors: Record<ServiceType, string> = {
    oil_change: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
    tire_rotation: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300',
    brake_service: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300',
    inspection: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300',
    diagnostic: 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300',
    repair: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300',
    maintenance: 'bg-teal-100 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300',
    other: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  }
  
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', colors[type])}>
      {labels[type]}
    </span>
  )
}

// Service Entry Card
function ServiceEntryCard({ entry, isLast }: { entry: ServiceHistoryEntry; isLast: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const hasPhotos = entry.beforePhotos?.length || entry.afterPhotos?.length
  
  return (
    <div className="relative">
      {/* Timeline Line */}
      {!isLast && (
        <div className="absolute left-5 top-12 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
      )}
      
      <div className="flex gap-4">
        {/* Timeline Dot */}
        <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/20">
          <Wrench className="h-5 w-5 text-brand-600" />
        </div>
        
        {/* Content */}
        <div className="flex-1 pb-8">
          <div 
            className={cn(
              "rounded-lg border bg-white p-4 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800",
              isExpanded && "shadow-md"
            )}
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <ServiceTypeBadge type={entry.serviceType} />
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(entry.date)}
                  </span>
                </div>
                <h4 className="mt-1 font-semibold text-gray-900 dark:text-white">
                  {entry.description}
                </h4>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(entry.cost)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {entry.km.toLocaleString()} km
                </p>
              </div>
            </div>
            
            {/* Quick Info */}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {entry.mechanic}
              </div>
              {entry.duration && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {entry.duration} min
                </div>
              )}
              {hasPhotos && (
                <div className="flex items-center gap-1">
                  <ImageIcon className="h-4 w-4" />
                  Foto disponibili
                </div>
              )}
            </div>
            
            {/* Expand/Collapse */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-3 flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Mostra meno
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Dettagli
                </>
              )}
            </button>
            
            {/* Expanded Content */}
            {isExpanded && (
              <div className="mt-4 space-y-4 border-t border-gray-200 pt-4 dark:border-gray-700">
                {/* Parts Used */}
                {entry.parts.length > 0 && (
                  <div>
                    <h5 className="mb-2 text-sm font-medium text-gray-900 dark:text-white">
                      Ricambi utilizzati
                    </h5>
                    <ul className="space-y-1">
                      {entry.parts.map((part, index) => (
                        <li 
                          key={index}
                          className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
                        >
                          <CheckCircle2 className="h-3 w-3 text-status-ready" />
                          {part}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Notes */}
                {entry.notes && (
                  <div>
                    <h5 className="mb-2 text-sm font-medium text-gray-900 dark:text-white">
                      Note
                    </h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {entry.notes}
                    </p>
                  </div>
                )}
                
                {/* Photos */}
                {hasPhotos && (
                  <div>
                    <h5 className="mb-2 text-sm font-medium text-gray-900 dark:text-white">
                      Foto
                    </h5>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {entry.beforePhotos && entry.beforePhotos.length > 0 && (
                        <div>
                          <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">Prima</p>
                          <div className="grid grid-cols-2 gap-2">
                            {entry.beforePhotos.map((photo, index) => (
                              <div 
                                key={index}
                                className="aspect-square rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
                              >
                                <ImageIcon className="h-8 w-8 text-gray-400" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {entry.afterPhotos && entry.afterPhotos.length > 0 && (
                        <div>
                          <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">Dopo</p>
                          <div className="grid grid-cols-2 gap-2">
                            {entry.afterPhotos.map((photo, index) => (
                              <div 
                                key={index}
                                className="aspect-square rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
                              >
                                <ImageIcon className="h-8 w-8 text-gray-400" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface ServiceHistoryProps {
  vehicleId: string
}

export function ServiceHistory({ vehicleId }: ServiceHistoryProps) {
  const serviceHistory = getServiceHistoryByVehicleId(vehicleId)
  const [filter, setFilter] = useState<ServiceType | 'all'>('all')
  
  const filteredHistory = filter === 'all' 
    ? serviceHistory 
    : serviceHistory.filter(entry => entry.serviceType === filter)
  
  const totalSpent = filteredHistory.reduce((sum, entry) => sum + entry.cost, 0)
  const totalServices = filteredHistory.length
  
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
          <p className="text-sm text-gray-600 dark:text-gray-400">Servizi Effettuati</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{totalServices}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
          <p className="text-sm text-gray-600 dark:text-gray-400">Spesa Totale</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(totalSpent)}
          </p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
          <p className="text-sm text-gray-600 dark:text-gray-400">Media per Servizio</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(totalServices > 0 ? totalSpent / totalServices : 0)}
          </p>
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Filtra per tipo:
        </span>
        {(['all', 'oil_change', 'maintenance', 'repair', 'tire_rotation', 'inspection'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              filter === type
                ? 'bg-brand-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
            )}
          >
            {type === 'all' ? 'Tutti' : (
              {
                oil_change: 'Cambio Olio',
                maintenance: 'Manutenzione',
                repair: 'Riparazione',
                tire_rotation: 'Cambio Gomme',
                inspection: 'Controllo',
              }[type]
            )}
          </button>
        ))}
      </div>
      
      {/* Timeline */}
      <div className="workshop-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Storico Servizi
          </h2>
          <Button size="sm">
            <Wrench className="mr-2 h-4 w-4" />
            Aggiungi Servizio
          </Button>
        </div>
        
        {filteredHistory.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
            <FileText className="mx-auto mb-2 h-8 w-8 text-gray-400" />
            <p className="text-gray-600 dark:text-gray-400">
              Nessun servizio trovato per questo filtro
            </p>
          </div>
        ) : (
          <div className="mt-4">
            {filteredHistory.map((entry, index) => (
              <ServiceEntryCard 
                key={entry.id} 
                entry={entry} 
                isLast={index === filteredHistory.length - 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
