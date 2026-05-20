'use client'

import { useEffect, useMemo, useState } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Droplets,
  Wind,
  AlertTriangle,
  CheckCircle2,
  Thermometer,
  Car,
  Cigarette,
  Dog,
  Flower2,
  Gauge,
  Filter,
  Waves,
  ShieldAlert,
  Info,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { cn } from '@/lib/utils'
import {
  MoldRiskLevel,
  type MoldLocation,
  calculateMoldRisk,
  getMoldRiskDescription,
  FilterCondition,
  BlockageSeverity,
  SmokeIntensity,
} from '@/lib/services/sensoryService'

// =============================================================================
// Form Data Type
// =============================================================================

export interface SensoryFormData {
  // Humidity
  humidity: number

  // Moisture Detection
  carpetMoisture: number
  doorMoisture: {
    fl: number // Front Left
    fr: number // Front Right
    rl: number // Rear Left
    rr: number // Rear Right
  }
  trunkMoisture: number

  // Odor Detection
  smokeDetected: boolean
  smokeIntensity: number // 1-10
  petSmellDetected: boolean
  petType: string
  moldDetected: boolean
  moldLocations: MoldLocation[]
  mustySmell: boolean
  gasolineSmell: 'normal' | 'strong'

  // AC System
  acDrainFlowing: boolean
  acBlockage: BlockageSeverity
  filterCondition: FilterCondition
  acSmell: 'fresh' | 'musty' | 'mold'
}

// =============================================================================
// Props Interface
// =============================================================================

export interface SensorySectionProps {
  form: UseFormReturn<SensoryFormData>
  onCalculateRisk?: (data: SensoryFormData) => MoldRiskLevel
}

// =============================================================================
// Constants
// =============================================================================

const MOLD_LOCATIONS: { value: MoldLocation; label: string; icon: React.ReactNode }[] = [
  { value: 'CARPET_FRONT', label: 'Tappeto Anteriore', icon: <Car className="h-3.5 w-3.5" /> },
  { value: 'CARPET_REAR', label: 'Tappeto Posteriore', icon: <Car className="h-3.5 w-3.5" /> },
  { value: 'DRIVER_SEAT', label: 'Sedile Guida', icon: <Car className="h-3.5 w-3.5" /> },
  { value: 'PASSENGER_SEAT', label: 'Sedile Passeggero', icon: <Car className="h-3.5 w-3.5" /> },
  { value: 'REAR_SEATS', label: 'Sedili Posteriori', icon: <Car className="h-3.5 w-3.5" /> },
  { value: 'TRUNK', label: 'Bagagliaio', icon: <Car className="h-3.5 w-3.5" /> },
  { value: 'AC_VENTS', label: 'Bocchette AC', icon: <Wind className="h-3.5 w-3.5" /> },
  { value: 'HEADLINER', label: 'Cielino', icon: <Car className="h-3.5 w-3.5" /> },
]

const FILTER_CONDITION_OPTIONS: { value: FilterCondition; label: string; color: string }[] = [
  { value: FilterCondition.GOOD, label: 'Buono', color: 'text-[var(--status-success)] bg-[var(--status-success-subtle)] border-[var(--status-success)]/30' },
  { value: FilterCondition.FAIR, label: 'Discreto', color: 'text-[var(--status-warning)] bg-[var(--status-warning)]/10 border-[var(--status-warning)]/30' },
  { value: FilterCondition.POOR, label: 'Scarso', color: 'text-[var(--status-warning)] bg-[var(--status-warning)]/5 border-[var(--status-warning)]/20' },
  { value: FilterCondition.REPLACEMENT_NEEDED, label: 'Da Sostituire', color: 'text-[var(--status-error)] bg-[var(--status-error-subtle)] border-[var(--status-error)]/30' },
]

