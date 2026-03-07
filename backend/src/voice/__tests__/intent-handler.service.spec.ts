import { Test, TestingModule } from '@nestjs/testing';
import { IntentHandlerService, BookingResult } from '../services/intent-handler.service';
import { PrismaService } from '@common/services/prisma.service';
import { QueueService } from '@common/services/queue.service';
import { LoggerService } from '@common/services/logger.service';
import { CustomerService } from '@customer/services/customer.service';
import { BookingService } from '@booking/services/booking.service';
import { ExtractedDataDto } from '../dto/vapi-webhook.dto';

describe('IntentHandlerService', () => {
  let service: IntentHandlerService;
  let prisma: jest.Mocked<PrismaService>;
  let queueService: jest.Mocked<QueueService>;
  let loggerService: jest.Mocked<LoggerService>;
  let customerService: jest.Mocked<CustomerService>;
  let bookingService: jest.Mocked<BookingService>;

  const mockPrisma = {
    vehicle: {
      findFirst: jest.fn(),
    },
    service: {
      findFirst: jest.fn(),
    },
    bookingSlot: {
      findMany: jest.fn(),
    },
    booking: {
      findMany: jest.fn(),
    },
  };

  const mockQueueService = {
    addBookingJob: jest.fn(),
    addNotificationJob: jest.fn(),
    addVoiceJob: jest.fn(),
  };

  const mockLoggerService = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  const mockCustomerService = {
    findByPhone: jest.fn(),
    createFromVoiceCall: jest.fn(),
  };

  const mockBookingService = {
    createBooking: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntentHandlerService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: QueueService,
          useValue: mockQueueService,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
        {
          provide: CustomerService,
          useValue: mockCustomerService,
        },
        {
          provide: BookingService,
          useValue: mockBookingService,
        },
      ],
    }).compile();

    service = module.get<IntentHandlerService>(IntentHandlerService);
    prisma = module.get(PrismaService);
    queueService = module.get(QueueService);
    loggerService = module.get(LoggerService);
    customerService = module.get(CustomerService);
    bookingService = module.get(BookingService);
  });

  describe('constructor', () => {
    it('should create service instance', () => {
      expect(service).toBeDefined();
    });
  });

  describe('handleBookingIntent', () => {
    const tenantId = '550e8400-e29b-41d4-a716-446655440000';
    const customerPhone = '+390123456789';
    const vapiCallId = 'call_abc123xyz';

    it('should create booking for existing customer', async () => {
      const extractedData: ExtractedDataDto = {
        preferredDate: '2024-01-15',
        preferredTime: '09:00',
        serviceType: 'Tagliando',
        licensePlate: 'AB123CD',
      };

      const existingCustomer: any = {
        id: 'customer-123',
        phone: customerPhone,
        firstName: 'Mario',
        lastName: 'Rossi',
      };

      const availableSlot = {
        id: 'slot-123',
        startTime: new Date('2024-01-15T09:00:00'),
        endTime: new Date('2024-01-15T10:00:00'),
      };

      const vehicle = {
        id: 'vehicle-123',
        licensePlate: 'AB123CD',
        customerId: 'customer-123',
      };

      const serviceData: any = {
        id: 'service-123',
        name: 'Tagliando',
      };

      const booking = {
        id: 'booking-123',
        status: 'CONFIRMED',
      };

      mockCustomerService.findByPhone.mockResolvedValue(existingCustomer as any);
      mockPrisma.bookingSlot.findMany.mockResolvedValue([availableSlot]);
      mockPrisma.vehicle.findFirst.mockResolvedValue(vehicle);
      mockPrisma.service.findFirst.mockResolvedValue(serviceData);
      mockBookingService.createBooking.mockResolvedValue(booking);
      mockQueueService.addNotificationJob.mockResolvedValue({ id: 'job-123' } as any);

      const result = await service.handleBookingIntent(
        tenantId,
        customerPhone,
        extractedData,
        vapiCallId,
      );

      expect(result.success).toBe(true);
      expect(result.bookingId).toBe('booking-123');
      expect(customerService.findByPhone).toHaveBeenCalledWith(tenantId, customerPhone);
      expect(customerService.createFromVoiceCall).not.toHaveBeenCalled();
      expect(bookingService.createBooking).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          customerId: 'customer-123',
          vehicleId: 'vehicle-123',
          slotId: 'slot-123',
          serviceIds: ['service-123'],
          source: 'VOICE',
          vapiCallId,
        }),
      );
    });

    it('should create customer and booking for new customer', async () => {
      const extractedData: ExtractedDataDto = {
        preferredDate: '2024-01-15',
        preferredTime: '14:00',
        serviceType: 'Revisione',
      };

      const newCustomer = {
        id: 'customer-new',
        phone: customerPhone,
      };

      const availableSlot = {
        id: 'slot-456',
        startTime: new Date('2024-01-15T14:00:00'),
        endTime: new Date('2024-01-15T15:00:00'),
      };

      const booking = {
        id: 'booking-456',
        status: 'CONFIRMED',
      };

      mockCustomerService.findByPhone.mockResolvedValue(null);
      mockCustomerService.createFromVoiceCall.mockResolvedValue(newCustomer as any);
      mockPrisma.bookingSlot.findMany.mockResolvedValue([availableSlot]);
      mockPrisma.vehicle.findFirst.mockResolvedValue(null);
      mockPrisma.service.findFirst.mockResolvedValue(null);
      mockBookingService.createBooking.mockResolvedValue(booking);
      mockQueueService.addNotificationJob.mockResolvedValue({ id: 'job-456' } as any);

      const result = await service.handleBookingIntent(
        tenantId,
        customerPhone,
        extractedData,
        vapiCallId,
      );

      expect(result.success).toBe(true);
      expect(customerService.createFromVoiceCall).toHaveBeenCalledWith(
        tenantId,
        customerPhone,
        extractedData,
      );
    });

    it('should queue for callback when no slots available', async () => {
      const extractedData: ExtractedDataDto = {
        preferredDate: '2024-01-15',
        preferredTime: '09:00',
        serviceType: 'Cambio gomme',
      };

      const existingCustomer = {
        id: 'customer-123',
        phone: customerPhone,
      };

      mockCustomerService.findByPhone.mockResolvedValue(existingCustomer as any);
      mockPrisma.bookingSlot.findMany.mockResolvedValue([]);
      mockQueueService.addBookingJob.mockResolvedValue({ id: 'job-789' } as any);

      const result = await service.handleBookingIntent(
        tenantId,
        customerPhone,
        extractedData,
        vapiCallId,
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('No slots available, queued for callback');
      expect(queueService.addBookingJob).toHaveBeenCalledWith(
        'schedule-callback',
        expect.objectContaining({
          type: 'schedule-callback',
          payload: expect.objectContaining({
            customerId: 'customer-123',
            preferredDate: extractedData.preferredDate,
            preferredTime: extractedData.preferredTime,
            serviceType: extractedData.serviceType,
          }),
          tenantId,
        }),
      );
    });

    it('should find nearest available slot', async () => {
      const extractedData: ExtractedDataDto = {
        preferredDate: '2024-01-15',
        preferredTime: '10:00',
        serviceType: 'Tagliando',
      };

      const existingCustomer = {
        id: 'customer-123',
        phone: customerPhone,
      };

      const slots = [
        { id: 'slot-1', startTime: new Date('2024-01-15T09:00:00') },
        { id: 'slot-2', startTime: new Date('2024-01-15T09:30:00') },
        { id: 'slot-3', startTime: new Date('2024-01-15T10:30:00') },
        { id: 'slot-4', startTime: new Date('2024-01-15T11:00:00') },
      ];

      mockCustomerService.findByPhone.mockResolvedValue(existingCustomer as any);
      mockPrisma.bookingSlot.findMany.mockResolvedValue(slots);
      mockPrisma.vehicle.findFirst.mockResolvedValue(null);
      mockPrisma.service.findFirst.mockResolvedValue(null);
      mockBookingService.createBooking.mockResolvedValue({ id: 'booking-789' });
      mockQueueService.addNotificationJob.mockResolvedValue({ id: 'job-789' } as any);

      const result = await service.handleBookingIntent(
        tenantId,
        customerPhone,
        extractedData,
        vapiCallId,
      );

      expect(result.success).toBe(true);
      // Should pick slot-2 (09:30) or slot-3 (10:30) as both are 30 min from 10:00
      // (implementation picks first one with minimum difference)
      const callArg = mockBookingService.createBooking.mock.calls[0][1];
      expect(['slot-2', 'slot-3']).toContain(callArg.slotId);
    });

    it('should handle error during booking creation', async () => {
      const extractedData: ExtractedDataDto = {
        preferredDate: '2024-01-15',
        preferredTime: '09:00',
      };

      mockCustomerService.findByPhone.mockRejectedValue(new Error('Database error'));

      const result = await service.handleBookingIntent(
        tenantId,
        customerPhone,
        extractedData,
        vapiCallId,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });

    it('should search for vehicle by license plate', async () => {
      const extractedData: ExtractedDataDto = {
        preferredDate: '2024-01-15',
        preferredTime: '09:00',
        licensePlate: 'xy987zy',
      };

      const existingCustomer = { id: 'customer-123' };
      const vehicle = { id: 'vehicle-123', licensePlate: 'XY987ZY' };

      mockCustomerService.findByPhone.mockResolvedValue(existingCustomer as any);
      mockPrisma.bookingSlot.findMany.mockResolvedValue([
        { id: 'slot-123', startTime: new Date('2024-01-15T09:00:00') },
      ]);
      mockPrisma.vehicle.findFirst.mockResolvedValue(vehicle);
      mockPrisma.service.findFirst.mockResolvedValue(null);
      mockBookingService.createBooking.mockResolvedValue({ id: 'booking-123' });
      mockQueueService.addNotificationJob.mockResolvedValue({ id: 'job-123' } as any);

      await service.handleBookingIntent(tenantId, customerPhone, extractedData, vapiCallId);

      expect(mockPrisma.vehicle.findFirst).toHaveBeenCalledWith({
        where: {
          licensePlate: 'XY987ZY', // Should be uppercase
          customerId: 'customer-123',
        },
      });
    });

    it('should search for service by type', async () => {
      const extractedData: ExtractedDataDto = {
        preferredDate: '2024-01-15',
        preferredTime: '09:00',
        serviceType: 'Tagliando',
      };

      const existingCustomer = { id: 'customer-123' };
      const serviceData: any = { id: 'service-123', name: 'Tagliando completo' };

      mockCustomerService.findByPhone.mockResolvedValue(existingCustomer as any);
      mockPrisma.bookingSlot.findMany.mockResolvedValue([
        { id: 'slot-123', startTime: new Date('2024-01-15T09:00:00') },
      ]);
      mockPrisma.vehicle.findFirst.mockResolvedValue(null);
      mockPrisma.service.findFirst.mockResolvedValue(serviceData);
      mockBookingService.createBooking.mockResolvedValue({ id: 'booking-123' });
      mockQueueService.addNotificationJob.mockResolvedValue({ id: 'job-123' } as any);

      await service.handleBookingIntent(tenantId, customerPhone, extractedData, vapiCallId);

      expect(mockPrisma.service.findFirst).toHaveBeenCalledWith({
        where: {
          tenantId,
          name: {
            contains: 'Tagliando',
            mode: 'insensitive',
          },
        },
      });
    });

    it('should include issue description in notes', async () => {
      const extractedData: ExtractedDataDto = {
        preferredDate: '2024-01-15',
        preferredTime: '09:00',
        issueDescription: 'Strano rumore nel motore',
      };

      const existingCustomer = { id: 'customer-123' };

      mockCustomerService.findByPhone.mockResolvedValue(existingCustomer as any);
      mockPrisma.bookingSlot.findMany.mockResolvedValue([
        { id: 'slot-123', startTime: new Date('2024-01-15T09:00:00') },
      ]);
      mockPrisma.vehicle.findFirst.mockResolvedValue(null);
      mockPrisma.service.findFirst.mockResolvedValue(null);
      mockBookingService.createBooking.mockResolvedValue({ id: 'booking-123' });
      mockQueueService.addNotificationJob.mockResolvedValue({ id: 'job-123' } as any);

      await service.handleBookingIntent(tenantId, customerPhone, extractedData, vapiCallId);

      expect(bookingService.createBooking).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          notes: 'Strano rumore nel motore',
        }),
      );
    });

    describe('Vehicle Issue Keywords', () => {
      it('should handle "revisione" service type', async () => {
        const extractedData: ExtractedDataDto = {
          preferredDate: '2024-01-15',
          preferredTime: '09:00',
          serviceType: 'revisione',
        };

        const existingCustomer = { id: 'customer-123' };

        mockCustomerService.findByPhone.mockResolvedValue(existingCustomer as any);
        mockPrisma.bookingSlot.findMany.mockResolvedValue([
          { id: 'slot-123', startTime: new Date('2024-01-15T09:00:00') },
        ]);
        mockPrisma.vehicle.findFirst.mockResolvedValue(null);
        mockPrisma.service.findFirst.mockResolvedValue(null);
        mockBookingService.createBooking.mockResolvedValue({ id: 'booking-123' });
        mockQueueService.addNotificationJob.mockResolvedValue({ id: 'job-123' } as any);

        const result = await service.handleBookingIntent(
          tenantId,
          customerPhone,
          extractedData,
          vapiCallId,
        );

        expect(result.success).toBe(true);
      });

      it('should handle "tagliando" service type', async () => {
        const extractedData: ExtractedDataDto = {
          preferredDate: '2024-01-15',
          preferredTime: '10:00',
          serviceType: 'tagliando',
        };

        const existingCustomer = { id: 'customer-123' };

        mockCustomerService.findByPhone.mockResolvedValue(existingCustomer as any);
        mockPrisma.bookingSlot.findMany.mockResolvedValue([
          { id: 'slot-123', startTime: new Date('2024-01-15T10:00:00') },
        ]);
        mockPrisma.vehicle.findFirst.mockResolvedValue(null);
        mockPrisma.service.findFirst.mockResolvedValue(null);
        mockBookingService.createBooking.mockResolvedValue({ id: 'booking-123' });
        mockQueueService.addNotificationJob.mockResolvedValue({ id: 'job-123' } as any);

        const result = await service.handleBookingIntent(
          tenantId,
          customerPhone,
          extractedData,
          vapiCallId,
        );

        expect(result.success).toBe(true);
      });

      it('should handle "cambio gomme" service type', async () => {
        const extractedData: ExtractedDataDto = {
          preferredDate: '2024-01-15',
          preferredTime: '11:00',
          serviceType: 'cambio gomme',
        };

        const existingCustomer = { id: 'customer-123' };

        mockCustomerService.findByPhone.mockResolvedValue(existingCustomer as any);
        mockPrisma.bookingSlot.findMany.mockResolvedValue([
          { id: 'slot-123', startTime: new Date('2024-01-15T11:00:00') },
        ]);
        mockPrisma.vehicle.findFirst.mockResolvedValue(null);
        mockPrisma.service.findFirst.mockResolvedValue(null);
        mockBookingService.createBooking.mockResolvedValue({ id: 'booking-123' });
        mockQueueService.addNotificationJob.mockResolvedValue({ id: 'job-123' } as any);

        const result = await service.handleBookingIntent(
          tenantId,
          customerPhone,
          extractedData,
          vapiCallId,
        );

        expect(result.success).toBe(true);
      });
    });
  });

  describe('handleStatusCheckIntent', () => {
    const tenantId = '550e8400-e29b-41d4-a716-446655440000';
    const customerPhone = '+390123456789';

    it('should send status update for existing customer with bookings', async () => {
      const extractedData: ExtractedDataDto = {
        licensePlate: 'AB123CD',
      };

      const customer = { id: 'customer-123', phone: customerPhone };
      const bookings = [
        {
          id: 'booking-1',
          status: 'IN_PROGRESS',
          scheduledDate: new Date('2024-01-15'),
          services: [{ service: { name: 'Tagliando' } }],
          slot: { startTime: new Date('2024-01-15T09:00:00') },
        },
        {
          id: 'booking-2',
          status: 'CONFIRMED',
          scheduledDate: new Date('2024-01-20'),
          services: [{ service: { name: 'Revisione' } }],
          slot: { startTime: new Date('2024-01-20T10:00:00') },
        },
      ];

      mockCustomerService.findByPhone.mockResolvedValue(customer as any);
      mockPrisma.booking.findMany.mockResolvedValue(bookings as any);
      mockQueueService.addNotificationJob.mockResolvedValue({ id: 'job-123' } as any);

      await service.handleStatusCheckIntent(tenantId, customerPhone, extractedData);

      expect(customerService.findByPhone).toHaveBeenCalledWith(tenantId, customerPhone);
      expect(prisma.booking.findMany).toHaveBeenCalledWith({
        where: {
          customerId: customer.id,
          tenantId,
        },
        orderBy: { scheduledDate: 'desc' },
        take: 3,
        include: {
          services: {
            include: {
              service: true,
            },
          },
          slot: true,
        },
      });
      expect(queueService.addNotificationJob).toHaveBeenCalledWith(
        'send-status-update',
        expect.objectContaining({
          type: 'status-update',
          payload: expect.objectContaining({
            customerId: customer.id,
            bookings: expect.arrayContaining([
              expect.objectContaining({
                id: 'booking-1',
                status: 'IN_PROGRESS',
                services: ['Tagliando'],
              }),
            ]),
          }),
          tenantId,
        }),
      );
    });

    it('should return early if customer not found', async () => {
      const extractedData: ExtractedDataDto = {};

      mockCustomerService.findByPhone.mockResolvedValue(null);

      await service.handleStatusCheckIntent(tenantId, customerPhone, extractedData);

      expect(prisma.booking.findMany).not.toHaveBeenCalled();
      expect(queueService.addNotificationJob).not.toHaveBeenCalled();
    });

    it('should handle customer with no bookings', async () => {
      const extractedData: ExtractedDataDto = {};

      const customer = { id: 'customer-123', phone: customerPhone };

      mockCustomerService.findByPhone.mockResolvedValue(customer as any);
      mockPrisma.booking.findMany.mockResolvedValue([]);
      mockQueueService.addNotificationJob.mockResolvedValue({ id: 'job-123' } as any);

      await service.handleStatusCheckIntent(tenantId, customerPhone, extractedData);

      expect(queueService.addNotificationJob).toHaveBeenCalledWith(
        'send-status-update',
        expect.objectContaining({
          payload: expect.objectContaining({
            bookings: [],
          }),
        }),
      );
    });
  });

  describe('handleComplaintIntent', () => {
    const tenantId = '550e8400-e29b-41d4-a716-446655440000';
    const customerPhone = '+390123456789';

    it('should queue complaint for manager review with existing customer', async () => {
      const transcript = 'I am very unhappy with the service I received';
      const extractedData: ExtractedDataDto = {
        issueDescription: 'Oil change was not done properly',
        licensePlate: 'AB123CD',
      };

      const customer = { id: 'customer-123', phone: customerPhone };

      mockCustomerService.findByPhone.mockResolvedValue(customer as any);
      mockQueueService.addVoiceJob.mockResolvedValue({ id: 'job-123' } as any);
      mockQueueService.addNotificationJob.mockResolvedValue({ id: 'job-456' } as any);

      await service.handleComplaintIntent(tenantId, customerPhone, transcript, extractedData);

      expect(queueService.addVoiceJob).toHaveBeenCalledWith(
        'complaint-review',
        expect.objectContaining({
          type: 'complaint-review',
          payload: expect.objectContaining({
            customerId: customer.id,
            customerPhone,
            transcript,
            issueDescription: extractedData.issueDescription,
            licensePlate: extractedData.licensePlate,
          }),
          tenantId,
        }),
      );
      expect(queueService.addNotificationJob).toHaveBeenCalledWith(
        'send-complaint-acknowledgment',
        expect.objectContaining({
          type: 'complaint-acknowledgment',
          payload: { customerId: customer.id },
          tenantId,
        }),
      );
    });

    it('should queue complaint without acknowledgment for unknown customer', async () => {
      const transcript = 'I have a complaint about your service';
      const extractedData: ExtractedDataDto = {
        issueDescription: 'Poor customer service',
      };

      mockCustomerService.findByPhone.mockResolvedValue(null);
      mockQueueService.addVoiceJob.mockResolvedValue({ id: 'job-123' } as any);

      await service.handleComplaintIntent(tenantId, customerPhone, transcript, extractedData);

      expect(queueService.addVoiceJob).toHaveBeenCalledWith(
        'complaint-review',
        expect.objectContaining({
          payload: expect.objectContaining({
            customerId: undefined,
            customerPhone,
            transcript,
          }),
        }),
      );
      expect(queueService.addNotificationJob).not.toHaveBeenCalled();
    });

    it('should handle complaint without transcript', async () => {
      const extractedData: ExtractedDataDto = {
        issueDescription: 'Billing issue',
      };

      const customer = { id: 'customer-123' };

      mockCustomerService.findByPhone.mockResolvedValue(customer as any);
      mockQueueService.addVoiceJob.mockResolvedValue({ id: 'job-123' } as any);
      mockQueueService.addNotificationJob.mockResolvedValue({ id: 'job-456' } as any);

      await service.handleComplaintIntent(tenantId, customerPhone, undefined, extractedData);

      expect(queueService.addVoiceJob).toHaveBeenCalledWith(
        'complaint-review',
        expect.objectContaining({
          payload: expect.objectContaining({
            transcript: undefined,
          }),
        }),
      );
    });
  });

  describe('extractIntentFromTranscript', () => {
    it('should detect booking intent from "want to book"', () => {
      const transcript = 'I want to book an appointment for the service';

      const result = service.extractIntentFromTranscript(transcript);

      expect(result.intent).toBe('booking');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should detect booking intent from English keywords', () => {
      const transcript = 'I want to book an appointment for oil change';

      const result = service.extractIntentFromTranscript(transcript);

      expect(result.intent).toBe('booking');
    });

    it('should detect status_check intent', () => {
      const transcript = 'When will my car be ready? I want to check the status';

      const result = service.extractIntentFromTranscript(transcript);

      expect(result.intent).toBe('status_check');
    });

    it('should detect complaint intent', () => {
      const transcript = 'I have a problem, I am unhappy with what happened';

      const result = service.extractIntentFromTranscript(transcript);

      expect(result.intent).toBe('complaint');
    });

    it('should return other intent for unrecognized phrases', () => {
      const transcript = 'What are your opening hours?';

      const result = service.extractIntentFromTranscript(transcript);

      expect(result.intent).toBe('other');
      expect(result.confidence).toBe(0.5);
    });

    it('should be case insensitive', () => {
      const transcript = 'I WANT TO BOOK A SERVICE';

      const result = service.extractIntentFromTranscript(transcript);

      expect(result.intent).toBe('booking');
    });

    it('should handle multiple matching keywords', () => {
      const transcript = 'I want to book an appointment to schedule a repair service';

      const result = service.extractIntentFromTranscript(transcript);

      expect(result.intent).toBe('booking');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should handle empty transcript', () => {
      const transcript = '';

      const result = service.extractIntentFromTranscript(transcript);

      expect(result.intent).toBe('other');
    });

    describe('Additional Keywords', () => {
      it('should detect "schedule" keyword', () => {
        const transcript = 'I need to schedule an appointment';

        const result = service.extractIntentFromTranscript(transcript);

        expect(result.intent).toBe('booking');
      });

      it('should detect "appointment" keyword', () => {
        const transcript = 'Can I make an appointment';

        const result = service.extractIntentFromTranscript(transcript);

        expect(result.intent).toBe('booking');
      });

      it('should detect "ready" status keyword', () => {
        const transcript = 'Is my car ready?';

        const result = service.extractIntentFromTranscript(transcript);

        expect(result.intent).toBe('status_check');
      });

      it('should detect "bad" complaint keyword', () => {
        const transcript = 'I have bad experience';

        const result = service.extractIntentFromTranscript(transcript);

        expect(result.intent).toBe('complaint');
      });
    });
  });
});
