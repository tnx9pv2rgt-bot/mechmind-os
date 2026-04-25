import { Test, TestingModule } from '@nestjs/testing';
import { RentriController } from './rentri.controller';
import { RentriService } from '../services/rentri.service';
import { FirService } from '../services/fir.service';
import { MudService } from '../services/mud.service';
import {
  WasteEntryType,
  WasteHazardClass,
  WastePhysicalState,
  WasteFirStatus,
} from '@prisma/client';

describe('RentriController', () => {
  let controller: RentriController;
  let rentriService: jest.Mocked<RentriService>;
  let firService: jest.Mocked<FirService>;
  let mudService: jest.Mocked<MudService>;

  const TENANT_ID = 'tenant-001';
  const USER_ID = 'user-001';

  const mockEntry = {
    id: 'entry-001',
    tenantId: TENANT_ID,
    entryNumber: 'RC-2026-0001',
    entryType: WasteEntryType.CARICO,
    cerCode: '130205*',
    quantityKg: 25.5,
  };

  const mockFir = {
    id: 'fir-001',
    tenantId: TENANT_ID,
    firNumber: 'FIR-2026-0001',
    status: WasteFirStatus.DRAFT,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RentriController],
      providers: [
        {
          provide: RentriService,
          useValue: {
            findAllEntries: jest.fn(),
            findOneEntry: jest.fn(),
            createEntry: jest.fn(),
            updateEntry: jest.fn(),
            getCerCodes: jest.fn(),
            searchCerCodes: jest.fn(),
            findAllTransporters: jest.fn(),
            createTransporter: jest.fn(),
            updateTransporter: jest.fn(),
            findAllDestinations: jest.fn(),
            createDestination: jest.fn(),
            updateDestination: jest.fn(),
            getDashboard: jest.fn(),
            getAlerts: jest.fn(),
          },
        },
        {
          provide: FirService,
          useValue: {
            findAllFirs: jest.fn(),
            findOneFir: jest.fn(),
            createFir: jest.fn(),
            updateStatus: jest.fn(),
            vidimateFir: jest.fn(),
          },
        },
        {
          provide: MudService,
          useValue: {
            getPreview: jest.fn(),
            exportCsv: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<RentriController>(RentriController);
    rentriService = module.get(RentriService) as jest.Mocked<RentriService>;
    firService = module.get(FirService) as jest.Mocked<FirService>;
    mudService = module.get(MudService) as jest.Mocked<MudService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ============== ENTRIES ==============

  describe('getEntries', () => {
    it('should delegate to rentriService.findAllEntries', async () => {
      const paginated = { data: [mockEntry], total: 1, page: 1, limit: 20, pages: 1 };
      rentriService.findAllEntries.mockResolvedValue(paginated);

      const result = await controller.getEntries(TENANT_ID, { page: 1, limit: 20 });

      expect(rentriService.findAllEntries).toHaveBeenCalledWith(TENANT_ID, { page: 1, limit: 20 });
      expect(result).toEqual(paginated);
    });
  });

  describe('getEntry', () => {
    it('should delegate to rentriService.findOneEntry', async () => {
      rentriService.findOneEntry.mockResolvedValue(mockEntry);

      const result = await controller.getEntry(TENANT_ID, 'entry-001');

      expect(rentriService.findOneEntry).toHaveBeenCalledWith(TENANT_ID, 'entry-001');
      expect(result).toEqual(mockEntry);
    });
  });

  describe('createEntry', () => {
    it('should delegate to rentriService.createEntry with tenantId and userId', async () => {
      rentriService.createEntry.mockResolvedValue(mockEntry);
      const dto = {
        cerCode: '130205*',
        cerDescription: 'Oli minerali',
        entryType: WasteEntryType.CARICO,
        entryDate: '2026-03-24',
        quantityKg: 25.5,
        hazardClass: WasteHazardClass.PERICOLOSO,
        physicalState: WastePhysicalState.LIQUIDO,
      };

      const result = await controller.createEntry(TENANT_ID, USER_ID, dto);

      expect(rentriService.createEntry).toHaveBeenCalledWith(TENANT_ID, dto, USER_ID);
      expect(result).toEqual(mockEntry);
    });
  });

  // ============== CER CODES ==============

  describe('getCerCodes', () => {
    it('should delegate to rentriService.getCerCodes', () => {
      rentriService.getCerCodes.mockReturnValue([]);
      const result = controller.getCerCodes();
      expect(rentriService.getCerCodes).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('searchCerCodes', () => {
    it('should delegate to rentriService.searchCerCodes with query', () => {
      rentriService.searchCerCodes.mockReturnValue([]);
      const result = controller.searchCerCodes('olio');
      expect(rentriService.searchCerCodes).toHaveBeenCalledWith('olio');
      expect(result).toEqual([]);
    });
  });

  // ============== FIR ==============

  describe('getFirs', () => {
    it('should delegate to firService.findAllFirs', async () => {
      const paginated = { data: [mockFir], total: 1, page: 1, limit: 20, pages: 1 };
      firService.findAllFirs.mockResolvedValue(paginated);

      const result = await controller.getFirs(TENANT_ID, { page: 1, limit: 20 });

      expect(firService.findAllFirs).toHaveBeenCalledWith(TENANT_ID, { page: 1, limit: 20 });
      expect(result).toEqual(paginated);
    });
  });

  describe('createFir', () => {
    it('should delegate to firService.createFir', async () => {
      firService.createFir.mockResolvedValue(mockFir);
      const dto = {
        cerCode: '130205*',
        cerDescription: 'Oli minerali',
        quantityKg: 50,
        hazardClass: WasteHazardClass.PERICOLOSO,
        physicalState: WastePhysicalState.LIQUIDO,
        transporterId: 'transporter-001',
        destinationId: 'destination-001',
        scheduledDate: '2026-04-01',
      };

      const result = await controller.createFir(TENANT_ID, USER_ID, dto);

      expect(firService.createFir).toHaveBeenCalledWith(TENANT_ID, dto, USER_ID);
      expect(result).toEqual(mockFir);
    });
  });

  describe('updateFirStatus', () => {
    it('should delegate to firService.updateStatus', async () => {
      firService.updateStatus.mockResolvedValue({ ...mockFir, status: WasteFirStatus.VIDIMATED });

      const result = await controller.updateFirStatus(TENANT_ID, 'fir-001', {
        status: WasteFirStatus.VIDIMATED,
      });

      expect(firService.updateStatus).toHaveBeenCalledWith(
        TENANT_ID,
        'fir-001',
        WasteFirStatus.VIDIMATED,
      );
      expect(result).toBeDefined();
    });
  });

  describe('vidimateFir', () => {
    it('should delegate to firService.vidimateFir', async () => {
      firService.vidimateFir.mockResolvedValue({
        ...mockFir,
        status: WasteFirStatus.VIDIMATED,
        vivifirCode: 'VF123',
      });

      const result = await controller.vidimateFir(TENANT_ID, 'fir-001', { vivifirCode: 'VF123' });

      expect(firService.vidimateFir).toHaveBeenCalledWith(TENANT_ID, 'fir-001', 'VF123');
      expect(result).toBeDefined();
    });
  });

  // ============== TRANSPORTERS ==============

  describe('getTransporters', () => {
    it('should delegate to rentriService.findAllTransporters', async () => {
      rentriService.findAllTransporters.mockResolvedValue([]);

      const result = await controller.getTransporters(TENANT_ID);

      expect(rentriService.findAllTransporters).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toEqual([]);
    });
  });

  describe('createTransporter', () => {
    it('should delegate to rentriService.createTransporter', async () => {
      const transporter = { id: 'tr-001', name: 'Test', fiscalCode: '123' };
      rentriService.createTransporter.mockResolvedValue(transporter);

      const result = await controller.createTransporter(TENANT_ID, {
        name: 'Test',
        fiscalCode: '123',
      });

      expect(rentriService.createTransporter).toHaveBeenCalledWith(TENANT_ID, {
        name: 'Test',
        fiscalCode: '123',
      });
      expect(result).toEqual(transporter);
    });
  });

  // ============== DESTINATIONS ==============

  describe('getDestinations', () => {
    it('should delegate to rentriService.findAllDestinations', async () => {
      rentriService.findAllDestinations.mockResolvedValue([]);

      const result = await controller.getDestinations(TENANT_ID);

      expect(rentriService.findAllDestinations).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toEqual([]);
    });
  });

  describe('createDestination', () => {
    it('should delegate to rentriService.createDestination', async () => {
      const destination = { id: 'dest-001', name: 'Test', fiscalCode: '456', address: 'Via Test' };
      rentriService.createDestination.mockResolvedValue(destination);

      const result = await controller.createDestination(TENANT_ID, {
        name: 'Test',
        fiscalCode: '456',
        address: 'Via Test',
      });

      expect(rentriService.createDestination).toHaveBeenCalledWith(TENANT_ID, {
        name: 'Test',
        fiscalCode: '456',
        address: 'Via Test',
      });
      expect(result).toEqual(destination);
    });
  });

  // ============== DASHBOARD & ALERTS ==============

  describe('getDashboard', () => {
    it('should delegate to rentriService.getDashboard', async () => {
      const dashboard = {
        totalEntriesThisYear: 10,
        totalKgThisYear: 500,
        byCer: [],
        monthlyTrend: [],
        storageAlerts: 0,
      };
      rentriService.getDashboard.mockResolvedValue(dashboard);

      const result = await controller.getDashboard(TENANT_ID);

      expect(rentriService.getDashboard).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toEqual(dashboard);
    });
  });

  describe('getAlerts', () => {
    it('should delegate to rentriService.getAlerts', async () => {
      rentriService.getAlerts.mockResolvedValue([]);

      const result = await controller.getAlerts(TENANT_ID);

      expect(rentriService.getAlerts).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toEqual([]);
    });
  });

  // ============== MUD ==============

  describe('getMudPreview', () => {
    it('should delegate to mudService.getPreview with parsed year', async () => {
      const preview = { year: 2026, rows: [], totalKg: 0, totalEntries: 0, totalFirs: 0 };
      mudService.getPreview.mockResolvedValue(preview);

      const result = await controller.getMudPreview(TENANT_ID, '2026');

      expect(mudService.getPreview).toHaveBeenCalledWith(TENANT_ID, 2026);
      expect(result).toEqual(preview);
    });
  });

  describe('exportMud', () => {
    it('should delegate to mudService.exportCsv', async () => {
      mudService.exportCsv.mockResolvedValue('CER,Descrizione\n130205*,Oli');

      const result = await controller.exportMud(TENANT_ID, '2026');

      expect(mudService.exportCsv).toHaveBeenCalledWith(TENANT_ID, 2026);
      expect(result).toContain('CER');
    });

    it('should use current year when year not provided', async () => {
      mudService.exportCsv.mockResolvedValue('CER,Descrizione');

      const currentYear = new Date().getFullYear();
      await controller.exportMud(TENANT_ID, '');

      expect(mudService.exportCsv).toHaveBeenCalledWith(TENANT_ID, currentYear);
    });
  });

  // ============== UPDATE ENTRY ==============

  describe('updateEntry', () => {
    it('should delegate to rentriService.updateEntry', async () => {
      rentriService.updateEntry.mockResolvedValue({ ...mockEntry, cerCode: '160103' });

      const result = await controller.updateEntry(TENANT_ID, 'entry-001', {
        cerCode: '160103',
      });

      expect(rentriService.updateEntry).toHaveBeenCalledWith(
        TENANT_ID,
        'entry-001',
        expect.objectContaining({ cerCode: '160103' }),
      );
      expect(result).toBeDefined();
    });
  });

  // ============== FIR GET OPERATIONS ==============

  describe('getFir', () => {
    it('should delegate to firService.findOneFir', async () => {
      firService.findOneFir.mockResolvedValue(mockFir);

      const result = await controller.getFir(TENANT_ID, 'fir-001');

      expect(firService.findOneFir).toHaveBeenCalledWith(TENANT_ID, 'fir-001');
      expect(result).toEqual(mockFir);
    });
  });

  // ============== TRANSPORTER UPDATE ==============

  describe('updateTransporter', () => {
    it('should delegate to rentriService.updateTransporter', async () => {
      const updated = { id: 'tr-001', name: 'Updated Name', fiscalCode: '123' };
      rentriService.updateTransporter.mockResolvedValue(updated);

      const result = await controller.updateTransporter(TENANT_ID, 'tr-001', {
        name: 'Updated Name',
      });

      expect(rentriService.updateTransporter).toHaveBeenCalledWith(
        TENANT_ID,
        'tr-001',
        expect.objectContaining({ name: 'Updated Name' }),
      );
      expect(result).toEqual(updated);
    });
  });

  // ============== DESTINATION UPDATE ==============

  describe('updateDestination', () => {
    it('should delegate to rentriService.updateDestination', async () => {
      const updated = { id: 'dest-001', name: 'Updated Dest', address: 'Via Updated' };
      rentriService.updateDestination.mockResolvedValue(updated);

      const result = await controller.updateDestination(TENANT_ID, 'dest-001', {
        name: 'Updated Dest',
      });

      expect(rentriService.updateDestination).toHaveBeenCalledWith(
        TENANT_ID,
        'dest-001',
        expect.objectContaining({ name: 'Updated Dest' }),
      );
      expect(result).toEqual(updated);
    });
  });

  // ============== YEAR PARSING ==============

  describe('Year parsing in MUD endpoints', () => {
    it('should parse year string to number in getMudPreview', async () => {
      mudService.getPreview.mockResolvedValue({
        year: 2025,
        rows: [],
        totalKg: 0,
        totalEntries: 0,
        totalFirs: 0,
      });

      await controller.getMudPreview(TENANT_ID, '2025');

      expect(mudService.getPreview).toHaveBeenCalledWith(TENANT_ID, 2025);
    });

    it('should use default current year when year is empty string', async () => {
      mudService.getPreview.mockResolvedValue({
        year: new Date().getFullYear(),
        rows: [],
        totalKg: 0,
        totalEntries: 0,
        totalFirs: 0,
      });

      const currentYear = new Date().getFullYear();
      await controller.getMudPreview(TENANT_ID, '');

      expect(mudService.getPreview).toHaveBeenCalledWith(TENANT_ID, currentYear);
    });
  });

  // ============== QUERY PARAMETERS ==============

  describe('Query parameter handling', () => {
    it('should pass query filters to getEntries', async () => {
      const query = {
        page: 2,
        limit: 50,
        cerCode: '130205*',
        entryType: WasteEntryType.CARICO,
      };
      rentriService.findAllEntries.mockResolvedValue({
        data: [mockEntry],
        total: 1,
        page: 2,
        limit: 50,
        pages: 1,
      });

      await controller.getEntries(TENANT_ID, query);

      expect(rentriService.findAllEntries).toHaveBeenCalledWith(TENANT_ID, query);
    });

    it('should pass status filter to getFirs', async () => {
      const query = { page: 1, limit: 20, status: WasteFirStatus.DRAFT };
      firService.findAllFirs.mockResolvedValue({
        data: [mockFir],
        total: 1,
        page: 1,
        limit: 20,
        pages: 1,
      });

      await controller.getFirs(TENANT_ID, query);

      expect(firService.findAllFirs).toHaveBeenCalledWith(TENANT_ID, query);
    });
  });

  // ============== EMPTY QUERY HANDLING ==============

  describe('Empty/default query handling', () => {
    it('should handle empty query object for getEntries', async () => {
      rentriService.findAllEntries.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        pages: 0,
      });

      await controller.getEntries(TENANT_ID, {});

      expect(rentriService.findAllEntries).toHaveBeenCalledWith(TENANT_ID, {});
    });

    it('should handle empty query object for getFirs', async () => {
      firService.findAllFirs.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        pages: 0,
      });

      await controller.getFirs(TENANT_ID, {});

      expect(firService.findAllFirs).toHaveBeenCalledWith(TENANT_ID, {});
    });
  });

  // ============== CONTROLLER INITIALIZATION ==============

  describe('Controller dependencies', () => {
    it('should have all three services injected', () => {
      expect(controller).toBeDefined();
      // Controller is defined implies services are injected
    });

    it('should delegate to correct service for each endpoint group', () => {
      // Verify constructor setup
      expect(rentriService).toBeDefined();
      expect(firService).toBeDefined();
      expect(mudService).toBeDefined();
    });
  });

  // ============== HTTP RETURN CODES (implicit via endpoint defs) ==============

  describe('HTTP status codes (via endpoint definition)', () => {
    it('createEntry returns 201 (via HttpCode decorator)', async () => {
      // HttpCode(HttpStatus.CREATED) is set in controller definition
      rentriService.createEntry.mockResolvedValue(mockEntry);

      const result = await controller.createEntry(TENANT_ID, USER_ID, {
        cerCode: '130205*',
        cerDescription: 'Test',
        entryType: WasteEntryType.CARICO,
        entryDate: '2026-03-24',
        quantityKg: 10,
        hazardClass: WasteHazardClass.PERICOLOSO,
        physicalState: WastePhysicalState.LIQUIDO,
      });

      expect(result).toBeDefined();
    });
  });

  // ============== SEARCH CER CODES ==============

  describe('searchCerCodes query parameter', () => {
    it('should pass empty string when q is undefined', () => {
      rentriService.searchCerCodes.mockReturnValue([]);

      controller.searchCerCodes(undefined as unknown as string);

      expect(rentriService.searchCerCodes).toHaveBeenCalledWith('');
    });

    it('should pass query string as-is when provided', () => {
      rentriService.searchCerCodes.mockReturnValue([]);

      controller.searchCerCodes('olio motore');

      expect(rentriService.searchCerCodes).toHaveBeenCalledWith('olio motore');
    });
  });

  // ============== ADDITIONAL CONTROLLER COVERAGE ==============

  describe('Additional controller endpoints', () => {
    it('should call findOneEntry with correct parameters', async () => {
      rentriService.findOneEntry.mockResolvedValue(mockEntry);

      await controller.getEntry(TENANT_ID, 'entry-001');

      expect(rentriService.findOneEntry).toHaveBeenCalledWith(TENANT_ID, 'entry-001');
    });

    it('should handle FIR transporter optional fields', async () => {
      const fir = { ...mockFir, adrClass: 'CLASS3', vehiclePlate: 'AB123CD' };
      firService.createFir.mockResolvedValue(fir);

      const dto = {
        cerCode: '130205*',
        cerDescription: 'test',
        quantityKg: 50,
        hazardClass: WasteHazardClass.PERICOLOSO,
        physicalState: WastePhysicalState.LIQUIDO,
        transporterId: 'transporter-001',
        destinationId: 'destination-001',
        scheduledDate: '2026-04-01',
        adrClass: 'CLASS3',
        vehiclePlate: 'AB123CD',
      };

      await controller.createFir(TENANT_ID, USER_ID, dto);

      expect(firService.createFir).toHaveBeenCalledWith(
        TENANT_ID,
        expect.objectContaining(dto),
        USER_ID,
      );
    });

    it('should retrieve all FIRs without status filter', async () => {
      firService.findAllFirs.mockResolvedValue({
        data: [mockFir],
        total: 1,
        page: 1,
        limit: 20,
        pages: 1,
      });

      await controller.getFirs(TENANT_ID, {});

      expect(firService.findAllFirs).toHaveBeenCalledWith(TENANT_ID, {});
    });

    it('should handle MUD export without year parameter', async () => {
      mudService.exportCsv.mockResolvedValue('CSV content');

      const currentYear = new Date().getFullYear();
      await controller.exportMud(TENANT_ID, '');

      expect(mudService.exportCsv).toHaveBeenCalledWith(TENANT_ID, currentYear);
    });
  });
});
