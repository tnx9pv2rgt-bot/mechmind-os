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
  });
});
