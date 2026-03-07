import { z } from 'zod'

// Servizi offerti
export const serviceOptions = [
  { value: 'tagliando', label: 'Tagliando', icon: 'Wrench' },
  { value: 'gomme', label: 'Gomme', icon: 'Circle' },
  { value: 'elettrica', label: 'Elettrica', icon: 'Zap' },
  { value: 'freni', label: 'Freni', icon: 'Disc' },
  { value: 'climatizzazione', label: 'Climatizzazione', icon: 'Wind' },
  { value: 'diagnostica', label: 'Diagnostica', icon: 'Activity' },
  { value: 'carrozzeria', label: 'Carrozzeria', icon: 'Paintbrush' },
  { value: 'revisione', label: 'Revisione', icon: 'ClipboardCheck' },
] as const

// Province italiane (principali)
export const provinceOptions = [
  { value: 'AG', label: 'Agrigento' },
  { value: 'AL', label: 'Alessandria' },
  { value: 'AN', label: 'Ancona' },
  { value: 'AO', label: 'Aosta' },
  { value: 'AR', label: 'Arezzo' },
  { value: 'AP', label: 'Ascoli Piceno' },
  { value: 'AT', label: 'Asti' },
  { value: 'AV', label: 'Avellino' },
  { value: 'BA', label: 'Bari' },
  { value: 'BT', label: 'Barletta-Andria-Trani' },
  { value: 'BL', label: 'Belluno' },
  { value: 'BN', label: 'Benevento' },
  { value: 'BG', label: 'Bergamo' },
  { value: 'BI', label: 'Biella' },
  { value: 'BO', label: 'Bologna' },
  { value: 'BZ', label: 'Bolzano' },
  { value: 'BS', label: 'Brescia' },
  { value: 'BR', label: 'Brindisi' },
  { value: 'CA', label: 'Cagliari' },
  { value: 'CL', label: 'Caltanissetta' },
  { value: 'CB', label: 'Campobasso' },
  { value: 'CI', label: 'Carbonia-Iglesias' },
  { value: 'CE', label: 'Caserta' },
  { value: 'CT', label: 'Catania' },
  { value: 'CZ', label: 'Catanzaro' },
  { value: 'CH', label: 'Chieti' },
  { value: 'CO', label: 'Como' },
  { value: 'CS', label: 'Cosenza' },
  { value: 'CR', label: 'Cremona' },
  { value: 'KR', label: 'Crotone' },
  { value: 'CN', label: 'Cuneo' },
  { value: 'EN', label: 'Enna' },
  { value: 'FM', label: 'Fermo' },
  { value: 'FE', label: 'Ferrara' },
  { value: 'FI', label: 'Firenze' },
  { value: 'FG', label: 'Foggia' },
  { value: 'FC', label: 'Forlì-Cesena' },
  { value: 'FR', label: 'Frosinone' },
  { value: 'GE', label: 'Genova' },
  { value: 'GO', label: 'Gorizia' },
  { value: 'GR', label: 'Grosseto' },
  { value: 'IM', label: 'Imperia' },
  { value: 'IS', label: 'Isernia' },
  { value: 'SP', label: 'La Spezia' },
  { value: 'AQ', label: "L'Aquila" },
  { value: 'LT', label: 'Latina' },
  { value: 'LE', label: 'Lecce' },
  { value: 'LC', label: 'Lecco' },
  { value: 'LI', label: 'Livorno' },
  { value: 'LO', label: 'Lodi' },
  { value: 'LU', label: 'Lucca' },
  { value: 'MC', label: 'Macerata' },
  { value: 'MN', label: 'Mantova' },
  { value: 'MS', label: 'Massa-Carrara' },
  { value: 'MT', label: 'Matera' },
  { value: 'ME', label: 'Messina' },
  { value: 'MI', label: 'Milano' },
  { value: 'MO', label: 'Modena' },
  { value: 'MB', label: 'Monza e Brianza' },
  { value: 'NA', label: 'Napoli' },
  { value: 'NO', label: 'Novara' },
  { value: 'NU', label: 'Nuoro' },
  { value: 'OT', label: 'Olbia-Tempio' },
  { value: 'OR', label: 'Oristano' },
  { value: 'PD', label: 'Padova' },
  { value: 'PA', label: 'Palermo' },
  { value: 'PR', label: 'Parma' },
  { value: 'PV', label: 'Pavia' },
  { value: 'PG', label: 'Perugia' },
  { value: 'PU', label: 'Pesaro e Urbino' },
  { value: 'PE', label: 'Pescara' },
  { value: 'PC', label: 'Piacenza' },
  { value: 'PI', label: 'Pisa' },
  { value: 'PT', label: 'Pistoia' },
  { value: 'PN', label: 'Pordenone' },
  { value: 'PZ', label: 'Potenza' },
  { value: 'PO', label: 'Prato' },
  { value: 'RG', label: 'Ragusa' },
  { value: 'RA', label: 'Ravenna' },
  { value: 'RC', label: 'Reggio Calabria' },
  { value: 'RE', label: 'Reggio Emilia' },
  { value: 'RI', label: 'Rieti' },
  { value: 'RN', label: 'Rimini' },
  { value: 'RM', label: 'Roma' },
  { value: 'RO', label: 'Rovigo' },
  { value: 'SA', label: 'Salerno' },
  { value: 'VS', label: 'Medio Campidano' },
  { value: 'SS', label: 'Sassari' },
  { value: 'SV', label: 'Savona' },
  { value: 'SI', label: 'Siena' },
  { value: 'SR', label: 'Siracusa' },
  { value: 'SO', label: 'Sondrio' },
  { value: 'TA', label: 'Taranto' },
  { value: 'TE', label: 'Teramo' },
  { value: 'TR', label: 'Terni' },
  { value: 'TO', label: 'Torino' },
  { value: 'OG', label: 'Ogliastra' },
  { value: 'TP', label: 'Trapani' },
  { value: 'TN', label: 'Trento' },
  { value: 'TV', label: 'Treviso' },
  { value: 'TS', label: 'Trieste' },
  { value: 'UD', label: 'Udine' },
  { value: 'VA', label: 'Varese' },
  { value: 'VE', label: 'Venezia' },
  { value: 'VB', label: 'Verbano-Cusio-Ossola' },
  { value: 'VC', label: 'Vercelli' },
  { value: 'VR', label: 'Verona' },
  { value: 'VV', label: 'Vibo Valentia' },
  { value: 'VI', label: 'Vicenza' },
  { value: 'VT', label: 'Viterbo' },
] as const

