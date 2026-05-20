import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { SseService } from '../services/sse.service';
import { SseMessageEvent } from '../dto/notification-event.dto';
import { Request } from 'express';
import { Observable, Subject } from 'rxjs';

jest.mock('uuid', () => ({
  v4: () => 'mocked-uuid-1234',
}));

import { SseController } from './sse.controller';

type AuthenticatedRequest = Omit<Request, 'user'> & {
  user: { id: string; tenantId: string };
};

describe('SseController', () => {
  let controller: SseController;
  let sseService: jest.Mocked<SseService>;

  beforeEach(async () => {
    const mockSseService: jest.Mocked<Partial<SseService>> = {
      createEventStream: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SseController],
      providers: [{ provide: SseService, useValue: mockSseService }],
    }).compile();

    controller = module.get<SseController>(SseController);
    sseService = module.get(SseService) as jest.Mocked<SseService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('notificationsStream', () => {
    it('should return an Observable event stream when user is authenticated', () => {
      const mockStream = new Subject<SseMessageEvent>();
      sseService.createEventStream.mockReturnValueOnce(mockStream as Observable<SseMessageEvent>);

      const req = {
        user: { id: 'user-1', tenantId: 'tenant-1' },
      } as AuthenticatedRequest;

      const result = controller.notificationsStream(req);

      expect(result).toBeDefined();
      expect(sseService.createEventStream).toHaveBeenCalledWith(
        'mocked-uuid-1234',
        'tenant-1',
        undefined,
      );
    });

    it('should pass userId to sseService when userOnly=true', () => {
      const mockStream = new Subject<SseMessageEvent>();
      sseService.createEventStream.mockReturnValueOnce(mockStream as Observable<SseMessageEvent>);

      const req = {
        user: { id: 'user-2', tenantId: 'tenant-2' },
      } as AuthenticatedRequest;

      controller.notificationsStream(req, 'event-123', 'true');

      expect(sseService.createEventStream).toHaveBeenCalledWith(
        'mocked-uuid-1234',
        'tenant-2',
        'user-2',
      );
    });

    it('should pass undefined userId to sseService when userOnly is not true', () => {
      const mockStream = new Subject<SseMessageEvent>();
      sseService.createEventStream.mockReturnValueOnce(mockStream as Observable<SseMessageEvent>);

      const req = {
        user: { id: 'user-3', tenantId: 'tenant-3' },
      } as AuthenticatedRequest;

      controller.notificationsStream(req, undefined, 'false');

      expect(sseService.createEventStream).toHaveBeenCalledWith(
        'mocked-uuid-1234',
        'tenant-3',
        undefined,
      );
    });

    it('should throw UnauthorizedException when userId is missing', () => {
      const req = {
        user: { id: undefined, tenantId: 'tenant-4' },
      } as unknown as AuthenticatedRequest;

      expect(() => controller.notificationsStream(req)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when tenantId is missing', () => {
      const req = {
        user: { id: 'user-5', tenantId: undefined },
      } as unknown as AuthenticatedRequest;

      expect(() => controller.notificationsStream(req)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user object is missing', () => {
      const req = { user: undefined } as unknown as AuthenticatedRequest;

      expect(() => controller.notificationsStream(req)).toThrow(UnauthorizedException);
    });

    it('should handle lastEventId header parameter', () => {
      const mockStream = new Subject<SseMessageEvent>();
      sseService.createEventStream.mockReturnValueOnce(mockStream as Observable<SseMessageEvent>);

      const req = {
        user: { id: 'user-6', tenantId: 'tenant-6' },
      } as AuthenticatedRequest;

      controller.notificationsStream(req, 'event-999', undefined);

      expect(sseService.createEventStream).toHaveBeenCalledWith(
        'mocked-uuid-1234',
        'tenant-6',
        undefined,
      );
    });
  });

  describe('personalNotificationsStream', () => {
    it('should return an Observable event stream for personal notifications', () => {
      const mockStream = new Subject<SseMessageEvent>();
      sseService.createEventStream.mockReturnValueOnce(mockStream as Observable<SseMessageEvent>);

      const req = {
        user: { id: 'user-10', tenantId: 'tenant-10' },
      } as AuthenticatedRequest;

      const result = controller.personalNotificationsStream(req);

      expect(result).toBeDefined();
      expect(sseService.createEventStream).toHaveBeenCalledWith(
        'mocked-uuid-1234',
        'tenant-10',
        'user-10',
      );
    });

    it('should always pass userId to sseService regardless of parameters', () => {
      const mockStream = new Subject<SseMessageEvent>();
      sseService.createEventStream.mockReturnValueOnce(mockStream as Observable<SseMessageEvent>);

      const req = {
        user: { id: 'user-11', tenantId: 'tenant-11' },
      } as AuthenticatedRequest;

      controller.personalNotificationsStream(req, 'event-888');

      expect(sseService.createEventStream).toHaveBeenCalledWith(
        'mocked-uuid-1234',
        'tenant-11',
        'user-11',
      );
    });

    it('should throw UnauthorizedException when userId is missing', () => {
      const req = {
        user: { id: undefined, tenantId: 'tenant-12' },
      } as unknown as AuthenticatedRequest;

      expect(() => controller.personalNotificationsStream(req)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when tenantId is missing', () => {
      const req = {
        user: { id: 'user-13', tenantId: undefined },
      } as unknown as AuthenticatedRequest;

      expect(() => controller.personalNotificationsStream(req)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user object is missing', () => {
      const req = { user: undefined } as unknown as AuthenticatedRequest;

      expect(() => controller.personalNotificationsStream(req)).toThrow(UnauthorizedException);
    });

    it('should handle lastEventId header parameter', () => {
      const mockStream = new Subject<SseMessageEvent>();
      sseService.createEventStream.mockReturnValueOnce(mockStream as Observable<SseMessageEvent>);

      const req = {
        user: { id: 'user-14', tenantId: 'tenant-14' },
      } as AuthenticatedRequest;

      controller.personalNotificationsStream(req, 'event-777');

      expect(sseService.createEventStream).toHaveBeenCalled();
      expect(sseService.createEventStream).toHaveBeenCalledWith(
        'mocked-uuid-1234',
        'tenant-14',
        'user-14',
      );
    });

    it('should work correctly even when lastEventId is undefined', () => {
      const mockStream = new Subject<SseMessageEvent>();
      sseService.createEventStream.mockReturnValueOnce(mockStream as Observable<SseMessageEvent>);

      const req = {
        user: { id: 'user-15', tenantId: 'tenant-15' },
      } as AuthenticatedRequest;

      const result = controller.personalNotificationsStream(req);

      expect(result).toBeDefined();
      expect(sseService.createEventStream).toHaveBeenCalledWith(
        'mocked-uuid-1234',
        'tenant-15',
        'user-15',
      );
    });
  });
});
