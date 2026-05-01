import { BadRequestException, Injectable } from '@nestjs/common';

export interface VinDecodeResult {
  vin: string;
  make: string;
  model: string;
  year: number | null;
  fuelType: string | null;
  engineDisplacement: string | null;
  power: string | null;
  transmissionType: string | null;
  driveType: string | null;
  vehicleType: string | null;
  bodyClass: string | null;
}

interface NhtsaResultItem {
  Variable: string;
  Value: string | null;
}

interface NhtsaResponse {
  Results: NhtsaResultItem[];
}

const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/;

const NHTSA_BASE_URL = 'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin';

const VARIABLE_MAP: Record<string, keyof Omit<VinDecodeResult, 'vin' | 'year'>> = {
  Make: 'make',
  Model: 'model',
  'Fuel Type - Primary': 'fuelType',
  'Displacement (L)': 'engineDisplacement',
  'Engine Brake (hp) From': 'power',
  'Transmission Style': 'transmissionType',
  'Drive Type': 'driveType',
  'Vehicle Type': 'vehicleType',
  'Body Class': 'bodyClass',
};

@Injectable()
export class VinDecoderService {
  /**
   * Decode a VIN using the NHTSA Vehicle API
   */
  async decode(vin: string): Promise<VinDecodeResult> {
    const normalizedVin = vin.toUpperCase().trim();

    if (!VIN_REGEX.test(normalizedVin)) {
      throw new BadRequestException(
        `Invalid VIN format: must be exactly 17 alphanumeric characters (excluding I, O, Q)`,
      );
    }

    const url = `${NHTSA_BASE_URL}/${normalizedVin}?format=json`;

    let response: Response;
    try {
      response = await fetch(url);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to reach NHTSA API: ${message}`);
    }

    if (!response.ok) {
      throw new BadRequestException(`NHTSA API returned status ${response.status}`);
    }

    let data: NhtsaResponse;
    try {
      data = (await response.json()) as NhtsaResponse;
    } catch {
      throw new BadRequestException('Failed to parse NHTSA API response');
    }

    if (!data.Results || !Array.isArray(data.Results)) {
      throw new BadRequestException('Invalid NHTSA API response format');
    }

    return this.mapResults(normalizedVin, data.Results);
  }

  private mapResults(vin: string, results: NhtsaResultItem[]): VinDecodeResult {
    const values: Record<string, string | null> = {};

    for (const item of results) {
      if (item.Variable === 'Model Year') {
        values['year'] = item.Value;
      }

      const mappedKey = VARIABLE_MAP[item.Variable];
      if (mappedKey) {
        // eslint-disable-next-line security/detect-object-injection
        values[mappedKey] = item.Value || null;
      }
    }

    const yearRaw = values['year'];
    const yearParsed = yearRaw ? parseInt(yearRaw, 10) : null;

    return {
      vin,
      make: values['make'] ?? '',
      model: values['model'] ?? '',
      year: yearParsed !== null && !isNaN(yearParsed) ? yearParsed : null,
      fuelType: values['fuelType'] ?? null,
      engineDisplacement: values['engineDisplacement'] ?? null,
      power: values['power'] ?? null,
      transmissionType: values['transmissionType'] ?? null,
      driveType: values['driveType'] ?? null,
      vehicleType: values['vehicleType'] ?? null,
      bodyClass: values['bodyClass'] ?? null,
    };
  }
}
