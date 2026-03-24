import { Test, TestingModule } from '@nestjs/testing';
import { NotificationTriggersService } from './notification-triggers.service';
import { NotificationV2Service } from './notification-v2.service';
import { PrismaService } from '../../common/services/prisma.service';

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
      IN_APP: 'IN_APP',
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
  let prisma: {
    booking: { findMany: jest.Mock };
    vehicle: { findMany: jest.Mock };
    invoice: { updateMany: jest.Mock };
    workOrder: { findMany: jest.Mock; update: jest.Mock };
  };

  const mockTenantId = 'tenant-uuid-1';
  const mockCustomerId = 'customer-uuid-1';

  beforeEach(async () => {
    prisma = {
      booking: { findMany: jest.fn().mockResolvedValue([]) },
      vehicle: { findMany: jest.fn().mockResolvedValue([]) },
      invoice: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      workOrder: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
      },
    };

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
        { provide: PrismaService, useValue: prisma },
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
          template: 'booking-confirmed',
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
  // CRON: sendBookingReminders
  // =========================================================================
  describe('sendBookingReminders', () => {
    it('should find tomorrow bookings and send SMS reminders', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      prisma.booking.findMany.mockResolvedValue([
        {
          id: 'bk-100',
          tenantId: mockTenantId,
          customerId: 'cust-001',
          scheduledDate: tomorrow,
        },
        {
          id: 'bk-101',
          tenantId: mockTenantId,
          customerId: 'cust-002',
          scheduledDate: tomorrow,
        },
      ]);

      const count = await service.sendBookingReminders();

      expect(count).toBe(2);
      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'CONFIRMED' }),
        }),
      );
      expect(notificationService.sendImmediate).toHaveBeenCalledTimes(2);
    });

    it('should return 0 when no bookings found', async () => {
      prisma.booking.findMany.mockResolvedValue([]);

      const count = await service.sendBookingReminders();

      expect(count).toBe(0);
      expect(notificationService.sendImmediate).not.toHaveBeenCalled();
    });

    it('should continue sending even if one fails', async () => {
      prisma.booking.findMany.mockResolvedValue([
        { id: 'bk-1', tenantId: mockTenantId, customerId: 'c1', scheduledDate: new Date() },
        { id: 'bk-2', tenantId: mockTenantId, customerId: 'c2', scheduledDate: new Date() },
      ]);
      (notificationService.sendImmediate as jest.Mock)
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce(undefined);

      const count = await service.sendBookingReminders();

      expect(count).toBe(1);
      expect(notificationService.sendImmediate).toHaveBeenCalledTimes(2);
    });
  });

  // =========================================================================
  // CRON: sendMaintenanceReminders
  // =========================================================================
  describe('sendMaintenanceReminders', () => {
    it('should find vehicles needing maintenance and send reminders', async () => {
      prisma.vehicle.findMany.mockResolvedValue([
        {
          id: 'veh-001',
          customerId: 'cust-001',
          make: 'Fiat',
          model: '500',
          workOrders: [{ tenantId: mockTenantId }],
        },
      ]);

      const count = await service.sendMaintenanceReminders();

      expect(count).toBe(1);
      expect(prisma.vehicle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'ACTIVE' }),
        }),
      );
      expect(notificationService.sendImmediate).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            vehicleName: 'Fiat 500',
            template: 'maintenance-due',
          }),
        }),
      );
    });

    it('should return 0 when no vehicles need maintenance', async () => {
      prisma.vehicle.findMany.mockResolvedValue([]);

      const count = await service.sendMaintenanceReminders();

      expect(count).toBe(0);
      expect(notificationService.sendImmediate).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // New event handlers
  // =========================================================================
  describe('onVehicleCheckedIn', () => {
    it('should send vehicle check-in notification', async () => {
      await service.onVehicleCheckedIn({
        workOrderId: 'wo-001',
        tenantId: mockTenantId,
        customerId: mockCustomerId,
        vehiclePlate: 'AB123CD',
      });

      expect(notificationService.sendImmediate).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            template: 'vehicle-checked-in',
            vehiclePlate: 'AB123CD',
          }),
        }),
      );
    });
  });

  describe('onEstimateSent', () => {
    it('should send estimate notification via email', async () => {
      await service.onEstimateSent({
        estimateId: 'est-001',
        tenantId: mockTenantId,
        customerId: mockCustomerId,
        estimateNumber: 'EST-2026-0001',
        totalCents: 15000,
      });

      expect(notificationService.sendImmediate).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            template: 'estimate-sent',
            amount: '€150.00',
          }),
        }),
      );
    });
  });

  describe('onWorkOrderStatusChanged', () => {
    it('should send in-app notification for WO status change', async () => {
      await service.onWorkOrderStatusChanged({
        workOrderId: 'wo-001',
        tenantId: mockTenantId,
        customerId: mockCustomerId,
        status: 'IN_PROGRESS',
      });

      expect(notificationService.sendImmediate).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'IN_APP',
          metadata: expect.objectContaining({
            template: 'wo-status-changed',
            status: 'In corso',
          }),
        }),
      );
    });
  });

  describe('onPartsArrived', () => {
    it('should send parts arrived notification', async () => {
      await service.onPartsArrived({
        workOrderId: 'wo-001',
        tenantId: mockTenantId,
        customerId: mockCustomerId,
        partNames: ['Filtro olio', 'Candela'],
      });

      expect(notificationService.sendImmediate).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            template: 'parts-arrived',
            parts: 'Filtro olio, Candela',
          }),
        }),
      );
    });
  });

  describe('onPaymentReceived', () => {
    it('should send payment received notification', async () => {
      await service.onPaymentReceived({
        invoiceId: 'inv-001',
        tenantId: mockTenantId,
        customerId: mockCustomerId,
        amount: 350,
        invoiceNumber: 'INV-2026-0001',
      });

      expect(notificationService.sendImmediate).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'EMAIL',
          metadata: expect.objectContaining({
            template: 'payment-received',
            amount: '€350.00',
          }),
        }),
      );
    });
  });

  // =========================================================================
  // CRON: markOverdueInvoices
  // =========================================================================
  describe('markOverdueInvoices', () => {
    it('should mark SENT invoices past due date as OVERDUE', async () => {
      prisma.invoice.updateMany.mockResolvedValue({ count: 3 });

      const count = await service.markOverdueInvoices();

      expect(count).toBe(3);
      expect(prisma.invoice.updateMany).toHaveBeenCalledWith({
        where: {
          status: 'SENT',
          dueDate: { lt: expect.any(Date) },
        },
        data: {
          status: 'OVERDUE',
        },
      });
    });

    it('should not mark non-SENT invoices', async () => {
      prisma.invoice.updateMany.mockResolvedValue({ count: 0 });

      const count = await service.markOverdueInvoices();

      expect(count).toBe(0);
      // Verify the query only targets SENT status
      expect(prisma.invoice.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'SENT' }),
        }),
      );
    });

    it('should return 0 when cron fails', async () => {
      prisma.invoice.updateMany.mockRejectedValue(new Error('DB error'));

      const count = await service.markOverdueInvoices();

      expect(count).toBe(0);
    });
  });

  // =========================================================================
  // CRON: sendWarrantyExpiringReminders
  // =========================================================================
  describe('sendWarrantyExpiringReminders', () => {
    it('should send warranty reminders for WOs completed ~1 year ago', async () => {
      prisma.workOrder.findMany.mockResolvedValue([
        {
          id: 'wo-100',
          tenantId: mockTenantId,
          customerId: 'cust-001',
          woNumber: 'WO-2025-001',
        },
        {
          id: 'wo-101',
          tenantId: mockTenantId,
          customerId: 'cust-002',
          woNumber: 'WO-2025-002',
        },
      ]);

      const count = await service.sendWarrantyExpiringReminders();

      expect(count).toBe(2);
      expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'COMPLETED',
            actualCompletionTime: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          }),
        }),
      );
      expect(notificationService.sendImmediate).toHaveBeenCalledTimes(2);
      expect(notificationService.sendImmediate).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'EMAIL',
          metadata: expect.objectContaining({
            template: 'warranty-expiring',
            subject: 'Garanzia in scadenza',
          }),
        }),
      );
    });

    it('should return count of reminders sent', async () => {
      prisma.workOrder.findMany.mockResolvedValue([
        {
          id: 'wo-200',
          tenantId: mockTenantId,
          customerId: 'cust-010',
          woNumber: 'WO-2025-010',
        },
      ]);

      const count = await service.sendWarrantyExpiringReminders();

      expect(count).toBe(1);
    });

    it('should return 0 when no work orders match', async () => {
      prisma.workOrder.findMany.mockResolvedValue([]);

      const count = await service.sendWarrantyExpiringReminders();

      expect(count).toBe(0);
      expect(notificationService.sendImmediate).not.toHaveBeenCalled();
    });

    it('should skip work orders without customerId', async () => {
      prisma.workOrder.findMany.mockResolvedValue([
        {
          id: 'wo-300',
          tenantId: mockTenantId,
          customerId: null,
          woNumber: 'WO-2025-020',
        },
      ]);

      const count = await service.sendWarrantyExpiringReminders();

      expect(count).toBe(0);
      expect(notificationService.sendImmediate).not.toHaveBeenCalled();
    });

    it('should continue sending even if one fails', async () => {
      prisma.workOrder.findMany.mockResolvedValue([
        { id: 'wo-400', tenantId: mockTenantId, customerId: 'c1', woNumber: 'WO-1' },
        { id: 'wo-401', tenantId: mockTenantId, customerId: 'c2', woNumber: 'WO-2' },
      ]);
      (notificationService.sendImmediate as jest.Mock)
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce(undefined);

      const count = await service.sendWarrantyExpiringReminders();

      expect(count).toBe(1);
      expect(notificationService.sendImmediate).toHaveBeenCalledTimes(2);
    });
  });

  // =========================================================================
  // CRON: sendReviewRequests
  // =========================================================================
  describe('sendReviewRequests', () => {
    it('should find delivered WOs from yesterday and send review SMS', async () => {
      prisma.workOrder.findMany.mockResolvedValue([
        {
          id: 'wo-rev-001',
          tenantId: mockTenantId,
          customerId: 'cust-mario',
        },
        {
          id: 'wo-rev-002',
          tenantId: mockTenantId,
          customerId: 'cust-luigi',
        },
      ]);

      const count = await service.sendReviewRequests();

      expect(count).toBe(2);
      expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'COMPLETED',
            reviewRequestSentAt: null,
          }),
        }),
      );
      expect(notificationService.sendImmediate).toHaveBeenCalledTimes(2);
      expect(notificationService.sendImmediate).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'SMS',
          metadata: expect.objectContaining({
            template: 'review-request',
            subject: 'Come ti sei trovato? Lascia una recensione',
            reviewLink: expect.stringContaining('review/'),
          }),
        }),
      );
    });

    it('should update reviewRequestSentAt after sending', async () => {
      prisma.workOrder.findMany.mockResolvedValue([
        {
          id: 'wo-rev-010',
          tenantId: mockTenantId,
          customerId: 'cust-rossi',
        },
      ]);

      await service.sendReviewRequests();

      expect(prisma.workOrder.update).toHaveBeenCalledWith({
        where: { id: 'wo-rev-010' },
        data: { reviewRequestSentAt: expect.any(Date) },
      });
    });

    it('should return 0 when no delivered WOs found', async () => {
      prisma.workOrder.findMany.mockResolvedValue([]);

      const count = await service.sendReviewRequests();

      expect(count).toBe(0);
      expect(notificationService.sendImmediate).not.toHaveBeenCalled();
    });

    it('should skip WOs without customerId', async () => {
      prisma.workOrder.findMany.mockResolvedValue([
        {
          id: 'wo-rev-020',
          tenantId: mockTenantId,
          customerId: null,
        },
      ]);

      const count = await service.sendReviewRequests();

      expect(count).toBe(0);
      expect(notificationService.sendImmediate).not.toHaveBeenCalled();
    });

    it('should continue sending even if one fails', async () => {
      prisma.workOrder.findMany.mockResolvedValue([
        { id: 'wo-rev-030', tenantId: mockTenantId, customerId: 'c1' },
        { id: 'wo-rev-031', tenantId: mockTenantId, customerId: 'c2' },
      ]);
      (notificationService.sendImmediate as jest.Mock)
        .mockRejectedValueOnce(new Error('SMS provider down'))
        .mockResolvedValueOnce(undefined);

      const count = await service.sendReviewRequests();

      expect(count).toBe(1);
      expect(notificationService.sendImmediate).toHaveBeenCalledTimes(2);
    });

    it('should return 0 when the cron itself fails', async () => {
      prisma.workOrder.findMany.mockRejectedValue(new Error('DB error'));

      const count = await service.sendReviewRequests();

      expect(count).toBe(0);
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
        await (service as unknown as Record<string, (...args: unknown[]) => Promise<void>>)[
          handler
        ](event);

        if ((notificationService.sendImmediate as jest.Mock).mock.calls.length > 0) {
          const sentDto = (notificationService.sendImmediate as jest.Mock).mock.calls[0][0];
          expect(sentDto.tenantId).toBe((event as unknown as Record<string, string>).tenantId);
        }
      }
    });
  });
});
