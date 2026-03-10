import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { NotificationsService, NotificationPayload } from './notifications.service';
import { NotificationsGateway } from '../gateways/notifications.gateway';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let gateway: NotificationsGateway;
  let emailQueue: { add: jest.Mock };

  const mockTenantId = 'tenant-uuid-1';
  const mockUserId = 'user-uuid-1';

  beforeEach(async () => {
    emailQueue = { add: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: NotificationsGateway,
          useValue: {
            sendToUser: jest.fn(),
            broadcastToTenant: jest.fn(),
          },
        },
        {
          provide: getQueueToken('email-queue'),
          useValue: emailQueue,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    gateway = module.get<NotificationsGateway>(NotificationsGateway);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =========================================================================
  // sendNotification()
  // =========================================================================
  describe('sendNotification', () => {
    const mockPayload: NotificationPayload = {
      tenantId: mockTenantId,
      userId: mockUserId,
      type: 'booking_created',
      title: 'Nuova Prenotazione',
      message: 'Nuova prenotazione da Mario Rossi',
      data: { bookingId: 'booking-123' },
    };

    it('should send real-time notification via WebSocket', async () => {
      await service.sendNotification(mockPayload);

      expect(gateway.sendToUser).toHaveBeenCalledWith(
        mockUserId,
        'notification:new',
        expect.objectContaining({
          type: 'booking_created',
          title: 'Nuova Prenotazione',
          message: 'Nuova prenotazione da Mario Rossi',
          data: { bookingId: 'booking-123' },
          isRead: false,
          id: expect.any(String),
          timestamp: expect.any(String),
        }),
      );
    });

    it('should broadcast to tenant for dashboard updates', async () => {
      await service.sendNotification(mockPayload);

      expect(gateway.broadcastToTenant).toHaveBeenCalledWith(mockTenantId, 'tenant:update', {
        type: 'booking_created',
        data: { bookingId: 'booking-123' },
      });
    });

    it('should queue email when email data is provided', async () => {
      const payloadWithEmail: NotificationPayload = {
        ...mockPayload,
        email: {
          to: 'mario@example.com',
          subject: 'Booking Confirmed',
          template: 'booking-confirmation',
          variables: { customerName: 'Mario' },
        },
      };

      emailQueue.add.mockResolvedValue({ id: 'email-job-1' });

      await service.sendNotification(payloadWithEmail);

      expect(emailQueue.add).toHaveBeenCalledWith(
        'send-email',
        expect.objectContaining({
          tenantId: mockTenantId,
          userId: mockUserId,
          to: 'mario@example.com',
          subject: 'Booking Confirmed',
          template: 'booking-confirmation',
          variables: { customerName: 'Mario' },
        }),
        expect.objectContaining({
          jobId: expect.stringContaining('email-'),
        }),
      );
    });

    it('should not queue email when email data is absent', async () => {
      await service.sendNotification(mockPayload);

      expect(emailQueue.add).not.toHaveBeenCalled();
    });

    it('should include tenant isolation in WebSocket broadcast', async () => {
      await service.sendNotification(mockPayload);

      expect(gateway.broadcastToTenant).toHaveBeenCalledWith(
        mockTenantId,
        expect.any(String),
        expect.any(Object),
      );
    });

    it('should generate a unique notification ID', async () => {
      await service.sendNotification(mockPayload);
      await service.sendNotification(mockPayload);

      const firstId = (gateway.sendToUser as jest.Mock).mock.calls[0][2].id;
      const secondId = (gateway.sendToUser as jest.Mock).mock.calls[1][2].id;
      expect(firstId).not.toBe(secondId);
    });
  });

  // =========================================================================
  // enqueueEmail()
  // =========================================================================
  describe('enqueueEmail', () => {
    it('should add email to BullMQ queue', async () => {
      emailQueue.add.mockResolvedValue({ id: 'email-job-2' });

      await service.enqueueEmail({
        tenantId: mockTenantId,
        userId: mockUserId,
        to: 'mario@example.com',
        subject: 'Test email',
        template: 'test-template',
        variables: { name: 'Mario' },
      });

      expect(emailQueue.add).toHaveBeenCalledWith(
        'send-email',
        expect.objectContaining({
          tenantId: mockTenantId,
          to: 'mario@example.com',
          subject: 'Test email',
        }),
        expect.objectContaining({
          jobId: expect.stringContaining('email-'),
        }),
      );
    });

    it('should include tenantId in the queued email data', async () => {
      emailQueue.add.mockResolvedValue({ id: 'email-job-3' });

      await service.enqueueEmail({
        tenantId: mockTenantId,
        userId: mockUserId,
        to: 'mario@example.com',
        subject: 'Test',
        template: 'test',
        variables: {},
      });

      const queuedData = emailQueue.add.mock.calls[0][1];
      expect(queuedData.tenantId).toBe(mockTenantId);
    });
  });

  // =========================================================================
  // broadcastToMechanics()
  // =========================================================================
  describe('broadcastToMechanics', () => {
    it('should broadcast to mechanics in the tenant', async () => {
      await service.broadcastToMechanics(mockTenantId, {
        tenantId: mockTenantId,
        type: 'booking_updated',
        title: 'Work Order Assigned',
        message: 'New work order assigned to you',
        data: { workOrderId: 'wo-123' },
      });

      expect(gateway.broadcastToTenant).toHaveBeenCalledWith(
        mockTenantId,
        'mechanic:notification',
        expect.objectContaining({
          type: 'booking_updated',
          title: 'Work Order Assigned',
          timestamp: expect.any(String),
        }),
      );
    });

    it('should include timestamp in the broadcast', async () => {
      await service.broadcastToMechanics(mockTenantId, {
        tenantId: mockTenantId,
        type: 'inspection_completed',
        title: 'Inspection Done',
        message: 'Inspection completed',
      });

      const broadcastData = (gateway.broadcastToTenant as jest.Mock).mock.calls[0][2];
      expect(broadcastData.timestamp).toBeDefined();
    });
  });

  // =========================================================================
  // sendToTenant()
  // =========================================================================
  describe('sendToTenant', () => {
    it('should broadcast notification to entire tenant', async () => {
      await service.sendToTenant(mockTenantId, {
        title: 'System Update',
        body: 'Maintenance scheduled',
        priority: 'high',
        data: { maintenanceId: 'maint-001' },
      });

      expect(gateway.broadcastToTenant).toHaveBeenCalledWith(
        mockTenantId,
        'tenant:notification',
        expect.objectContaining({
          title: 'System Update',
          message: 'Maintenance scheduled',
          priority: 'high',
          data: { maintenanceId: 'maint-001' },
          isRead: false,
          id: expect.any(String),
          timestamp: expect.any(String),
        }),
      );
    });

    it('should use normal priority as default', async () => {
      await service.sendToTenant(mockTenantId, {
        title: 'Info',
        body: 'General info',
      });

      const broadcastData = (gateway.broadcastToTenant as jest.Mock).mock.calls[0][2];
      expect(broadcastData.priority).toBe('normal');
    });

    it('should include tenant ID in the broadcast call', async () => {
      await service.sendToTenant(mockTenantId, {
        title: 'Test',
        body: 'Test notification',
      });

      expect(gateway.broadcastToTenant).toHaveBeenCalledWith(
        mockTenantId,
        expect.any(String),
        expect.any(Object),
      );
    });
  });
});