const BLOCKAGE_OPTIONS: { value: BlockageSeverity; label: string; color: string }[] = [
  { value: BlockageSeverity.NONE, label: 'Nessuno', color: 'text-[var(--status-success)]' },
  { value: BlockageSeverity.MINOR, label: 'Lieve', color: 'text-[var(--status-warning)]' },
  { value: BlockageSeverity.MODERATE, label: 'Moderato', color: 'text-[var(--status-warning)]' },
  { value: BlockageSeverity.SEVERE, label: 'Grave', color: 'text-[var(--status-error)]' },
]

// =============================================================================
// Helper Functions
// =============================================================================

function getHumidityColor(humidity: number): { bg: string; text: string; bar: string; label: string } {
  if (humidity < 50) {
    return {
      bg: 'bg-[var(--status-success-subtle)]',
      text: 'text-[var(--status-success)]',
      bar: 'bg-gradient-to-r from-[var(--status-success)] to-[var(--status-success)]',
      label: 'Ottimale',
    }
  }
  if (humidity <= 70) {
    return {
      bg: 'bg-[var(--status-warning)]/10',
      text: 'text-[var(--status-warning)]',
      bar: 'bg-gradient-to-r from-[var(--status-warning)] to-[var(--status-warning)]',
      label: 'Elevata',
    }
  }
  return {
    bg: 'bg-[var(--status-error-subtle)]',
    text: 'text-[var(--status-error)]',
    bar: 'bg-gradient-to-r from-[var(--status-error)] to-[var(--status-error)]',
    label: 'Critica',
  }
}

function getMoldRiskColor(level: MoldRiskLevel): { bg: string; text: string; border: string; icon: React.ReactNode } {
  switch (level) {
    case MoldRiskLevel.LOW:
      return {
        bg: 'bg-[var(--status-success-subtle)]',
        text: 'text-[var(--status-success)]',
        border: 'border-[var(--status-success-subtle)]',
        icon: <CheckCircle2 className="h-5 w-5 text-[var(--status-success)]" />,
      }
    case MoldRiskLevel.MEDIUM:
      return {
        bg: 'bg-[var(--status-warning)]/10',
        text: 'text-[var(--status-warning)]',
        border: 'border-[var(--status-warning)]/30',
        icon: <AlertTriangle className="h-5 w-5 text-[var(--status-warning)]" />,
      }
    case MoldRiskLevel.HIGH:
      return {
        bg: 'bg-[var(--status-error-subtle)]',
        text: 'text-[var(--status-error)]',
        border: 'border-[var(--status-error-subtle)]',
        icon: <ShieldAlert className="h-5 w-5 text-[var(--status-error)]" />,
      }
  }
}

function getRiskLevelLabel(level: MoldRiskLevel): string {
  switch (level) {
    case MoldRiskLevel.LOW:
      return 'BASSO'
    case MoldRiskLevel.MEDIUM:
      return 'MEDIO'
    case MoldRiskLevel.HIGH:
      return 'ALTO'
  }
}

function getRiskDescriptionItalian(level: MoldRiskLevel): string {
  switch (level) {
    case MoldRiskLevel.LOW:
      return 'Nessuna azione immediata richiesta. Le condizioni sono ottimali.'
    case MoldRiskLevel.MEDIUM:
      return 'Monitorare le condizioni e considerare misure preventive. Verificare le fonti di umidità.'
    case MoldRiskLevel.HIGH:
      return 'Rischio significativo di proliferazione di muffa. Si raccomanda intervento immediato.'
  }
}

// =============================================================================
// Humidity Gauge Component
// =============================================================================

