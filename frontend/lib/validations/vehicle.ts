/**
 * Vehicle Validation Schemas
 * Re-exports from vehicle form schema
 */
export { vehicleFormSchema as vehicleSchema } from '@/components/vehicles/vehicle-form-schema';
export type { VehicleFormData, VehicleFormData as VehicleFormValues } from '@/components/vehicles/vehicle-form-schema';

/** Format a license plate string to uppercase with standard spacing */
export function formatLicensePlate(plate: string): string {
  return plate.toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
}

/** Fuel type display labels */
export const fuelTypeLabels: Record<string, string> = {
  BENZINA: 'Benzina',
  DIESEL: 'Diesel',
  GPL: 'GPL',
  METANO: 'Metano',
  IBRIDO: 'Ibrido',
  ELETTRICO: 'Elettrico',
  IBRIDO_PLUG_IN: 'Ibrido Plug-in',
};

/** Fuel type icons (emoji) */
export const fuelTypeIcons: Record<string, string> = {
  BENZINA: '\u26FD',
  DIESEL: '\u26FD',
  GPL: '\uD83D\uDD25',
  METANO: '\uD83D\uDD25',
  IBRIDO: '\uD83C\uDF3F',
  ELETTRICO: '\u26A1',
  IBRIDO_PLUG_IN: '\uD83D\uDD0C',
};

/** VIN lookup result interface */
export interface VINLookupResult {
  valid: boolean;
  make?: string;
  model?: string;
  year?: number;
  fuelType?: string;
  engineSize?: number;
  powerKw?: number;
}

/** Mock VIN lookup for development */
export async function mockVINLookup(vin: string): Promise<VINLookupResult> {
  if (vin.length < 17) return { valid: false };
  return {
    valid: true,
    make: 'FIAT',
    model: 'Panda',
    year: 2020,
    fuelType: 'BENZINA',
    engineSize: 1200,
    powerKw: 51,
  };
}
