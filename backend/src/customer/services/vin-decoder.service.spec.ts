import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { VinDecoderService } from './vin-decoder.service';

interface MockNhtsaItem {
  Variable: string;
  Value: string | null;
}

const buildNhtsaResponse = (items: MockNhtsaItem[]): { Results: MockNhtsaItem[] } => ({
  Results: items,
});

const VALID_VIN = '1HGBH41JXMN109186';

const MOCK_NHTSA_RESULTS: MockNhtsaItem[] = [
  { Variable: 'Make', Value: 'Honda' },
  { Variable: 'Model', Value: 'Civic' },
  { Variable: 'Model Year', Value: '2021' },
  { Variable: 'Fuel Type - Primary', Value: 'Gasoline' },
  { Variable: 'Displacement (L)', Value: '1.5' },
  { Variable: 'Engine Brake (hp) From', Value: '174' },
  { Variable: 'Transmission Style', Value: 'Automatic' },
  { Variable: 'Drive Type', Value: 'FWD' },
  { Variable: 'Vehicle Type', Value: 'PASSENGER CAR' },
  { Variable: 'Body Class', Value: 'Sedan' },
];

describe('VinDecoderService', () => {
  let service: VinDecoderService;
  let fetchMock: jest.Mock;

  beforeEach(async () => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as never;

    const module: TestingModule = await Test.createTestingModule({
      providers: [VinDecoderService],
    }).compile();

    service = module.get<VinDecoderService>(VinDecoderService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('decode', () => {
    it('should decode a valid VIN', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(buildNhtsaResponse(MOCK_NHTSA_RESULTS)),
      } as never);

      const result = await service.decode(VALID_VIN);

      expect(fetchMock).toHaveBeenCalledWith(
        `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${VALID_VIN}?format=json`,
      );
      expect(result).toEqual({
        vin: VALID_VIN,
        make: 'Honda',
        model: 'Civic',
        year: 2021,
        fuelType: 'Gasoline',
        engineDisplacement: '1.5',
        power: '174',
        transmissionType: 'Automatic',
        driveType: 'FWD',
        vehicleType: 'PASSENGER CAR',
        bodyClass: 'Sedan',
      });
    });

    it('should handle lowercase VIN by normalizing to uppercase', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(buildNhtsaResponse(MOCK_NHTSA_RESULTS)),
      } as never);

      await service.decode(VALID_VIN.toLowerCase());

      expect(fetchMock).toHaveBeenCalledWith(
        `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${VALID_VIN}?format=json`,
      );
    });

    it('should return null for fields with empty values from NHTSA', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve(
            buildNhtsaResponse([
              { Variable: 'Make', Value: 'Toyota' },
              { Variable: 'Model', Value: 'Camry' },
              { Variable: 'Model Year', Value: '2020' },
              { Variable: 'Fuel Type - Primary', Value: '' },
              { Variable: 'Displacement (L)', Value: null },
            ]),
          ),
      } as never);

      const result = await service.decode(VALID_VIN);

      expect(result.fuelType).toBeNull();
      expect(result.engineDisplacement).toBeNull();
      expect(result.power).toBeNull();
      expect(result.transmissionType).toBeNull();
    });

    it('should throw BadRequestException for VIN that is too short', async () => {
      await expect(service.decode('1HGBH41JX')).rejects.toThrow(BadRequestException);
      await expect(service.decode('1HGBH41JX')).rejects.toThrow(/Invalid VIN format/);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for VIN that is too long', async () => {
      await expect(service.decode('1HGBH41JXMN109186XX')).rejects.toThrow(BadRequestException);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for VIN containing letter I', async () => {
      await expect(service.decode('1HGBH41IXMN109186')).rejects.toThrow(BadRequestException);
      await expect(service.decode('1HGBH41IXMN109186')).rejects.toThrow(/Invalid VIN format/);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for VIN containing letter O', async () => {
      await expect(service.decode('1HGBH41OXMN109186')).rejects.toThrow(BadRequestException);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for VIN containing letter Q', async () => {
      await expect(service.decode('1HGBH41QXMN109186')).rejects.toThrow(BadRequestException);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should handle NHTSA API network errors gracefully', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));

      await expect(service.decode(VALID_VIN)).rejects.toThrow(BadRequestException);
      await expect(service.decode(VALID_VIN)).rejects.toThrow(/Failed to reach NHTSA API/);
    });

    it('should handle NHTSA API non-ok response', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
      } as never);

      await expect(service.decode(VALID_VIN)).rejects.toThrow(BadRequestException);
      await expect(service.decode(VALID_VIN)).rejects.toThrow(/NHTSA API returned status 500/);
    });

    it('should handle invalid JSON response', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      } as never);

      await expect(service.decode(VALID_VIN)).rejects.toThrow(BadRequestException);
      await expect(service.decode(VALID_VIN)).rejects.toThrow(/Failed to parse NHTSA API response/);
    });

    it('should handle response with missing Results array', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      } as never);

      await expect(service.decode(VALID_VIN)).rejects.toThrow(BadRequestException);
      await expect(service.decode(VALID_VIN)).rejects.toThrow(/Invalid NHTSA API response format/);
    });

    it('should handle year field as null when not provided', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve(
            buildNhtsaResponse([
              { Variable: 'Make', Value: 'Toyota' },
              { Variable: 'Model', Value: 'Camry' },
              // No Model Year provided
            ]),
          ),
      } as never);

      const result = await service.decode(VALID_VIN);

      expect(result.year).toBeNull();
      expect(result.make).toBe('Toyota');
      expect(result.model).toBe('Camry');
    });

    it('should handle year field as null when empty string is provided', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve(
            buildNhtsaResponse([
              { Variable: 'Make', Value: 'Honda' },
              { Variable: 'Model', Value: 'Civic' },
              { Variable: 'Model Year', Value: '' },
            ]),
          ),
      } as never);

      const result = await service.decode(VALID_VIN);

      expect(result.year).toBeNull();
    });

    it('should return year as number when valid numeric string provided', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve(
            buildNhtsaResponse([
              { Variable: 'Make', Value: 'Ford' },
              { Variable: 'Model', Value: 'Mustang' },
              { Variable: 'Model Year', Value: '2022' },
            ]),
          ),
      } as never);

      const result = await service.decode(VALID_VIN);

      expect(result.year).toBe(2022);
      expect(typeof result.year).toBe('number');
    });

    it('should return year as null when non-numeric string provided', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve(
            buildNhtsaResponse([
              { Variable: 'Make', Value: 'BMW' },
              { Variable: 'Model', Value: 'M3' },
              { Variable: 'Model Year', Value: 'INVALID' },
            ]),
          ),
      } as never);

      const result = await service.decode(VALID_VIN);

      expect(result.year).toBeNull();
    });

    it('should normalize VIN with leading/trailing whitespace', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(buildNhtsaResponse(MOCK_NHTSA_RESULTS)),
      } as never);

      const result = await service.decode(`  ${VALID_VIN}  `);

      expect(result.vin).toBe(VALID_VIN);
      expect(fetchMock).toHaveBeenCalledWith(
        `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${VALID_VIN}?format=json`,
      );
    });

    it('should use empty string for missing make and model', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve(
            buildNhtsaResponse([
              { Variable: 'Fuel Type - Primary', Value: 'Electric' },
            ]),
          ),
      } as never);

      const result = await service.decode(VALID_VIN);

      expect(result.make).toBe('');
      expect(result.model).toBe('');
      expect(result.fuelType).toBe('Electric');
    });

    it('should handle network error with unknown error type', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const unknownError: any = { foo: 'bar' }; // not an Error instance
      fetchMock.mockRejectedValueOnce(unknownError);

      await expect(service.decode(VALID_VIN)).rejects.toThrow(BadRequestException);
      expect(fetchMock).toHaveBeenCalled();
    });

    it('should convert empty string to null for optional fields', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve(
            buildNhtsaResponse([
              { Variable: 'Make', Value: 'BMW' },
              { Variable: 'Model', Value: 'X5' },
              { Variable: 'Model Year', Value: '2021' },
              { Variable: 'Fuel Type - Primary', Value: '' }, // empty string → null
              { Variable: 'Transmission Style', Value: null }, // null → null
              { Variable: 'Drive Type', Value: 'AWD' }, // present → kept
            ]),
          ),
      } as never);

      const result = await service.decode(VALID_VIN);

      expect(result.fuelType).toBeNull(); // empty string converted to null
      expect(result.transmissionType).toBeNull(); // null stays null
      expect(result.driveType).toBe('AWD'); // present values kept
    });

    it('should distinguish between null and missing field', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve(
            buildNhtsaResponse([
              { Variable: 'Make', Value: 'Mercedes' },
              { Variable: 'Model', Value: 'E-Class' },
              { Variable: 'Model Year', Value: '2023' },
              // No Transmission field at all
              { Variable: 'Drive Type', Value: null },
            ]),
          ),
      } as never);

      const result = await service.decode(VALID_VIN);

      expect(result.transmissionType).toBeNull(); // missing field → null
      expect(result.driveType).toBeNull(); // explicit null → null
    });

    it('should handle special vehicle types and body classes', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve(
            buildNhtsaResponse([
              { Variable: 'Make', Value: 'Tesla' },
              { Variable: 'Model', Value: 'Model 3' },
              { Variable: 'Model Year', Value: '2024' },
              { Variable: 'Vehicle Type', Value: 'PASSENGER CAR' },
              { Variable: 'Body Class', Value: 'Sedan' },
            ]),
          ),
      } as never);

      const result = await service.decode(VALID_VIN);

      expect(result.vehicleType).toBe('PASSENGER CAR');
      expect(result.bodyClass).toBe('Sedan');
    });

    it('should handle results with unmapped field variables', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve(
            buildNhtsaResponse([
              { Variable: 'Make', Value: 'Audi' },
              { Variable: 'Model', Value: 'A4' },
              { Variable: 'Model Year', Value: '2023' },
              { Variable: 'UnmappedVariable', Value: 'SomeValue' },
              { Variable: 'AnotherUnmapped', Value: 'AnotherValue' },
            ]),
          ),
      } as never);

      const result = await service.decode(VALID_VIN);

      expect(result.make).toBe('Audi');
      expect(result.model).toBe('A4');
      expect(result.year).toBe(2023);
      // Unmapped variables are silently ignored
    });

    it('should handle NaN when parsing year with non-numeric value', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve(
            buildNhtsaResponse([
              { Variable: 'Make', Value: 'BMW' },
              { Variable: 'Model', Value: 'X5' },
              { Variable: 'Model Year', Value: 'NotANumber' },
            ]),
          ),
      } as never);

      const result = await service.decode(VALID_VIN);

      expect(result.year).toBeNull();
      expect(typeof result.year).toBe('object'); // null is typeof 'object'
    });

    it('should handle results with all empty values', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve(
            buildNhtsaResponse([
              { Variable: 'Make', Value: '' },
              { Variable: 'Model', Value: '' },
              { Variable: 'Model Year', Value: '' },
              { Variable: 'Fuel Type - Primary', Value: '' },
            ]),
          ),
      } as never);

      const result = await service.decode(VALID_VIN);

      expect(result.make).toBe('');
      expect(result.model).toBe('');
      expect(result.year).toBeNull();
      expect(result.fuelType).toBeNull();
    });

    it('should map all supported NHTSA variables correctly', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve(
            buildNhtsaResponse([
              { Variable: 'Make', Value: 'Volkswagen' },
              { Variable: 'Model', Value: 'Golf' },
              { Variable: 'Model Year', Value: '2022' },
              { Variable: 'Fuel Type - Primary', Value: 'Diesel' },
              { Variable: 'Displacement (L)', Value: '2.0' },
              { Variable: 'Engine Brake (hp) From', Value: '150' },
              { Variable: 'Transmission Style', Value: 'Manual' },
              { Variable: 'Drive Type', Value: 'FWD' },
              { Variable: 'Vehicle Type', Value: 'PASSENGER CAR' },
              { Variable: 'Body Class', Value: 'Sedan' },
            ]),
          ),
      } as never);

      const result = await service.decode(VALID_VIN);

      expect(result.make).toBe('Volkswagen');
      expect(result.model).toBe('Golf');
      expect(result.year).toBe(2022);
      expect(result.fuelType).toBe('Diesel');
      expect(result.engineDisplacement).toBe('2.0');
      expect(result.power).toBe('150');
      expect(result.transmissionType).toBe('Manual');
      expect(result.driveType).toBe('FWD');
      expect(result.vehicleType).toBe('PASSENGER CAR');
      expect(result.bodyClass).toBe('Sedan');
    });
  });
});