function HumidityGauge({ value }: { value: number }) {
  const colors = getHumidityColor(value)
  const percentage = Math.min(Math.max(value, 0), 100)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--text-secondary)]">Livello Umidità</span>
        <Badge variant="outline" className={cn('font-medium', colors.text, colors.bg)}>
          {colors.label}
        </Badge>
      </div>
      <div className="relative h-4 bg-[var(--surface-secondary)] rounded-full overflow-hidden">
        <motion.div
          className={cn('absolute inset-y-0 left-0 rounded-full', colors.bar)}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
        {/* Markers */}
        <div className="absolute inset-0 flex">
          <div className="w-1/2 border-r border-[var(--border-default)]/50" />
          <div className="w-[20%] border-r border-[var(--border-default)]/50" />
        </div>
      </div>
      <div className="flex justify-between text-xs text-[var(--text-tertiary)]">
        <span>0%</span>
        <span className="text-[var(--status-success)]">50%</span>
        <span className="text-[var(--status-warning)]">70%</span>
        <span>100%</span>
      </div>
    </div>
  )
}

// =============================================================================
// Moisture Input Component
// =============================================================================

interface MoistureInputProps {
  label: string
  value: number
  onChange: (value: number) => void
  icon?: React.ReactNode
}

function MoistureInput({ label, value, onChange, icon }: MoistureInputProps) {
  const getColorClass = (val: number) => {
    if (val < 30) return 'border-[var(--status-success)]/30 focus:border-[var(--status-success)]/40 focus:ring-[var(--status-success)]/20'
    if (val < 60) return 'border-[var(--status-warning)]/30 focus:border-[var(--status-warning)]/40 focus:ring-[var(--status-warning)]/20'
    return 'border-[var(--status-error)]/30 focus:border-[var(--status-error)]/40 focus:ring-[var(--status-error)]/20'
  }

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
        {icon}
        {label}
      </label>
      <div className="relative">
        <Input
          type="number"
          min={0}
          max={100}
          value={value || ''}
          onChange={(e) => onChange(parseInt(e.target.value) || 0)}
          className={cn(
            'h-10 pr-8 text-right font-medium transition-all',
            getColorClass(value)
          )}
          placeholder="0"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-tertiary)]">%</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden bg-[var(--surface-secondary)]">
        <div
          className={cn(
            'h-full transition-all duration-300',
            value < 30 ? 'bg-[var(--status-success)]' : value < 60 ? 'bg-[var(--status-warning)]' : 'bg-[var(--status-error)]'
          )}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export function SensorySection({ form, onCalculateRisk }: SensorySectionProps) {
  const { watch, setValue, control } = form

  // Watch all form values for risk calculation
  const formValues = watch()

  // Calculate mold risk
  const moldRisk = useMemo(() => {
    const data = {
      moisture: {
        interiorHumidity: formValues.humidity,
        carpetMoisture: [{ location: 'carpet', percentage: formValues.carpetMoisture }],
        doorPanelMoisture: [
          { location: 'fl', percentage: formValues.doorMoisture.fl },
          { location: 'fr', percentage: formValues.doorMoisture.fr },
          { location: 'rl', percentage: formValues.doorMoisture.rl },
          { location: 'rr', percentage: formValues.doorMoisture.rr },
        ],
      },
      odors: {
        smokeDetected: formValues.smokeDetected,
        smokeIntensity: formValues.smokeIntensity > 5 ? SmokeIntensity.STRONG : formValues.smokeIntensity > 0 ? SmokeIntensity.LIGHT : SmokeIntensity.NONE,
        petSmellDetected: formValues.petSmellDetected,
        moldDetected: formValues.moldDetected,
        mustyDetected: formValues.mustySmell,
      },
    }

    const risk = calculateMoldRisk(data)
    if (onCalculateRisk) {
      onCalculateRisk(formValues)
    }
    return risk
  }, [formValues, onCalculateRisk])

  const humidityColors = getHumidityColor(formValues.humidity)
  const riskColors = getMoldRiskColor(moldRisk)
  const isHighRisk = moldRisk === MoldRiskLevel.HIGH

  // Toggle mold location
  const toggleMoldLocation = (location: MoldLocation) => {
    const current = formValues.moldLocations || []
    const updated = current.includes(location)
      ? current.filter((l) => l !== location)
      : [...current, location]
    setValue('moldLocations', updated, { shouldDirty: true })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-[var(--border-default)]">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--status-info)] to-[var(--status-info)] flex items-center justify-center">
          <Droplets className="h-5 w-5 text-[var(--text-on-brand)]" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Ispezione Sensoriale</h2>
          <p className="text-sm text-[var(--text-tertiary)]">Rilevamento umidità e odori</p>
        </div>
      </div>

      {/* Humidity Measurement */}
      <Card className="border-[var(--border-default)]/60 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Thermometer className="h-4 w-4 text-[var(--status-info)]" />
            <CardTitle className="text-base font-semibold">Misurazione Umidità</CardTitle>
          </div>
          <CardDescription>Inserisci il livello di umidità interna rilevato</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormField
            control={control}
            name="humidity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Umidità Interna (%)</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      className={cn(
                        'h-12 text-lg font-semibold text-center max-w-[120px]',
                        humidityColors.bg,
                        humidityColors.text
                      )}
                    />
                    <Slider
                      value={[field.value]}
                      onValueChange={([val]) => field.onChange(val)}
                      max={100}
                      step={1}
                      className="flex-1"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <HumidityGauge value={formValues.humidity} />
        </CardContent>
      </Card>

      {/* Moisture Detection */}
      <Card className="border-[var(--border-default)]/60 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Waves className="h-4 w-4 text-[var(--status-info)]" />
            <CardTitle className="text-base font-semibold">Rilevamento Umidità</CardTitle>
          </div>
          <CardDescription>Livelli di umidità rilevati nei vari punti del veicolo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Carpet Moisture */}
            <MoistureInput
              label="Tappeti"
              icon={<Car className="h-4 w-4 text-[var(--text-tertiary)]" />}
              value={formValues.carpetMoisture}
              onChange={(val) => setValue('carpetMoisture', val, { shouldDirty: true })}
            />

            {/* Door Moisture - 4 doors */}
            <MoistureInput
              label="Porta Anteriore SX"
              icon={<Car className="h-4 w-4 text-[var(--text-tertiary)]" />}
              value={formValues.doorMoisture.fl}
              onChange={(val) =>
                setValue('doorMoisture', { ...formValues.doorMoisture, fl: val }, { shouldDirty: true })
              }
            />
            <MoistureInput
              label="Porta Anteriore DX"
              icon={<Car className="h-4 w-4 text-[var(--text-tertiary)]" />}
              value={formValues.doorMoisture.fr}
              onChange={(val) =>
                setValue('doorMoisture', { ...formValues.doorMoisture, fr: val }, { shouldDirty: true })
              }
            />
            <MoistureInput
              label="Porta Posteriore SX"
              icon={<Car className="h-4 w-4 text-[var(--text-tertiary)]" />}
              value={formValues.doorMoisture.rl}
              onChange={(val) =>
                setValue('doorMoisture', { ...formValues.doorMoisture, rl: val }, { shouldDirty: true })
              }
            />
            <MoistureInput
              label="Porta Posteriore DX"
              icon={<Car className="h-4 w-4 text-[var(--text-tertiary)]" />}
              value={formValues.doorMoisture.rr}
              onChange={(val) =>
                setValue('doorMoisture', { ...formValues.doorMoisture, rr: val }, { shouldDirty: true })
              }
            />

            {/* Trunk Moisture */}
            <MoistureInput
              label="Bagagliaio"
              icon={<Car className="h-4 w-4 text-[var(--text-tertiary)]" />}
              value={formValues.trunkMoisture}
              onChange={(val) => setValue('trunkMoisture', val, { shouldDirty: true })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Odor Detection */}
      <Card className="border-[var(--border-default)]/60 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Flower2 className="h-4 w-4 text-[var(--brand)]" />
            <CardTitle className="text-base font-semibold">Rilevamento Odori</CardTitle>
          </div>
          <CardDescription>Verifica la presenza di odori anomali all&apos;interno del veicolo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Smoke Detection */}
          <FormField
            control={control}
            name="smokeDetected"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4 hover:bg-[var(--surface-secondary)]/50 transition-colors">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="space-y-1 leading-none flex-1">
                  <FormLabel className="flex items-center gap-2 cursor-pointer">
                    <Cigarette className="h-4 w-4 text-[var(--text-tertiary)]" />
                    Odore di fumo rilevato
                  </FormLabel>
                  <FormDescription>Presenza di odore di tabacco nell&apos;abitacolo</FormDescription>
                </div>
              </FormItem>
            )}
          />

          <AnimatePresence>
            {formValues.smokeDetected && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <FormField
                  control={control}
                  name="smokeIntensity"
                  render={({ field }) => (
                    <FormItem className="pl-7 border-l-2 border-[var(--border-default)] ml-4">
                      <FormLabel>Intensità odore fumo (1-10)</FormLabel>
                      <FormControl>
                        <div className="space-y-3">
                          <Slider
                            value={[field.value]}
                            onValueChange={([val]) => field.onChange(val)}
                            min={1}
                            max={10}
                            step={1}
                          />
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-[var(--text-tertiary)]">Leggero</span>
                            <Badge
                              variant="outline"
                              className={cn(
                                'font-semibold',
                                field.value <= 3
                                  ? 'bg-[var(--status-success-subtle)] text-[var(--status-success)] border-[var(--status-success)]/30'
                                  : field.value <= 7
                                    ? 'bg-[var(--status-warning)]/10 text-[var(--status-warning)] border-[var(--status-warning)]/30'
                                    : 'bg-[var(--status-error-subtle)] text-[var(--status-error)] border-[var(--status-error)]/30'
                              )}
                            >
                              {field.value}/10
                            </Badge>
                            <span className="text-xs text-[var(--text-tertiary)]">Intenso</span>
                          </div>
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <Separator className="my-4" />

          {/* Pet Smell */}
          <FormField
            control={control}
            name="petSmellDetected"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4 hover:bg-[var(--surface-secondary)]/50 transition-colors">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="space-y-1 leading-none flex-1">
                  <FormLabel className="flex items-center gap-2 cursor-pointer">
                    <Dog className="h-4 w-4 text-[var(--text-tertiary)]" />
                    Odore di animali rilevato
                  </FormLabel>
                  <FormDescription>Presenza di odore di animali domestici</FormDescription>
                </div>
              </FormItem>
            )}
          />

          <AnimatePresence>
            {formValues.petSmellDetected && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <FormField
                  control={control}
                  name="petType"
                  render={({ field }) => (
                    <FormItem className="pl-7 border-l-2 border-[var(--border-default)] ml-4">
                      <FormLabel>Tipo di animale (opzionale)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="es. Cane, Gatto..."
                          className="max-w-xs"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <Separator className="my-4" />

          {/* Mold Detection */}
          <FormField
            control={control}
            name="moldDetected"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4 hover:bg-[var(--surface-secondary)]/50 transition-colors">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="space-y-1 leading-none flex-1">
                  <FormLabel className="flex items-center gap-2 cursor-pointer text-[var(--status-error)]">
                    <AlertTriangle className="h-4 w-4" />
                    Odore di muffa rilevato
                  </FormLabel>
                  <FormDescription className="text-[var(--status-error)]/70">
                    Indica potenziale proliferazione di muffa - richiede attenzione
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          <AnimatePresence>
            {formValues.moldDetected && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pl-7 border-l-2 border-[var(--border-default)] ml-4 space-y-3">
                  <FormLabel>Posizioni dove è stata rilevata la muffa</FormLabel>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {MOLD_LOCATIONS.map((location) => {
                      const isSelected = formValues.moldLocations?.includes(location.value)
                      return (
                        <button
                          key={location.value}
                          type="button"
                          onClick={() => toggleMoldLocation(location.value)}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all',
                            isSelected
                              ? 'bg-[var(--status-error-subtle)] border-[var(--status-error)]/30 text-[var(--status-error)]'
                              : 'bg-[var(--surface-secondary)] border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]'
                          )}
                        >
                          {location.icon}
                          <span className="truncate">{location.label}</span>
                          {isSelected && <CheckCircle2 className="h-3.5 w-3.5 ml-auto" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <Separator className="my-4" />

          {/* Musty Smell */}
          <FormField
            control={control}
            name="mustySmell"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4 hover:bg-[var(--surface-secondary)]/50 transition-colors">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="space-y-1 leading-none flex-1">
                  <FormLabel className="flex items-center gap-2 cursor-pointer">
                    <Droplets className="h-4 w-4 text-[var(--text-tertiary)]" />
                    Odore di chiuso/muffa leggera
                  </FormLabel>
                  <FormDescription>
                    Odore caratteristico di ambiente poco arieggiato o umido
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          {/* Gasoline Smell */}
          <FormField
            control={control}
            name="gasolineSmell"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-[var(--text-tertiary)]" />
                  Odore di benzina
                </FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Seleziona intensità" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="normal">
                      <span className="text-[var(--status-success)]">Normale (assente o lieve)</span>
                    </SelectItem>
                    <SelectItem value="strong">
                      <span className="text-[var(--status-error)]">Forte (anomalia rilevata)</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Un odore forte di benzina può indicare perdite nel sistema di alimentazione
                </FormDescription>
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* AC System Check */}
      <Card className="border-[var(--border-default)]/60 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Wind className="h-4 w-4 text-sky-500" />
            <CardTitle className="text-base font-semibold">Controllo Sistema AC</CardTitle>
          </div>
          <CardDescription>Verifica del funzionamento del climatizzatore</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* AC Drain Test */}
          <FormField
            control={control}
            name="acDrainFlowing"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4 hover:bg-[var(--surface-secondary)]/50 transition-colors">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="space-y-1 leading-none flex-1">
                  <FormLabel className="cursor-pointer">Test scarico AC (funzionante)</FormLabel>
                  <FormDescription>
                    L&apos;acqua fuoriesce correttamente dal tubo di scarico del condizionatore
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          {/* Blockage Detection */}
          <FormField
            control={control}
            name="acBlockage"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-[var(--text-tertiary)]" />
                  Livello di ostruzione
                </FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Seleziona livello" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {BLOCKAGE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className={opt.color}>{opt.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          {/* Filter Condition */}
          <FormField
            control={control}
            name="filterCondition"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-[var(--text-tertiary)]" />
                  Stato filtro abitacolo
                </FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Seleziona condizione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {FILTER_CONDITION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className={cn('px-2 py-0.5 rounded text-xs font-medium', opt.color)}>
                          {opt.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          {/* AC Smell */}
          <FormField
            control={control}
            name="acSmell"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Flower2 className="h-4 w-4 text-[var(--text-tertiary)]" />
                  Odore aria condizionata
                </FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Seleziona odore" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="fresh">
                      <span className="text-[var(--status-success)] flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Fresca/Pulita
                      </span>
                    </SelectItem>
                    <SelectItem value="musty">
                      <span className="text-[var(--status-warning)] flex items-center gap-2">
                        <Info className="h-3.5 w-3.5" />
                        Di chiuso
                      </span>
                    </SelectItem>
                    <SelectItem value="mold">
                      <span className="text-[var(--status-error)] flex items-center gap-2">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Di muffa
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* Mold Risk Display */}
      <Card
        className={cn(
          'border-2 shadow-lg transition-all duration-500',
          riskColors.border,
          riskColors.bg
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {riskColors.icon}
              <CardTitle className={cn('text-lg font-bold', riskColors.text)}>
                Rischio Muffa: {getRiskLevelLabel(moldRisk)}
              </CardTitle>
            </div>
            <Badge
              variant="outline"
              className={cn(
                'text-sm font-bold px-3 py-1',
                moldRisk === MoldRiskLevel.LOW && 'bg-[var(--status-success-subtle)] text-[var(--status-success)] border-[var(--status-success)]/30',
                moldRisk === MoldRiskLevel.MEDIUM &&
                  'bg-[var(--status-warning)]/20 text-[var(--status-warning)] border-[var(--status-warning)]/30',
                moldRisk === MoldRiskLevel.HIGH && 'bg-[var(--status-error-subtle)] text-[var(--status-error)] border-[var(--status-error)]/30'
              )}
            >
              {moldRisk}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className={cn('text-sm', riskColors.text)}>{getRiskDescriptionItalian(moldRisk)}</p>

          {/* Immediate Action Warning */}
          <AnimatePresence>
            {isHighRisk && (
              <motion.div
                initial={{ height: 0, opacity: 0, y: -10 }}
                animate={{ height: 'auto', opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: -10 }}
              >
                <Alert variant="destructive" className="border-[var(--status-error)]/30 bg-[var(--status-error-subtle)]/50">
                  <ShieldAlert className="h-5 w-5" />
                  <AlertTitle className="font-semibold">Attenzione Richiesta</AlertTitle>
                  <AlertDescription className="text-sm">
                    Rilevate condizioni favorevoli alla proliferazione di muffa. Si consiglia:
                    <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                      <li>Ispezione approfondita delle aree interessate</li>
                      <li>Pulizia e sanificazione dell&apos;impianto AC</li>
                      <li>Verifica di eventuali perdite o infiltrazioni</li>
                      <li>Considerare la sostituzione del filtro abitacolo</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Risk Factors Summary */}
          <div className="pt-2">
            <p className="text-xs font-medium text-[var(--text-tertiary)] mb-2">Fattori di rischio rilevati:</p>
            <div className="flex flex-wrap gap-2">
              {formValues.humidity > 50 && (
                <Badge variant="secondary" className="text-xs">
                  Umidità {formValues.humidity}%
                </Badge>
              )}
              {formValues.moldDetected && (
                <Badge variant="secondary" className="text-xs bg-[var(--status-error-subtle)] text-[var(--status-error)]">
                  Odore muffa
                </Badge>
              )}
              {formValues.mustySmell && (
                <Badge variant="secondary" className="text-xs bg-[var(--status-warning-subtle)] text-[var(--status-warning)]">
                  Odore chiuso
                </Badge>
              )}
              {formValues.acSmell === 'mold' && (
                <Badge variant="secondary" className="text-xs bg-[var(--status-error-subtle)] text-[var(--status-error)]">
                  AC: odore muffa
                </Badge>
              )}
              {formValues.acBlockage !== BlockageSeverity.NONE && (
                <Badge variant="secondary" className="text-xs bg-[var(--status-warning)]/10 text-[var(--status-warning)]">
                  AC: ostruzione {formValues.acBlockage.toLowerCase()}
                </Badge>
              )}
              {formValues.humidity <= 50 && !formValues.moldDetected && !formValues.mustySmell && (
                <Badge variant="secondary" className="text-xs bg-[var(--status-success-subtle)] text-[var(--status-success)]">
                  Nessun fattore critico
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// =============================================================================
// Default Values Helper
// =============================================================================

export function getDefaultSensoryFormData(): SensoryFormData {
  return {
    humidity: 45,
    carpetMoisture: 0,
    doorMoisture: {
      fl: 0,
      fr: 0,
      rl: 0,
      rr: 0,
    },
    trunkMoisture: 0,
    smokeDetected: false,
    smokeIntensity: 1,
    petSmellDetected: false,
    petType: '',
    moldDetected: false,
    moldLocations: [],
    mustySmell: false,
    gasolineSmell: 'normal',
    acDrainFlowing: true,
    acBlockage: BlockageSeverity.NONE,
    filterCondition: FilterCondition.GOOD,
    acSmell: 'fresh',
  }
}

export default SensorySection
