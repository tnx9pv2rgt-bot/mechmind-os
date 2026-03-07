/**
 * Digital Vehicle Inspection (DVI) Form Schema
 * Apple Design 2026 - Validazione completa checklist
 */

import { z } from 'zod'

// Stati degli item di ispezione
export const InspectionItemStatus = z.enum(['ok', 'check', 'replace'])

// Tipi di ispezione
export const InspectionType = z.enum([
  'pre_sale',
  'post_intervention',
  'periodic',
  'accident'
])

// Schema per una singola foto
export const InspectionPhotoSchema = z.object({
  id: z.string(),
  url: z.string(),
  file: z.instanceof(File).optional(),
  description: z.string().max(200, 'Descrizione troppo lunga').optional(),
})

// Schema per un singolo item della checklist
export const ChecklistItemSchema = z.object({
  name: z.string(),
  status: InspectionItemStatus,
  notes: z.string().max(500, 'Note troppo lunghe').optional(),
  photos: z.array(InspectionPhotoSchema).max(5, 'Massimo 5 foto per voce'),
})

// Schema per una categoria della checklist
export const ChecklistCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  items: z.array(ChecklistItemSchema),
})

// Schema completo del form ispezione
export const InspectionFormSchema = z.object({
  // Informazioni generali
  vehicleId: z.string().min(1, 'Seleziona un veicolo'),
  customerId: z.string().min(1, 'Seleziona un cliente'),
  inspectionType: InspectionType,
  inspectionDate: z.date({
    required_error: 'Seleziona una data',
    invalid_type_error: 'Data non valida',
  }),
  mechanicId: z.string().min(1, 'Seleziona un meccanico'),
  
  // Checklist completa
  checklist: z.object({
    // Luci
    lights: z.object({
      frontHeadlights: ChecklistItemSchema,
      rearLights: ChecklistItemSchema,
      turnSignals: ChecklistItemSchema,
      brakeLights: ChecklistItemSchema,
      fogLights: ChecklistItemSchema,
      licensePlateLight: ChecklistItemSchema,
    }),
    // Pneumatici
    tires: z.object({
      frontTread: ChecklistItemSchema,
      rearTread: ChecklistItemSchema,
      frontPressure: ChecklistItemSchema,
      rearPressure: ChecklistItemSchema,
      spareTire: ChecklistItemSchema,
    }),
    // Freni
    brakes: z.object({
      frontDiscs: ChecklistItemSchema,
      rearDiscs: ChecklistItemSchema,
      frontPads: ChecklistItemSchema,
      rearPads: ChecklistItemSchema,
      brakeFluid: ChecklistItemSchema,
      parkingBrake: ChecklistItemSchema,
    }),
    // Olio
    oil: z.object({
      engineOilLevel: ChecklistItemSchema,
      engineOilColor: ChecklistItemSchema,
      transmissionOil: ChecklistItemSchema,
      differentialOil: ChecklistItemSchema,
    }),
    // Liquidi
    fluids: z.object({
      coolant: ChecklistItemSchema,
      windshieldWasher: ChecklistItemSchema,
      powerSteering: ChecklistItemSchema,
      brakeFluidLevel: ChecklistItemSchema,
    }),
    // Cinghie
    belts: z.object({
      timingBelt: ChecklistItemSchema,
      serpentineBelt: ChecklistItemSchema,
      beltTension: ChecklistItemSchema,
      beltCondition: ChecklistItemSchema,
    }),
    // Batteria
    battery: z.object({
      chargeStatus: ChecklistItemSchema,
      terminals: ChecklistItemSchema,
      batteryAge: ChecklistItemSchema,
      voltage: ChecklistItemSchema,
    }),
    // Sospensioni
    suspension: z.object({
      frontShockAbsorbers: ChecklistItemSchema,
      rearShockAbsorbers: ChecklistItemSchema,
      springs: ChecklistItemSchema,
      controlArms: ChecklistItemSchema,
      tieRods: ChecklistItemSchema,
    }),
  }),
  
  // Note finali
  generalNotes: z.string().max(2000, 'Note troppo lunghe').optional(),
  recommendations: z.string().max(2000, 'Raccomandazioni troppo lunghe').optional(),
  estimatedCost: z.number().min(0, 'Il costo non può essere negativo').optional(),
})

// Tipo derivato dallo schema
export type InspectionFormData = z.infer<typeof InspectionFormSchema>
export type InspectionItemStatusType = z.infer<typeof InspectionItemStatus>
export type InspectionTypeType = z.infer<typeof InspectionType>

// Valori predefiniti per un item
export const createDefaultChecklistItem = (name: string): z.infer<typeof ChecklistItemSchema> => ({
  name,
  status: 'ok',
  notes: '',
  photos: [],
})

