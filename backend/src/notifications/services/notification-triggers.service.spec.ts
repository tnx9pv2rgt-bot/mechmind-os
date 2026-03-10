import { Test, TestingModule } from '@nestjs/testing';
import { NotificationTriggersService } from './notification-triggers.service';
import { NotificationV2Service } from './notification-v2.service';

// Mock Prisma enums and PrismaClient (needed because PrismaService extends PrismaClient)
jest.mock('@prisma/client', () => {
  class PrismaClient {
    $connect(): Promise<void> {
      return Promise.resolve();
    }
    $disconnect(): Promise<void> {
      return Promise.resolve();
    }
  }
  return {
    PrismaClient,
    NotificationType: {
      BOOKING_REMINDER: 'BOOKING_REMINDER',
      BOOKING_CONFIRMATION: 'BOOKING_CONFIRMATION',
      STATUS_UPDATE: 'STATUS_UPDATE',
      INVOICE_READY: 'INVOICE_READY',
      MAINTENANCE_DUE: 'MAINTENANCE_DUE',
      INSPECTION_COMPLETE: 'INSPECTION_COMPLETE',
      PAYMENT_REMINDER: 'PAYMENT_REMINDER',
    },
    NotificationChannel: {
      SMS: 'SMS',
      WHATSAPP: 'WHATSAPP',
      EMAIL: 'EMAIL',
    },
    NotificationStatus: {
      PENDING: 'PENDING',
      SENT: 'SENT',
      DELIVERED: 'DELIVERED',
      FAILED: 'FAILED',
    },
  };
});