// Schema orario giornaliero
const dayScheduleSchema = z.object({
  isOpen: z.boolean().default(true),
  openTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato orario non valido'),
  closeTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato orario non valido'),
})

// Schema orari completi
const businessHoursSchema = z.object({
  monday: dayScheduleSchema,
  tuesday: dayScheduleSchema,
  wednesday: dayScheduleSchema,
  thursday: dayScheduleSchema,
  friday: dayScheduleSchema,
  saturday: dayScheduleSchema,
  sunday: z.object({
    isOpen: z.boolean().default(false),
    openTime: z.string().default('09:00'),
    closeTime: z.string().default('13:00'),
  }),
})

// Schema principale location
export const locationFormSchema = z.object({
  name: z.string().min(1, 'Il nome è obbligatorio').max(100, 'Nome troppo lungo'),
  address: z.string().min(1, "L'indirizzo è obbligatorio").max(200),
  city: z.string().min(1, 'La città è obbligatoria').max(100),
  zipCode: z.string().regex(/^\d{5}$/, 'Il CAP deve essere di 5 cifre'),
  province: z.string().min(1, 'Seleziona una provincia'),
  phone: z.string().regex(/^\+?[\d\s-]{8,}$/, 'Numero di telefono non valido'),
  email: z.string().email('Email non valida').optional().or(z.literal('')),
  manager: z.string().max(100).optional(),
  businessHours: businessHoursSchema,
  services: z.array(z.string()).min(1, 'Seleziona almeno un servizio'),
  capacity: z.number().int().min(0, 'La capacità non può essere negativa').default(0),
  boxes: z.number().int().min(0, 'Il numero di box non può essere negativo').default(0),
  notes: z.string().max(2000).optional(),
})

export type DaySchedule = z.infer<typeof dayScheduleSchema>
export type BusinessHours = z.infer<typeof businessHoursSchema>
export type LocationFormData = z.infer<typeof locationFormSchema>

// Valori di default per gli orari
export const defaultBusinessHours: BusinessHours = {
  monday: { isOpen: true, openTime: '08:30', closeTime: '18:00' },
  tuesday: { isOpen: true, openTime: '08:30', closeTime: '18:00' },
  wednesday: { isOpen: true, openTime: '08:30', closeTime: '18:00' },
  thursday: { isOpen: true, openTime: '08:30', closeTime: '18:00' },
  friday: { isOpen: true, openTime: '08:30', closeTime: '18:00' },
  saturday: { isOpen: true, openTime: '08:30', closeTime: '12:30' },
  sunday: { isOpen: false, openTime: '09:00', closeTime: '13:00' },
}

// Giorni della settimana per la UI
export const weekDays = [
  { key: 'monday', label: 'Lunedì', shortLabel: 'Lun' },
  { key: 'tuesday', label: 'Martedì', shortLabel: 'Mar' },
  { key: 'wednesday', label: 'Mercoledì', shortLabel: 'Mer' },
  { key: 'thursday', label: 'Giovedì', shortLabel: 'Gio' },
  { key: 'friday', label: 'Venerdì', shortLabel: 'Ven' },
  { key: 'saturday', label: 'Sabato', shortLabel: 'Sab' },
  { key: 'sunday', label: 'Domenica', shortLabel: 'Dom' },
] as const

// Funzione per formattare gli orari
export function formatBusinessHours(hours: BusinessHours): string {
  const days = weekDays.map((day) => {
    const schedule = hours[day.key as keyof BusinessHours] as DaySchedule
    if (!schedule.isOpen) return `${day.shortLabel}: chiuso`
    return `${day.shortLabel}: ${schedule.openTime}-${schedule.closeTime}`
  })
  return days.join(' | ')
}