// Valori predefiniti per il form
export const defaultInspectionFormValues: Partial<InspectionFormData> = {
  inspectionDate: new Date(),
  checklist: {
    lights: {
      frontHeadlights: createDefaultChecklistItem('Fari anteriori'),
      rearLights: createDefaultChecklistItem('Luci posteriori'),
      turnSignals: createDefaultChecklistItem('Frecce'),
      brakeLights: createDefaultChecklistItem('Luci stop'),
      fogLights: createDefaultChecklistItem('Fendinebbia'),
      licensePlateLight: createDefaultChecklistItem('Luce targa'),
    },
    tires: {
      frontTread: createDefaultChecklistItem('Battistrada anteriori'),
      rearTread: createDefaultChecklistItem('Battistrada posteriori'),
      frontPressure: createDefaultChecklistItem('Pressione anteriori'),
      rearPressure: createDefaultChecklistItem('Pressione posteriori'),
      spareTire: createDefaultChecklistItem('Ruota di scorta'),
    },
    brakes: {
      frontDiscs: createDefaultChecklistItem('Dischi anteriori'),
      rearDiscs: createDefaultChecklistItem('Dischi posteriori'),
      frontPads: createDefaultChecklistItem('Pastiglie anteriori'),
      rearPads: createDefaultChecklistItem('Pastiglie posteriori'),
      brakeFluid: createDefaultChecklistItem('Liquido freni'),
      parkingBrake: createDefaultChecklistItem('Freno a mano'),
    },
    oil: {
      engineOilLevel: createDefaultChecklistItem('Livello olio motore'),
      engineOilColor: createDefaultChecklistItem('Colore olio motore'),
      transmissionOil: createDefaultChecklistItem('Olio cambio'),
      differentialOil: createDefaultChecklistItem('Olio differenziale'),
    },
    fluids: {
      coolant: createDefaultChecklistItem('Liquido raffreddamento'),
      windshieldWasher: createDefaultChecklistItem('Liquido tergicristallo'),
      powerSteering: createDefaultChecklistItem('Liquido servosterzo'),
      brakeFluidLevel: createDefaultChecklistItem('Livello liquido freni'),
    },
    belts: {
      timingBelt: createDefaultChecklistItem('Cinghia distribuzione'),
      serpentineBelt: createDefaultChecklistItem('Cinghia servizi'),
      beltTension: createDefaultChecklistItem('Tensione cinghie'),
      beltCondition: createDefaultChecklistItem('Condizione cinghie'),
    },
    battery: {
      chargeStatus: createDefaultChecklistItem('Stato carica'),
      terminals: createDefaultChecklistItem('Terminali'),
      batteryAge: createDefaultChecklistItem('Età batteria'),
      voltage: createDefaultChecklistItem('Voltaggio'),
    },
    suspension: {
      frontShockAbsorbers: createDefaultChecklistItem('Ammortizzatori anteriori'),
      rearShockAbsorbers: createDefaultChecklistItem('Ammortizzatori posteriori'),
      springs: createDefaultChecklistItem('Molle'),
      controlArms: createDefaultChecklistItem('Bracci oscillanti'),
      tieRods: createDefaultChecklistItem('Tiranti'),
    },
  },
  generalNotes: '',
  recommendations: '',
}

// Labels per i tipi di ispezione
export const INSPECTION_TYPE_LABELS: Record<InspectionTypeType, string> = {
  pre_sale: 'Pre-vendita',
  post_intervention: 'Post-intervento',
  periodic: 'Periodica',
  accident: 'Sinistro',
}

// Labels per gli stati degli item
export const ITEM_STATUS_LABELS: Record<InspectionItemStatusType, { label: string; color: string; bgColor: string }> = {
  ok: { label: 'OK', color: 'text-apple-green', bgColor: 'bg-apple-green/10' },
  check: { label: 'Da Controllare', color: 'text-apple-orange', bgColor: 'bg-apple-orange/10' },
  replace: { label: 'Da Sostituire', color: 'text-apple-red', bgColor: 'bg-apple-red/10' },
}

// Labels per le categorie
export const CATEGORY_LABELS = {
  lights: { name: 'Luci', icon: 'Lightbulb' },
  tires: { name: 'Pneumatici', icon: 'Circle' },
  brakes: { name: 'Freni', icon: 'AlertCircle' },
  oil: { name: 'Olio', icon: 'Droplet' },
  fluids: { name: 'Liquidi', icon: 'Beaker' },
  belts: { name: 'Cinghie', icon: 'Gauge' },
  battery: { name: 'Batteria', icon: 'Battery' },
  suspension: { name: 'Sospensioni', icon: 'Wrench' },
} as const
