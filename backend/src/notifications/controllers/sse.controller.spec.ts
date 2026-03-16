import { Test, TestingModule } from '@nestjs/testing';
import { Observable, of } from 'rxjs';
import { SseController } from './sse.controller';
import { SseService } from '../services/sse.service';

describe('SseController', () => {
  let controller: SseController;
  let service: jest.Mocked<SseService>;

  const mockRequest = (overrides: Partial<{ user: { id: string; tenantId: string } }> = {}) =>
    ({
      user: { id: 'user-001', tenantId: 'tenant-001', ...overrides.user },
    }) as never;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SseController],
      providers: [
        {
          provide: SseService,
          useValue: {
            createEventStream: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<SseController>(SseController);
    service = module.get(SseService) as jest.Mocked<SseService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('notificationsStream', () => {
    it('should create event stream with tenantId and no userId filter', () => {
      const mockObservable = of({ data: 'test' }) as Observable<never>;
      service.createEventStream.mockReturnValue(mockObservable as never);

      const result = controller.notificationsStream(mockRequest());

      expect(service.createEventStream).toHaveBeenCalledWith(
        expect.any(String), // clientId (uuid)
        'tenant-001',
        undefined, // no user filter
      );
      expect(result).toBeDefined();
    });

    it('should filter by userId when userOnly=true', () => {
      const mockObservable = of({ data: 'test' }) as Observable<never>;
      service.createEventStream.mockReturnValue(mockObservable as never);

      controller.notificationsStream(mockRequest(), undefined, 'true');

      expect(service.createEventStream).toHaveBeenCalledWith(
        expect.any(String),
        'tenant-001',
        'user-001', // userId passed as filter
      );
    });

    it('should not filter by userId when userOnly is not true', () => {
      const mockObservable = of({ data: 'test' }) as Observable<never>;
      service.createEventStream.mockReturnValue(mockObservable as never);

      controller.notificationsStream(mockRequest(), undefined, 'false');

      expect(service.createEventStream).toHaveBeenCalledWith(
        expect.any(String),
        'tenant-001',
        undefined,
      );
    });

    it('should throw when user is not authenticated', () => {
      const reqNoUser = { user: { id: undefined, tenantId: undefined } } as never;

      expect(() => controller.notificationsStream(reqNoUser)).toThrow('User not authenticated');
    });
  });

  describe('personalNotificationsStream', () => {
    it('should create event stream filtered by userId', () => {
      const mockObservable = of({ data: 'test' }) as Observable<never>;
      service.createEventStream.mockReturnValue(mockObservable as never);

      const result = controller.personalNotificationsStream(mockRequest());

      expect(service.createEventStream).toHaveBeenCalledWith(
        expect.any(String),
        'tenant-001',
        'user-001', // always filtered by user
      );
      expect(result).toBeDefined();
    });

    it('should throw when user is not authenticated', () => {
      const reqNoUser = { user: { id: undefined, tenantId: undefined } } as never;

      expect(() => controller.personalNotificationsStream(reqNoUser)).toThrow(
        'User not authenticated',
      );
    });
  });
});
