import { Test, TestingModule } from '@nestjs/testing';
import { IntentHandlerService } from './intent-handler.service';
import { PrismaService } from '@common/services/prisma.service';
import { QueueService } from '@common/services/queue.service';
import { LoggerService } from '@common/services/logger.service';
import { CustomerService } from '@customer/services/customer.service';
import { BookingService } from '@booking/services/booking.service';
import { ExtractedDataDto } from '../dto/vapi-webhook.dto';

describe('IntentHandlerService', () => {
  let service: IntentHandlerService;
  let prisma: Record<string, Record<string, jest.Mock>>;
  let queueService: {
    addVoiceJob: jest.Mock;
    addNotificationJob: jest.Mock;
    addBookingJob: jest.Mock;
  };
  let loggerService: { log: jest.Mock; warn: jest.Mock; error: jest.Mock; debug: jest.Mock };
  let customerService: {
    findByPhone: jest.Mock;
    createFromVoiceCall: jest.Mock;
  };
  let bookingService: {
    createBooking: jest.Mock;
  };

  const TENANT_ID = 'tenant-001';
  const CUSTOMER_PHONE = '+390123456789';
  const VAPI_CALL_ID = 'call_abc123xyz';

  const mockCustomer = {
    id: 'customer-001',
    tenantId: TENANT_ID,
    name: 'Luigi Bianchi',
  };

  const mockSlot = {
    id: 'slot-001',
    tenantId: TENANT_ID,
    startTime: new Date('2024-06-15T09:00:00Z'),
    endTime: new Date('2024-06-15T10:00:00Z'),
    status: 'AVAILABLE',
  };

  const mockBooking = {
    id: 'booking-001',
    tenantId: TENANT_ID,
    customerId: 'customer-001',
    status: 'CONFIRMED',
  };

  const mockVehicle = {
    id: 'vehicle-001',
    licensePlate: 'AB123CD',
    customerId: 'customer-001',
  };

  const mockService = {
    id: 'service-001',
    tenantId: TENANT_ID,
    name: 'Oil Change',
  };

  beforeEach(async () => {
    prisma = {
      bookingSlot: {
        findMany: jest.fn().mockResolvedValue([mockSlot]),
      },
      vehicle: {
        findFirst: jest.fn().mockResolvedValue(mockVehicle),
      },
      service: {
        findFirst: jest.fn().mockResolvedValue(mockService),
      },
      booking: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'booking-001',
            status: 'CONFIRMED',
            scheduledDate: new Date('2024-06-15T09:00:00Z'),
            services: [{ service: { name: 'Oil Change' } }],
            slot: mockSlot,
          },
        ]),
      },
    };

    queueService = {
      addVoiceJob: jest.fn().mockResolvedValue({ id: 'job-001' }),
      addNotificationJob: jest.fn().mockResolvedValue({ id: 'notif-001' }),
      addBookingJob: jest.fn().mockResolvedValue({ id: 'booking-job-001' }),
    };

    loggerService = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    customerService = {
      findByPhone: jest.fn().mockResolvedValue(mockCustomer),
      createFromVoiceCall: jest.fn().mockResolvedValue({
        ...mockCustomer,
        id: 'customer-new',
      }),
    };

    bookingService = {
      createBooking: jest.fn().mockResolvedValue(mockBooking),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntentHandlerService,
        { provide: PrismaService, useValue: prisma },
        { provide: QueueService, useValue: queueService },
        { provide: LoggerService, useValue: loggerService },
        { provide: CustomerService, useValue: customerService },
        { provide: BookingService, useValue: bookingService },
      ],
    }).compile();

    service = module.get<IntentHandlerService>(IntentHandlerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleBookingIntent', () => {
    const extractedData: ExtractedDataDto = {
      preferredDate: '2024-06-15',
      preferredTime: '09:00',
      serviceType: 'Oil Change',
      licensePlate: 'AB123CD',
      issueDescription: 'Engine making noise',
    };

    it('should create a booking for an existing customer', async () => {
      // Arrange - defaults are set in beforeEach

      // Act
      const result = await service.handleBookingIntent(
        TENANT_ID,
        CUSTOMER_PHONE,
        extractedData,
        VAPI_CALL_ID,
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.bookingId).toBe('booking-001');
      expect(customerService.findByPhone).toHaveBeenCalledWith(TENANT_ID, CUSTOMER_PHONE);
      expect(customerService.createFromVoiceCall).not.toHaveBeenCalled();
    });

    it('should create a new customer when phone lookup returns null', async () => {
      // Arrange
      customerService.findByPhone.mockResolvedValue(null);

      // Act
      const result = await service.handleBookingIntent(
        TENANT_ID,
        CUSTOMER_PHONE,
        extractedData,
        VAPI_CALL_ID,
      );

      // Assert
      expect(result.success).toBe(true);
      expect(customerService.createFromVoiceCall).toHaveBeenCalledWith(
        TENANT_ID,
        CUSTOMER_PHONE,
        extractedData,
      );
    });

    it('should look up vehicle by license plate and customer', async () => {
      // Arrange & Act
      await service.handleBookingIntent(TENANT_ID, CUSTOMER_PHONE, extractedData, VAPI_CALL_ID);

      // Assert
      expect(prisma.vehicle.findFirst).toHaveBeenCalledWith({
        where: {
          licensePlate: 'AB123CD',
          customerId: mockCustomer.id,
        },
      });
    });

    it('should uppercase the license plate when looking up vehicles', async () => {
      // Arrange
      const dataWithLowerPlate: ExtractedDataDto = {
        ...extractedData,
        licensePlate: 'ab123cd',
      };

      // Act
      await service.handleBookingIntent(
        TENANT_ID,
        CUSTOMER_PHONE,
        dataWithLowerPlate,
        VAPI_CALL_ID,
      );

      // Assert
      expect(prisma.vehicle.findFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({
          licensePlate: 'AB123CD',
        }),
      });
    });

    it('should look up service by type with case-insensitive matching', async () => {
      // Arrange & Act
      await service.handleBookingIntent(TENANT_ID, CUSTOMER_PHONE, extractedData, VAPI_CALL_ID);

      // Assert
      expect(prisma.service.findFirst).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID,
          name: {
            contains: 'Oil Change',
            mode: 'insensitive',
          },
        },
      });
    });

    it('should create booking with correct parameters including VOICE source', async () => {
      // Arrange & Act
      await service.handleBookingIntent(TENANT_ID, CUSTOMER_PHONE, extractedData, VAPI_CALL_ID);

      // Assert
      expect(bookingService.createBooking).toHaveBeenCalledWith(TENANT_ID, {
        customerId: mockCustomer.id,
        vehicleId: mockVehicle.id,
        slotId: mockSlot.id,
        scheduledDate: mockSlot.startTime.toISOString(),
        serviceIds: [mockService.id],
        notes: 'Engine making noise',
        source: 'VOICE',
        vapiCallId: VAPI_CALL_ID,
      });
    });

    it('should queue SMS confirmation after booking creation', async () => {
      // Arrange & Act
      await service.handleBookingIntent(TENANT_ID, CUSTOMER_PHONE, extractedData, VAPI_CALL_ID);

      // Assert
      expect(queueService.addNotificationJob).toHaveBeenCalledWith('send-sms-confirmation', {
        type: 'sms-confirmation',
        payload: {
          customerId: mockCustomer.id,
          bookingId: mockBooking.id,
          scheduledDate: mockSlot.startTime,
        },
        tenantId: TENANT_ID,
      });
    });

    it('should queue for callback when no slots are available', async () => {
      // Arrange
      prisma.bookingSlot.findMany.mockResolvedValue([]);

      // Act
      const result = await service.handleBookingIntent(
        TENANT_ID,
        CUSTOMER_PHONE,
        extractedData,
        VAPI_CALL_ID,
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('No slots available, queued for callback');
      expect(queueService.addBookingJob).toHaveBeenCalledWith('schedule-callback', {
        type: 'schedule-callback',
        payload: {
          customerId: mockCustomer.id,
          preferredDate: '2024-06-15',
          preferredTime: '09:00',
          serviceType: 'Oil Change',
        },
        tenantId: TENANT_ID,
      });
      expect(bookingService.createBooking).not.toHaveBeenCalled();
    });

    it('should handle booking without license plate', async () => {
      // Arrange
      const dataNoPlate: ExtractedDataDto = {
        preferredDate: '2024-06-15',
        preferredTime: '09:00',
        serviceType: 'Oil Change',
      };

      // Act
      const result = await service.handleBookingIntent(
        TENANT_ID,
        CUSTOMER_PHONE,
        dataNoPlate,
        VAPI_CALL_ID,
      );

      // Assert
      expect(result.success).toBe(true);
      expect(prisma.vehicle.findFirst).not.toHaveBeenCalled();
      expect(bookingService.createBooking).toHaveBeenCalledWith(
        TENANT_ID,
        expect.objectContaining({ vehicleId: undefined }),
      );
    });

    it('should handle booking without service type', async () => {
      // Arrange
      const dataNoService: ExtractedDataDto = {
        preferredDate: '2024-06-15',
        preferredTime: '09:00',
        licensePlate: 'AB123CD',
      };

      // Act
      const result = await service.handleBookingIntent(
        TENANT_ID,
        CUSTOMER_PHONE,
        dataNoService,
        VAPI_CALL_ID,
      );

      // Assert
      expect(result.success).toBe(true);
      expect(prisma.service.findFirst).not.toHaveBeenCalled();
      expect(bookingService.createBooking).toHaveBeenCalledWith(
        TENANT_ID,
        expect.objectContaining({ serviceIds: undefined }),
      );
    });

    it('should handle service type not found in database', async () => {
      // Arrange
      prisma.service.findFirst.mockResolvedValue(null);

      // Act
      const result = await service.handleBookingIntent(
        TENANT_ID,
        CUSTOMER_PHONE,
        extractedData,
        VAPI_CALL_ID,
      );

      // Assert
      expect(result.success).toBe(true);
      expect(bookingService.createBooking).toHaveBeenCalledWith(
        TENANT_ID,
        expect.objectContaining({ serviceIds: undefined }),
      );
    });

    it('should return error result when an exception is thrown', async () => {
      // Arrange
      customerService.findByPhone.mockRejectedValue(new Error('Database connection lost'));

      // Act
      const result = await service.handleBookingIntent(
        TENANT_ID,
        CUSTOMER_PHONE,
        extractedData,
        VAPI_CALL_ID,
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection lost');
    });

    it('should return error when bookingService.createBooking throws', async () => {
      // Arrange
      bookingService.createBooking.mockRejectedValue(new Error('Slot already booked'));

      // Act
      const result = await service.handleBookingIntent(
        TENANT_ID,
        CUSTOMER_PHONE,
        extractedData,
        VAPI_CALL_ID,
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Slot already booked');
    });

    describe('tenant isolation', () => {
      it('should pass correct tenantId to customer lookup', async () => {
        // Arrange
        const tenantA = 'tenant-aaa';

        // Act
        await service.handleBookingIntent(tenantA, CUSTOMER_PHONE, extractedData, VAPI_CALL_ID);

        // Assert
        expect(customerService.findByPhone).toHaveBeenCalledWith(tenantA, CUSTOMER_PHONE);
      });

      it('should pass correct tenantId to slot lookup', async () => {
        // Arrange
        const tenantB = 'tenant-bbb';

        // Act
        await service.handleBookingIntent(tenantB, CUSTOMER_PHONE, extractedData, VAPI_CALL_ID);

        // Assert
        expect(prisma.bookingSlot.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ tenantId: tenantB }),
          }),
        );
      });

      it('should pass correct tenantId to booking creation', async () => {
        // Arrange
        const tenantC = 'tenant-ccc';

        // Act
        await service.handleBookingIntent(tenantC, CUSTOMER_PHONE, extractedData, VAPI_CALL_ID);

        // Assert
        expect(bookingService.createBooking).toHaveBeenCalledWith(tenantC, expect.any(Object));
      });
    });

    describe('slot finding logic', () => {
      it('should search for slots within 3 days of preferred date', async () => {
        // Arrange & Act
        await service.handleBookingIntent(TENANT_ID, CUSTOMER_PHONE, extractedData, VAPI_CALL_ID);

        // Assert
        const findManyCall = prisma.bookingSlot.findMany.mock.calls[0][0];
        expect(findManyCall.where.status).toBe('AVAILABLE');
        expect(findManyCall.where.startTime.gte).toBeInstanceOf(Date);
        expect(findManyCall.where.startTime.lte).toBeInstanceOf(Date);

        const startDate = findManyCall.where.startTime.gte as Date;
        const endDate = findManyCall.where.startTime.lte as Date;
        const diffDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
        expect(diffDays).toBeGreaterThanOrEqual(3);
        expect(diffDays).toBeLessThan(4);
      });

      it('should pick the slot closest to the preferred time', async () => {
        // Arrange - The service parses '2024-06-15' and sets hours to 09:00 local time.
        // We compute the expected preferred time the same way the service does,
        // so the "ideal" slot is unambiguously the closest regardless of timezone.
        const preferredDate = new Date('2024-06-15');
        preferredDate.setHours(9, 0, 0, 0);
        const preferredMs = preferredDate.getTime();

        // One slot 3 hours before, one 30 min after, one 5 hours after
        const earlySlot = {
          id: 'slot-early',
          startTime: new Date(preferredMs - 3 * 60 * 60 * 1000),
          status: 'AVAILABLE',
        };
        const idealSlot = {
          id: 'slot-ideal',
          startTime: new Date(preferredMs + 30 * 60 * 1000),
          status: 'AVAILABLE',
        };
        const lateSlot = {
          id: 'slot-late',
          startTime: new Date(preferredMs + 5 * 60 * 60 * 1000),
          status: 'AVAILABLE',
        };
        prisma.bookingSlot.findMany.mockResolvedValue([earlySlot, idealSlot, lateSlot]);

        // Act
        await service.handleBookingIntent(TENANT_ID, CUSTOMER_PHONE, extractedData, VAPI_CALL_ID);

        // Assert - should use the ideal slot (closest to preferred time)
        expect(bookingService.createBooking).toHaveBeenCalledWith(
          TENANT_ID,
          expect.objectContaining({ slotId: 'slot-ideal' }),
        );
      });
    });
  });

  describe('handleStatusCheckIntent', () => {
    it('should look up customer by phone and send status update', async () => {
      // Arrange
      const extractedData: ExtractedDataDto = { licensePlate: 'AB123CD' };

      // Act
      await service.handleStatusCheckIntent(TENANT_ID, CUSTOMER_PHONE, extractedData);

      // Assert
      expect(customerService.findByPhone).toHaveBeenCalledWith(TENANT_ID, CUSTOMER_PHONE);
      expect(prisma.booking.findMany).toHaveBeenCalledWith({
        where: {
          customerId: mockCustomer.id,
          tenantId: TENANT_ID,
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
    });

    it('should queue a status-update notification', async () => {
      // Arrange & Act
      await service.handleStatusCheckIntent(TENANT_ID, CUSTOMER_PHONE, {});

      // Assert
      expect(queueService.addNotificationJob).toHaveBeenCalledWith(
        'send-status-update',
        expect.objectContaining({
          type: 'status-update',
          tenantId: TENANT_ID,
        }),
      );
    });

    it('should return early without querying bookings when customer not found', async () => {
      // Arrange
      customerService.findByPhone.mockResolvedValue(null);

      // Act
      await service.handleStatusCheckIntent(TENANT_ID, CUSTOMER_PHONE, {});

      // Assert
      expect(prisma.booking.findMany).not.toHaveBeenCalled();
      expect(queueService.addNotificationJob).not.toHaveBeenCalled();
    });

    it('should isolate booking lookup to the tenant', async () => {
      // Arrange
      const tenantZ = 'tenant-zzz';

      // Act
      await service.handleStatusCheckIntent(tenantZ, CUSTOMER_PHONE, {});

      // Assert
      expect(customerService.findByPhone).toHaveBeenCalledWith(tenantZ, CUSTOMER_PHONE);
      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: tenantZ }),
        }),
      );
    });
  });

  describe('handleComplaintIntent', () => {
    const transcript = 'I am very unhappy with the repair';
    const extractedData: ExtractedDataDto = {
      issueDescription: 'Brakes still squeaking',
      licensePlate: 'AB123CD',
    };

    it('should queue a complaint-review voice job', async () => {
      // Arrange & Act
      await service.handleComplaintIntent(TENANT_ID, CUSTOMER_PHONE, transcript, extractedData);

      // Assert
      expect(queueService.addVoiceJob).toHaveBeenCalledWith('complaint-review', {
        type: 'complaint-review',
        payload: {
          customerId: mockCustomer.id,
          customerPhone: CUSTOMER_PHONE,
          transcript,
          issueDescription: 'Brakes still squeaking',
          licensePlate: 'AB123CD',
        },
        tenantId: TENANT_ID,
      });
    });

    it('should send complaint acknowledgment when customer is found', async () => {
      // Arrange & Act
      await service.handleComplaintIntent(TENANT_ID, CUSTOMER_PHONE, transcript, extractedData);

      // Assert
      expect(queueService.addNotificationJob).toHaveBeenCalledWith(
        'send-complaint-acknowledgment',
        {
          type: 'complaint-acknowledgment',
          payload: {
            customerId: mockCustomer.id,
          },
          tenantId: TENANT_ID,
        },
      );
    });

    it('should not send acknowledgment when customer is not found', async () => {
      // Arrange
      customerService.findByPhone.mockResolvedValue(null);

      // Act
      await service.handleComplaintIntent(TENANT_ID, CUSTOMER_PHONE, transcript, extractedData);

      // Assert
      expect(queueService.addNotificationJob).not.toHaveBeenCalled();
    });

    it('should still queue complaint review even when customer is not found', async () => {
      // Arrange
      customerService.findByPhone.mockResolvedValue(null);

      // Act
      await service.handleComplaintIntent(TENANT_ID, CUSTOMER_PHONE, transcript, extractedData);

      // Assert
      expect(queueService.addVoiceJob).toHaveBeenCalledWith(
        'complaint-review',
        expect.objectContaining({
          payload: expect.objectContaining({
            customerId: undefined,
            customerPhone: CUSTOMER_PHONE,
          }),
        }),
      );
    });

    it('should handle undefined transcript', async () => {
      // Arrange & Act
      await service.handleComplaintIntent(TENANT_ID, CUSTOMER_PHONE, undefined, extractedData);

      // Assert
      expect(queueService.addVoiceJob).toHaveBeenCalledWith(
        'complaint-review',
        expect.objectContaining({
          payload: expect.objectContaining({
            transcript: undefined,
          }),
        }),
      );
    });

    it('should isolate complaint to the correct tenant', async () => {
      // Arrange
      const tenantY = 'tenant-yyy';

      // Act
      await service.handleComplaintIntent(tenantY, CUSTOMER_PHONE, transcript, extractedData);

      // Assert
      expect(customerService.findByPhone).toHaveBeenCalledWith(tenantY, CUSTOMER_PHONE);
      expect(queueService.addVoiceJob).toHaveBeenCalledWith(
        'complaint-review',
        expect.objectContaining({ tenantId: tenantY }),
      );
    });
  });

  describe('extractIntentFromTranscript', () => {
    it('should detect booking intent from keyword "book"', () => {
      // Arrange & Act
      const result = service.extractIntentFromTranscript('I would like to book an appointment');

      // Assert
      expect(result.intent).toBe('booking');
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it('should detect booking intent from keyword "appointment"', () => {
      // Arrange & Act
      const result = service.extractIntentFromTranscript(
        'Can I make an appointment for next week?',
      );

      // Assert
      expect(result.intent).toBe('booking');
    });

    it('should detect booking intent from keyword "repair"', () => {
      // Arrange & Act
      const result = service.extractIntentFromTranscript('My car needs a repair');

      // Assert
      expect(result.intent).toBe('booking');
    });

    it('should increase confidence with more matching keywords', () => {
      // Arrange
      const singleKeyword = 'I need a repair';
      const multipleKeywords = 'I need to book an appointment to repair and service my car';

      // Act
      const singleResult = service.extractIntentFromTranscript(singleKeyword);
      const multiResult = service.extractIntentFromTranscript(multipleKeywords);

      // Assert
      expect(multiResult.confidence).toBeGreaterThan(singleResult.confidence);
    });

    it('should cap confidence at 1.0', () => {
      // Arrange - transcript with many booking keywords
      const transcript =
        'I want to book an appointment to schedule a service for repair and fix my car';

      // Act
      const result = service.extractIntentFromTranscript(transcript);

      // Assert
      expect(result.confidence).toBeLessThanOrEqual(1.0);
    });

    it('should detect status_check intent', () => {
      // Arrange & Act
      const result = service.extractIntentFromTranscript('When will my car be ready?');

      // Assert
      expect(result.intent).toBe('status_check');
    });

    it('should detect status_check from "status" keyword', () => {
      // Arrange - avoid booking keywords like "repair", "service", "fix"
      const result = service.extractIntentFromTranscript('Can I check the status of my car?');

      // Assert
      expect(result.intent).toBe('status_check');
    });

    it('should detect complaint intent', () => {
      // Arrange - avoid booking keywords like "service", "repair", "fix"
      const result = service.extractIntentFromTranscript(
        'I have a complaint about the work that was performed',
      );

      // Assert
      expect(result.intent).toBe('complaint');
    });

    it('should detect complaint from "unhappy" keyword', () => {
      // Arrange - avoid status_check keywords like "done", "ready", "complete"
      const result = service.extractIntentFromTranscript('I am very unhappy with the work');

      // Assert
      expect(result.intent).toBe('complaint');
    });

    it('should detect complaint from "disappointed" keyword', () => {
      // Arrange & Act
      const result = service.extractIntentFromTranscript('I am disappointed with the result');

      // Assert
      expect(result.intent).toBe('complaint');
    });

    it('should return "other" for unrecognized transcripts', () => {
      // Arrange & Act
      const result = service.extractIntentFromTranscript('Hello, just calling to say hello');

      // Assert
      expect(result.intent).toBe('other');
      expect(result.confidence).toBe(0.5);
    });

    it('should be case insensitive', () => {
      // Arrange & Act
      const result = service.extractIntentFromTranscript('I WANT TO BOOK AN APPOINTMENT');

      // Assert
      expect(result.intent).toBe('booking');
    });

    it('should match the first matching intent category (booking before status_check)', () => {
      // Arrange - transcript has both "book" and "status" keywords
      const result = service.extractIntentFromTranscript(
        'I want to book a service and check the status',
      );

      // Assert - "booking" comes first in the intents array
      expect(result.intent).toBe('booking');
    });
  });
});
