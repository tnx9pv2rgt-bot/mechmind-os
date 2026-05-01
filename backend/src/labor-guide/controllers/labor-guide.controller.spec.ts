import { Test, TestingModule } from '@nestjs/testing';
import { LaborGuideController } from './labor-guide.controller';
import { LaborGuideService } from '../services/labor-guide.service';

describe('LaborGuideController', () => {
  let controller: LaborGuideController;
  let service: jest.Mocked<LaborGuideService>;

  const TENANT_ID = 'tenant-001';

  const mockGuide = {
    id: 'guide-001',
    tenantId: TENANT_ID,
    name: 'Standard Labor Guide 2026',
    description: 'Default labor times',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEntry = {
    id: 'entry-001',
    guideId: 'guide-001',
    tenantId: TENANT_ID,
    make: 'Toyota',
    model: 'Corolla',
    category: 'Brakes',
    operation: 'Front brake pad replacement',
    laborHours: 1.5,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LaborGuideController],
      providers: [
        {
          provide: LaborGuideService,
          useValue: {
            createGuide: jest.fn(),
            findAllGuides: jest.fn(),
            searchEntries: jest.fn(),
            findGuideById: jest.fn(),
            updateGuide: jest.fn(),
            deleteGuide: jest.fn(),
            addEntry: jest.fn(),
            updateEntry: jest.fn(),
            deleteEntry: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<LaborGuideController>(LaborGuideController);
    service = module.get(LaborGuideService) as jest.Mocked<LaborGuideService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ============== GUIDES ==============

  describe('createGuide', () => {
    it('should delegate to service with tenantId and dto', async () => {
      service.createGuide.mockResolvedValue(mockGuide as never);
      const dto = { name: 'Standard Labor Guide 2026', description: 'Default labor times' };

      const result = await controller.createGuide(TENANT_ID, dto as never);

      expect(service.createGuide).toHaveBeenCalledWith(TENANT_ID, dto);
      expect(result).toEqual(mockGuide);
    });
  });

  describe('findAllGuides', () => {
    it('should delegate to service with tenantId and pagination', async () => {
      const paginated = { data: [mockGuide], total: 1, page: 1, limit: 50, pages: 1 };
      service.findAllGuides.mockResolvedValue(paginated as never);

      const result = await controller.findAllGuides(TENANT_ID);

      expect(service.findAllGuides).toHaveBeenCalledWith(TENANT_ID, {
        page: undefined,
        limit: undefined,
      });
      expect(result).toEqual(paginated);
    });

    it('should parse page and limit query parameters correctly', async () => {
      const paginated = { data: [mockGuide], total: 100, page: 2, limit: 25, pages: 4 };
      service.findAllGuides.mockResolvedValueOnce(paginated as never);

      const result = await controller.findAllGuides(TENANT_ID, '2', '25');

      expect(service.findAllGuides).toHaveBeenCalledWith(TENANT_ID, {
        page: 2,
        limit: 25,
      });
      expect(result).toEqual(paginated);
    });

    it('should handle undefined page and limit', async () => {
      const paginated = { data: [mockGuide], total: 1, page: 1, limit: 50, pages: 1 };
      service.findAllGuides.mockResolvedValueOnce(paginated as never);

      await controller.findAllGuides(TENANT_ID, undefined, undefined);

      expect(service.findAllGuides).toHaveBeenCalledWith(TENANT_ID, {
        page: undefined,
        limit: undefined,
      });
    });
  });

  describe('searchEntries', () => {
    it('should delegate to service with tenantId, make, model, and category', async () => {
      const paginated = { data: [mockEntry], total: 1, page: 1, limit: 50, pages: 1 };
      service.searchEntries.mockResolvedValue(paginated as never);
      const query = { make: 'Toyota', model: 'Corolla', category: 'Brakes' };

      const result = await controller.searchEntries(TENANT_ID, query as never);

      expect(service.searchEntries).toHaveBeenCalledWith(
        TENANT_ID,
        'Toyota',
        'Corolla',
        'Brakes',
        undefined,
        undefined,
      );
      expect(result).toEqual(paginated);
    });

    it('should parse page and limit query parameters in search', async () => {
      const paginated = { data: [mockEntry], total: 50, page: 3, limit: 20, pages: 3 };
      service.searchEntries.mockResolvedValueOnce(paginated as never);
      const query = { make: 'Toyota', model: 'Corolla', category: 'Brakes' };

      const result = await controller.searchEntries(TENANT_ID, query as never, '3', '20');

      expect(service.searchEntries).toHaveBeenCalledWith(
        TENANT_ID,
        'Toyota',
        'Corolla',
        'Brakes',
        3,
        20,
      );
      expect(result).toEqual(paginated);
    });

    it('should handle undefined page and limit in search', async () => {
      const paginated = { data: [mockEntry], total: 1, page: 1, limit: 50, pages: 1 };
      service.searchEntries.mockResolvedValueOnce(paginated as never);
      const query = { make: 'Toyota' };

      await controller.searchEntries(TENANT_ID, query as never, undefined, undefined);

      expect(service.searchEntries).toHaveBeenCalledWith(
        TENANT_ID,
        'Toyota',
        undefined,
        undefined,
        undefined,
        undefined,
      );
    });
  });

  describe('findGuideById', () => {
    it('should delegate to service with tenantId and id', async () => {
      const guideWithEntries = { ...mockGuide, entries: [mockEntry] };
      service.findGuideById.mockResolvedValue(guideWithEntries as never);

      const result = await controller.findGuideById(TENANT_ID, 'guide-001');

      expect(service.findGuideById).toHaveBeenCalledWith(TENANT_ID, 'guide-001');
      expect(result).toEqual(guideWithEntries);
    });
  });

  describe('updateGuide', () => {
    it('should delegate to service with tenantId, id, and dto', async () => {
      const updated = { ...mockGuide, name: 'Updated Guide' };
      service.updateGuide.mockResolvedValue(updated as never);
      const dto = { name: 'Updated Guide' };

      const result = await controller.updateGuide(TENANT_ID, 'guide-001', dto as never);

      expect(service.updateGuide).toHaveBeenCalledWith(TENANT_ID, 'guide-001', dto);
      expect(result).toEqual(updated);
    });
  });

  describe('deleteGuide', () => {
    it('should delegate to service with tenantId and id', async () => {
      service.deleteGuide.mockResolvedValue(undefined as never);

      const result = await controller.deleteGuide(TENANT_ID, 'guide-001');

      expect(service.deleteGuide).toHaveBeenCalledWith(TENANT_ID, 'guide-001');
      expect(result).toBeUndefined();
    });
  });

  // ============== ENTRIES ==============

  describe('addEntry', () => {
    it('should delegate to service with tenantId, guideId, and dto', async () => {
      service.addEntry.mockResolvedValue(mockEntry as never);
      const dto = {
        make: 'Toyota',
        model: 'Corolla',
        category: 'Brakes',
        operation: 'Front brake pad replacement',
        laborHours: 1.5,
      };

      const result = await controller.addEntry(TENANT_ID, 'guide-001', dto as never);

      expect(service.addEntry).toHaveBeenCalledWith(TENANT_ID, 'guide-001', dto);
      expect(result).toEqual(mockEntry);
    });
  });

  describe('updateEntry', () => {
    it('should delegate to service with tenantId, entryId, and dto', async () => {
      const updated = { ...mockEntry, laborHours: 2.0 };
      service.updateEntry.mockResolvedValue(updated as never);
      const dto = { laborHours: 2.0 };

      const result = await controller.updateEntry(TENANT_ID, 'entry-001', dto as never);

      expect(service.updateEntry).toHaveBeenCalledWith(TENANT_ID, 'entry-001', dto);
      expect(result).toEqual(updated);
    });
  });

  describe('deleteEntry', () => {
    it('should delegate to service with tenantId and entryId', async () => {
      service.deleteEntry.mockResolvedValue(undefined as never);

      const result = await controller.deleteEntry(TENANT_ID, 'entry-001');

      expect(service.deleteEntry).toHaveBeenCalledWith(TENANT_ID, 'entry-001');
      expect(result).toBeUndefined();
    });
  });

  describe('DTO validation integration', () => {
    it('should accept CreateLaborGuideDto with optional fields', async () => {
      service.createGuide.mockResolvedValue(mockGuide as never);

      const dto = {
        name: 'Test Guide',
        description: 'Optional description',
        source: 'MANUFACTURER',
      };

      const result = await controller.createGuide(TENANT_ID, dto as never);

      expect(service.createGuide).toHaveBeenCalledWith(TENANT_ID, dto);
      expect(result).toEqual(mockGuide);
    });

    it('should accept CreateLaborGuideEntryDto with optional years', async () => {
      service.addEntry.mockResolvedValue(mockEntry as never);

      const dto = {
        make: 'Toyota',
        model: 'Corolla',
        operationCode: 'BRAKE_PAD',
        operationName: 'Brake Pad Replacement',
        category: 'Brakes',
        laborTimeMinutes: 90,
        yearFrom: 2020,
        yearTo: 2025,
        difficultyLevel: 3,
        notes: 'Standard operation',
      };

      const result = await controller.addEntry(TENANT_ID, 'guide-001', dto as never);

      expect(service.addEntry).toHaveBeenCalledWith(TENANT_ID, 'guide-001', dto);
      expect(result).toEqual(mockEntry);
    });

    it('should accept UpdateLaborGuideEntryDto with partial fields', async () => {
      service.updateEntry.mockResolvedValue(mockEntry as never);

      const dto = {
        laborTimeMinutes: 120,
        notes: 'Updated notes',
      };

      const result = await controller.updateEntry(TENANT_ID, 'entry-001', dto as never);

      expect(service.updateEntry).toHaveBeenCalledWith(TENANT_ID, 'entry-001', dto);
      expect(result).toEqual(mockEntry);
    });

    it('should accept SearchLaborGuideDto with optional filters', async () => {
      const paginated = { data: [mockEntry], total: 1, page: 1, limit: 50, pages: 1 };
      service.searchEntries.mockResolvedValueOnce(paginated as never);

      const query = { make: 'Toyota', category: 'Brakes' };

      const result = await controller.searchEntries(TENANT_ID, query as never);

      expect(service.searchEntries).toHaveBeenCalledWith(
        TENANT_ID,
        'Toyota',
        undefined,
        'Brakes',
        undefined,
        undefined,
      );
      expect(result).toEqual(paginated);
    });
  });
});
