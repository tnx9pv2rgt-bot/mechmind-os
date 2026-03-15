import { z } from 'zod';

/**
 * Validazione Targa Italiana
 * Formati accettati:
 * - Vecchio formato: AA000AA (2007-oggi)
 * - Formato precedente: AA000000, 000000AA, AA0000AA
 * - Targhe speciali: EE (Esercito), CC (Carabinieri), etc.
 */
function validateItalianPlate(plate: string): boolean {
  if (!plate) return false;
  const cleaned = plate.toUpperCase().replace(/\s/g, '');

  // Formato corrente: AB123CD
  const currentFormat = /^[A-Z]{2}[0-9]{3}[A-Z]{2}$/;
  // Formato precedente: AB123456, 123456AB, AB1234CD
  const oldFormat = /^([A-Z]{2}[0-9]{6}|[0-9]{6}[A-Z]{2}|[A-Z]{2}[0-9]{4}[A-Z]{2})$/;
  // Targhe speciali
  const specialFormat =
    /^(EE|CC|FF|ET|CD|CC|PS|MC|MO|NA|RC|MI|RM|FI|TO|GE|VE|BO|PD|UD|TS|PC|PR|RE|LI|PI|SA|BA|CT|PA|ME|CZ|KR|LE|BR|TA|FG|BT|CB|IS|AQ|CH|PE|TE|AN|AP|FM|PG|TR|VT|RI|LT|FR|VT|VT|SI|AR|PO|MS|LU|PT|PO|GR|SI|PI|LI|LU|PO|AR|SI|MS|PT|GR|GO|PN|TS|UD|PN|GO|TS|UD|BG|BS|CO|CR|LC|LO|MB|MI|MN|PV|SO|VA|VR|BL|PD|RO|TV|VE|VI|VT|BZ|TN|AL|AT|BI|CN|NO|TO|VB|VC|AO|IM|SP|SV|GE|PC|PR|RE|MO|BO|FE|RA|RN|AR|FI|GR|LI|LU|MS|PI|PO|PT|SI|PG|TR|VT|AN|AP|FM|MC|PU|CH|PE|AQ|TE|FR|LT|RI|VT|RM|BR|BT|FG|LE|TA|BA|CT|EN|ME|PA|RG|SR|TP|AG|CL|CT|EN|ME|PA|RG|SR|TP|CZ|CS|KR|RC|VV|BI|VC|NO|VB|AT|CN|AL|IM|SV|SP|AO|TN|BZ|BL|TV|VI|VR|PD|RO|UD|GO|PN|TS|MS|LU|PT|PO|AR|SI|FI|GR|LI|PI|TR|PG|VT|RI|LT|FR|RM|AQ|CH|PE|TE|AN|AP|FM|MC|PU|BA|BT|FG|LE|TA|CT|EN|ME|PA|RG|SR|TP|AG|CL|CS|CZ|KR|RC|VV|MT|PZ|PO|AV|BN|CE|NA|SA)[0-9]+$/;

  return currentFormat.test(cleaned) || oldFormat.test(cleaned) || specialFormat.test(cleaned);
}

/**
 * Validazione VIN (Vehicle Identification Number)
 * Standard ISO 3779: 17 caratteri alfanumerici
 * Esclude I, O, Q per evitare confusione con numeri
 */
function validateVIN(vin: string): boolean {
  if (!vin || vin.length !== 17) return false;
  const vinPattern = /^[A-HJ-NPR-Z0-9]{17}$/;
  return vinPattern.test(vin.toUpperCase());
}

export const vehicleMakes = [
  'Alfa Romeo',
  'Audi',
  'BMW',
  'Citroën',
  'Dacia',
  'Ferrari',
  'Fiat',
  'Ford',
  'Honda',
  'Hyundai',
  'Jaguar',
  'Jeep',
  'Kia',
  'Lamborghini',
  'Lancia',
  'Land Rover',
  'Lexus',
  'Maserati',
  'Mazda',
  'Mercedes-Benz',
  'Mini',
  'Mitsubishi',
  'Nissan',
  'Opel',
  'Peugeot',
  'Porsche',
  'Renault',
  'Seat',
  'Skoda',
  'Smart',
  'Subaru',
  'Suzuki',
  'Tesla',
  'Toyota',
  'Volkswagen',
  'Volvo',
  'Altro',
] as const;

export const vehicleColors = [
  'Bianco',
  'Nero',
  'Grigio',
  'Argento',
  'Rosso',
  'Blu',
  'Verde',
  'Giallo',
  'Arancione',
  'Marrone',
  'Beige',
  'Viola',
  'Rosa',
  'Oro',
  'Bronzo',
  'Altro',
] as const;

export const vehicleFormSchema = z.object({
  targa: z
    .string()
    .min(1, 'La targa è obbligatoria')
    .refine(val => validateItalianPlate(val), 'Inserisci una targa italiana valida (es. AB123CD)'),

  marca: z.string().min(1, 'La marca è obbligatoria'),

  modello: z
    .string()
    .min(1, 'Il modello è obbligatorio')
    .max(50, 'Il modello non può superare 50 caratteri'),

  anno: z
    .number()
    .min(1900, "L'anno deve essere successivo al 1900")
    .max(2030, "L'anno non può superare il 2030"),

  colore: z.string().min(1, 'Il colore è obbligatorio'),

  vin: z
    .string()
    .optional()
    .refine(
      val => !val || validateVIN(val),
      'Il VIN deve essere composto da 17 caratteri alfanumerici (esclude I, O, Q)'
    ),

  kmAttuali: z
    .number()
    .min(0, 'I km non possono essere negativi')
    .max(9999999, 'Valore km non valido'),

  dataUltimoTagliando: z
    .string()
    .optional()
    .refine(val => !val || !isNaN(Date.parse(val)), 'Data non valida'),

  dataProssimoTagliando: z
    .string()
    .optional()
    .refine(val => !val || !isNaN(Date.parse(val)), 'Data non valida'),

  scadenzaRevisione: z
    .string()
    .optional()
    .refine(val => !val || !isNaN(Date.parse(val)), 'Data non valida'),

  note: z.string().max(1000, 'Le note non possono superare 1000 caratteri').optional(),

  clienteId: z.string().min(1, 'Seleziona un cliente'),
});

export type VehicleFormData = z.infer<typeof vehicleFormSchema>;

export const defaultVehicleValues: Partial<VehicleFormData> = {
  targa: '',
  marca: '',
  modello: '',
  anno: new Date().getFullYear(),
  colore: '',
  vin: '',
  kmAttuali: 0,
  dataUltimoTagliando: '',
  dataProssimoTagliando: '',
  scadenzaRevisione: '',
  note: '',
  clienteId: '',
};