describe('NotificationTriggersService', () => {
  let service: NotificationTriggersService;
  let notificationService: NotificationV2Service;

  const mockTenantId = 'tenant-uuid-1';
  const mockCustomerId = 'customer-uuid-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationTriggersService,
        {
          provide: NotificationV2Service,
          useValue: {
            sendImmediate: jest.fn().mockResolvedValue({
              success: true,
              notificationId: 'notif-123',
              messageId: 'SM-123',
            }),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationTriggersService>(NotificationTriggersService);
    notificationService = module.get<NotificationV2Service>(NotificationV2Service);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =========================================================================
  // onBookingCreated
  // =========================================================================
  describe('onBookingCreated', () => {
    it('should send booking confirmation notification', async () => {
      const event = {
        bookingId: 'booking-123',
        tenantId: mockTenantId,
        customerId: mockCustomerId,
        scheduledDate: new Date('2024-03-15T14:30:00Z'),
        source: 'web',
      };

      await service.onBookingCreated(event);

      expect(notificationService.sendImmediate).toHaveBeenCalledWith({
        customerId: mockCustomerId,
        tenantId: mockTenantId,
        type: 'BOOKING_CONFIRMATION',
        channel: 'SMS',
        metadata: expect.objectContaining({
          bookingId: 'booking-123',
          bookingCode: expect.any(String),
        }),
      });
    });

    it('should include formatted date and time in metadata', async () => {
      const event = {
        bookingId: 'booking-124',
        tenantId: mockTenantId,
        customerId: mockCustomerId,
        scheduledDate: new Date('2024-06-20T10:00:00Z'),
        source: 'api',
      };

      await service.onBookingCreated(event);

      const metadata = (notificationService.sendImmediate as jest.Mock).mock.calls[0][0].metadata;
      expect(metadata.date).toBeDefined();
      expect(metadata.time).toBeDefined();
    });

    it('should generate booking code from booking ID', async () => {
      const event = {
        bookingId: 'booking-abcdef123456',
        tenantId: mockTenantId,
        customerId: mockCustomerId,
        scheduledDate: new Date(),
        source: 'web',
      };

      await service.onBookingCreated(event);

      const metadata = (notificationService.sendImmediate as jest.Mock).mock.calls[0][0].metadata;
      expect(metadata.bookingCode).toHaveLength(6);
      expect(metadata.bookingCode).toBe('booking-abcdef123456'.slice(-6).toUpperCase());
    });

    it('should not throw when notification service fails', async () => {
      (notificationService.sendImmediate as jest.Mock).mockRejectedValue(
        new Error('Service failure'),
      );

      const event = {
        bookingId: 'booking-125',
        tenantId: mockTenantId,
        customerId: mockCustomerId,
        scheduledDate: new Date(),
        source: 'web',
      };

      // Should not throw, errors are caught internally
      await expect(service.onBookingCreated(event)).resolves.toBeUndefined();
    });

    it('should always include tenantId for isolation', async () => {
      const event = {
        bookingId: 'booking-126',
        tenantId: 'specific-tenant-xyz',
        customerId: mockCustomerId,
        scheduledDate: new Date(),
        source: 'web',
      };

      await service.onBookingCreated(event);

      expect(notificationService.sendImmediate).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'specific-tenant-xyz',
        }),
      );
    });
  });

  // =========================================================================
  // onBookingUpdated
  // =========================================================================
  describe('onBookingUpdated', () => {
    it('should send status update when status changes', async () => {
      const event = {
        bookingId: 'booking-200',
        tenantId: mockTenantId,
        customerId: mockCustomerId,
        changes: { status: 'CONFIRMED' },
      };

      await service.onBookingUpdated(event);

      expect(notificationService.sendImmediate).toHaveBeenCalledWith({
        customerId: mockCustomerId,
        tenantId: mockTenantId,
        type: 'STATUS_UPDATE',
        channel: 'SMS',
        metadata: expect.objectContaining({
          bookingId: 'booking-200',
          status: 'Confermato',
        }),
      });
    });

    it('should not send notification when status is not changed', async () => {
      const event = {
        bookingId: 'booking-201',
        tenantId: mockTenantId,
        customerId: mockCustomerId,
        changes: { notes: 'Updated notes' },
      };

      await service.onBookingUpdated(event);

      expect(notificationService.sendImmediate).not.toHaveBeenCalled();
    });

    it('should map status labels correctly', async () => {
      const statusMappings: Record<string, string> = {
        PENDING: 'In attesa',
        CONFIRMED: 'Confermato',
        IN_PROGRESS: 'In corso',
        COMPLETED: 'Completato',
        CANCELLED: 'Annullato',
        NO_SHOW: 'No show',
      };

      for (const [status, expectedLabel] of Object.entries(statusMappings)) {
        jest.clearAllMocks();

        await service.onBookingUpdated({
          bookingId: 'booking-map',
          tenantId: mockTenantId,
          customerId: mockCustomerId,
          changes: { status },
        });

        const metadata = (notificationService.sendImmediate as jest.Mock).mock.calls[0][0].metadata;
        expect(metadata.status).toBe(expectedLabel);
      }
    });

    it('should not throw when notification service fails', async () => {
      (notificationService.sendImmediate as jest.Mock).mockRejectedValue(new Error('Failed'));

      await expect(
        service.onBookingUpdated({
          bookingId: 'booking-err',
          tenantId: mockTenantId,
          customerId: mockCustomerId,
          changes: { status: 'CONFIRMED' },
        }),
      ).resolves.toBeUndefined();
    });
  });

  // =========================================================================
  // onBookingCancelled
  // =========================================================================
  describe('onBookingCancelled', () => {
    it('should send cancellation notification', async () => {
      const event = {
        bookingId: 'booking-300',
        tenantId: mockTenantId,
        customerId: mockCustomerId,
        reason: 'Customer request',
      };

      await service.onBookingCancelled(event);

      expect(notificationService.sendImmediate).toHaveBeenCalledWith({
        customerId: mockCustomerId,
        tenantId: mockTenantId,
        type: 'STATUS_UPDATE',
        channel: 'SMS',
        metadata: expect.objectContaining({
          bookingId: 'booking-300',
          status: 'Prenotazione annullata',
        }),
      });
    });

    it('should not throw on service failure', async () => {
      (notificationService.sendImmediate as jest.Mock).mockRejectedValue(new Error('Failed'));

      await expect(
        service.onBookingCancelled({
          bookingId: 'booking-301',
          tenantId: mockTenantId,
          customerId: mockCustomerId,
        }),
      ).resolves.toBeUndefined();
    });
  });

  // =========================================================================
  // onInspectionCompleted
  // =========================================================================
  describe('onInspectionCompleted', () => {
    it('should send inspection complete notification', async () => {
      const event = {
        inspectionId: 'insp-100',
        tenantId: mockTenantId,
        customerId: mockCustomerId,
        score: '8.5',
        findingsCount: 3,
      };

      await service.onInspectionCompleted(event);

      expect(notificationService.sendImmediate).toHaveBeenCalledWith({
        customerId: mockCustomerId,
        tenantId: mockTenantId,
        type: 'INSPECTION_COMPLETE',
        channel: 'SMS',
        metadata: expect.objectContaining({
          inspectionId: 'insp-100',
          score: '8.5',
          link: expect.stringContaining('insp-100'),
        }),
      });
    });

    it('should not throw on service failure', async () => {
      (notificationService.sendImmediate as jest.Mock).mockRejectedValue(new Error('Failed'));

      await expect(
        service.onInspectionCompleted({
          inspectionId: 'insp-101',
          tenantId: mockTenantId,
          customerId: mockCustomerId,
        }),
      ).resolves.toBeUndefined();
    });
  });

  // =========================================================================
  // onInspectionReadyForReview
  // =========================================================================
  describe('onInspectionReadyForReview', () => {
    it('should send inspection ready for review notification', async () => {
      const event = {
        inspectionId: 'insp-200',
        tenantId: mockTenantId,
        customerId: mockCustomerId,
      };

      await service.onInspectionReadyForReview(event);

      expect(notificationService.sendImmediate).toHaveBeenCalledWith({
        customerId: mockCustomerId,
        tenantId: mockTenantId,
        type: 'STATUS_UPDATE',
        channel: 'SMS',
        metadata: expect.objectContaining({
          inspectionId: 'insp-200',
          status: expect.stringContaining('Ispezione completata'),
        }),
      });
    });
  });

  // =========================================================================
  // onInvoiceGenerated
  // =========================================================================
  describe('onInvoiceGenerated', () => {
    it('should send invoice ready notification', async () => {
      const event = {
        invoiceId: 'inv-100',
        tenantId: mockTenantId,
        customerId: mockCustomerId,
        amount: 250.5,
        invoiceNumber: 'INV-2024-001',
      };

      await service.onInvoiceGenerated(event);

      expect(notificationService.sendImmediate).toHaveBeenCalledWith({
        customerId: mockCustomerId,
        tenantId: mockTenantId,
        type: 'INVOICE_READY',
        channel: 'SMS',
        metadata: expect.objectContaining({
          invoiceId: 'inv-100',
          invoiceNumber: 'INV-2024-001',
          amount: expect.stringContaining('250.50'),
        }),
      });
    });

    it('should not throw on service failure', async () => {
      (notificationService.sendImmediate as jest.Mock).mockRejectedValue(new Error('Failed'));

      await expect(
        service.onInvoiceGenerated({
          invoiceId: 'inv-101',
          tenantId: mockTenantId,
          customerId: mockCustomerId,
          amount: 100,
          invoiceNumber: 'INV-002',
        }),
      ).resolves.toBeUndefined();
    });
  });

  // =========================================================================
  // onPaymentDue
  // =========================================================================
  describe('onPaymentDue', () => {
    it('should send payment reminder notification', async () => {
      const event = {
        invoiceId: 'inv-200',
        tenantId: mockTenantId,
        customerId: mockCustomerId,
        amount: 500.0,
        dueDate: new Date('2024-04-01'),
      };

      await service.onPaymentDue(event);

      expect(notificationService.sendImmediate).toHaveBeenCalledWith({
        customerId: mockCustomerId,
        tenantId: mockTenantId,
        type: 'PAYMENT_REMINDER',
        channel: 'SMS',
        metadata: expect.objectContaining({
          invoiceId: 'inv-200',
          amount: expect.stringContaining('500.00'),
        }),
      });
    });
  });

  // =========================================================================
  // onMaintenanceDue
  // =========================================================================
  describe('onMaintenanceDue', () => {
    it('should send maintenance due notification', async () => {
      const event = {
        vehicleId: 'veh-100',
        tenantId: mockTenantId,
        customerId: mockCustomerId,
        serviceType: 'Cambio olio',
        daysUntilDue: 7,
      };

      await service.onMaintenanceDue(event);

      expect(notificationService.sendImmediate).toHaveBeenCalledWith({
        customerId: mockCustomerId,
        tenantId: mockTenantId,
        type: 'MAINTENANCE_DUE',
        channel: 'SMS',
        metadata: expect.objectContaining({
          vehicleId: 'veh-100',
          service: 'Cambio olio',
          days: 7,
        }),
      });
    });

    it('should not throw on service failure', async () => {
      (notificationService.sendImmediate as jest.Mock).mockRejectedValue(new Error('Failed'));

      await expect(
        service.onMaintenanceDue({
          vehicleId: 'veh-101',
          tenantId: mockTenantId,
          customerId: mockCustomerId,
          serviceType: 'Revisione',
          daysUntilDue: 14,
        }),
      ).resolves.toBeUndefined();
    });
  });

  // =========================================================================
  // Scheduled notification methods
  // =========================================================================
  describe('queueBookingReminders', () => {
    it('should return 0 (placeholder)', async () => {
      const result = await service.queueBookingReminders();
      expect(result).toBe(0);
    });
  });

  describe('queueMaintenanceReminders', () => {
    it('should return 0 (placeholder)', async () => {
      const result = await service.queueMaintenanceReminders();
      expect(result).toBe(0);
    });
  });

  // =========================================================================
  // Tenant isolation across all event handlers
  // =========================================================================
  describe('tenant isolation', () => {
    it('should pass tenantId for every notification sent', async () => {
      const events = [
        {
          handler: 'onBookingCreated',
          event: {
            bookingId: 'bk-iso-1',
            tenantId: 'tenant-A',
            customerId: mockCustomerId,
            scheduledDate: new Date(),
            source: 'web',
          },
        },
        {
          handler: 'onBookingCancelled',
          event: {
            bookingId: 'bk-iso-2',
            tenantId: 'tenant-B',
            customerId: mockCustomerId,
          },
        },
        {
          handler: 'onInspectionCompleted',
          event: {
            inspectionId: 'insp-iso-1',
            tenantId: 'tenant-C',
            customerId: mockCustomerId,
          },
        },
      ];

      for (const { handler, event } of events) {
        jest.clearAllMocks();
        await (service as Record<string, Function>)[handler](event);

        if ((notificationService.sendImmediate as jest.Mock).mock.calls.length > 0) {
          const sentDto = (notificationService.sendImmediate as jest.Mock).mock.calls[0][0];
          expect(sentDto.tenantId).toBe((event as Record<string, string>).tenantId);
        }
      }
    });
  });
});
