import { Test, TestingModule } from '@nestjs/testing';
import { RentriController } from './rentri.controller';
import { RentriService } from '../services/rentri.service';
import { FirService } from '../services/fir.service';
import { MudService } from '../services/mud.service';
import { WasteEntryType, WasteHazardClass, WastePhysicalState, WasteFirStatus } from '@prisma/client';

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

      const result = await controller.updateFirStatus(TENANT_ID, 'fir-001', { status: WasteFirStatus.VIDIMATED });

      expect(firService.updateStatus).toHaveBeenCalledWith(TENANT_ID, 'fir-001', WasteFirStatus.VIDIMATED);
      expect(result).toBeDefined();
    });
  });

  describe('vidimateFir', () => {
    it('should delegate to firService.vidimateFir', async () => {
      firService.vidimateFir.mockResolvedValue({ ...mockFir, status: WasteFirStatus.VIDIMATED, vivifirCode: 'VF123' });

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

      const result = await controller.createTransporter(TENANT_ID, { name: 'Test', fiscalCode: '123' });

      expect(rentriService.createTransporter).toHaveBeenCalledWith(TENANT_ID, { name: 'Test', fiscalCode: '123' });
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

      const result = await controller.createDestination(TENANT_ID, { name: 'Test', fiscalCode: '456', address: 'Via Test' });

      expect(rentriService.createDestination).toHaveBeenCalledWith(TENANT_ID, { name: 'Test', fiscalCode: '456', address: 'Via Test' });
      expect(result).toEqual(destination);
    });
  });

  // ============== DASHBOARD & ALERTS ==============

  describe('getDashboard', () => {
    it('should delegate to rentriService.getDashboard', async () => {
      const dashboard = { totalEntriesThisYear: 10, totalKgThisYear: 500, byCer: [], monthlyTrend: [], storageAlerts: 0 };
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
  });
});
