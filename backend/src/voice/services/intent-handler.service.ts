import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '@common/services/prisma.service';
import { QueueService } from '@common/services/queue.service';
import { LoggerService } from '@common/services/logger.service';
import { CustomerService } from '@customer/services/customer.service';
import { BookingService } from '@booking/services/booking.service';
import { ExtractedDataDto } from '../dto/vapi-webhook.dto';

export interface BookingResult {
  success: boolean;
  bookingId?: string;
  message?: string;
  error?: string;
}

@Injectable()
export class IntentHandlerService {
  private readonly logger = new Logger(IntentHandlerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly loggerService: LoggerService,
    private readonly customerService: CustomerService,
    private readonly bookingService: BookingService,
  ) {}

  /**
   * Handle booking intent from voice call
   */
  async handleBookingIntent(
    tenantId: string,
    customerPhone: string,
    extractedData: ExtractedDataDto,
    vapiCallId: string,
  ): Promise<BookingResult> {
    this.logger.log(
      `Handling booking intent for ${customerPhone}`,
      'IntentHandlerService',
    );

    try {
      // Find or create customer
      let customer = await this.customerService.findByPhone(tenantId, customerPhone);

      if (!customer) {
        this.logger.log(`Creating new customer for ${customerPhone}`);
        customer = await this.customerService.createFromVoiceCall(
          tenantId,
          customerPhone,
          extractedData,
        );
      }

      // Find available slot for preferred date/time
      const preferredDate = new Date(extractedData.preferredDate!);
      const [hours, minutes] = extractedData.preferredTime!.split(':').map(Number);
      preferredDate.setHours(hours, minutes, 0, 0);

      // Find nearest available slot
      const slot = await this.findNearestAvailableSlot(
        tenantId,
        preferredDate,
        extractedData.serviceType,
      );

      if (!slot) {
        // No slot available, queue for callback
        await this.queueService.addBookingJob(
          'schedule-callback',
          {
            type: 'schedule-callback',
            payload: {
              customerId: customer.id,
              preferredDate: extractedData.preferredDate,
              preferredTime: extractedData.preferredTime,
              serviceType: extractedData.serviceType,
            },
            tenantId,
          },
        );

        return {
          success: false,
          message: 'No slots available, queued for callback',
        };
      }

      // Find vehicle if license plate provided
      let vehicleId: string | undefined;
      if (extractedData.licensePlate) {
        const vehicle = await this.prisma.vehicle.findFirst({
          where: {
            licensePlate: extractedData.licensePlate.toUpperCase(),
            customerId: customer.id,
          },
        });
        vehicleId = vehicle?.id;
      }

      // Find service if service type provided
      let serviceIds: string[] | undefined;
      if (extractedData.serviceType) {
        const service = await this.prisma.service.findFirst({
          where: {
            tenantId,
            name: {
              contains: extractedData.serviceType,
              mode: 'insensitive',
            },
          },
        });
        if (service) {
          serviceIds = [service.id];
        }
      }

      // Create booking
      const booking = await this.bookingService.createBooking(tenantId, {
        customerId: customer.id,
        vehicleId,
        slotId: slot.id,
        scheduledDate: slot.startTime.toISOString(),
        serviceIds,
        notes: extractedData.issueDescription,
        source: 'VOICE',
        vapiCallId,
      });

      // Queue confirmation SMS
      await this.queueService.addNotificationJob(
        'send-sms-confirmation',
        {
          type: 'sms-confirmation',
          payload: {
            customerId: customer.id,
            bookingId: booking.id,
            scheduledDate: slot.startTime,
          },
          tenantId,
        },
      );

      this.logger.log(`Created booking ${booking.id} for customer ${customer.id}`);

      return {
        success: true,
        bookingId: booking.id,
        message: 'Booking created successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to handle booking intent: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Handle status check intent
   */
  async handleStatusCheckIntent(
    tenantId: string,
    customerPhone: string,
    extractedData: ExtractedDataDto,
  ): Promise<void> {
    this.logger.log(
      `Handling status check for ${customerPhone}`,
      'IntentHandlerService',
    );

    const customer = await this.customerService.findByPhone(tenantId, customerPhone);

    if (!customer) {
      this.logger.warn(`Customer not found for ${customerPhone}`);
      return;
    }

    // Get recent bookings
    const bookings = await this.prisma.booking.findMany({
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

    // Queue SMS with status update
    await this.queueService.addNotificationJob(
      'send-status-update',
      {
        type: 'status-update',
        payload: {
          customerId: customer.id,
          bookings: bookings.map((b) => ({
            id: b.id,
            status: b.status,
            scheduledDate: b.scheduledDate,
            services: b.services.map((s) => s.service.name),
          })),
        },
        tenantId,
      },
    );
  }

  /**
   * Handle complaint intent
   */
  async handleComplaintIntent(
    tenantId: string,
    customerPhone: string,
    transcript: string | undefined,
    extractedData: ExtractedDataDto,
  ): Promise<void> {
    this.logger.log(
      `Handling complaint from ${customerPhone}`,
      'IntentHandlerService',
    );

    const customer = await this.customerService.findByPhone(tenantId, customerPhone);

    // Queue for manager review
    await this.queueService.addVoiceJob(
      'complaint-review',
      {
        type: 'complaint-review',
        payload: {
          customerId: customer?.id,
          customerPhone,
          transcript,
          issueDescription: extractedData.issueDescription,
          licensePlate: extractedData.licensePlate,
        },
        tenantId,
      },
    );

    // If customer found, send acknowledgment
    if (customer) {
      await this.queueService.addNotificationJob(
        'send-complaint-acknowledgment',
        {
          type: 'complaint-acknowledgment',
          payload: {
            customerId: customer.id,
          },
          tenantId,
        },
      );
    }
  }

  /**
   * Find nearest available slot
   */
  private async findNearestAvailableSlot(
    tenantId: string,
    preferredDate: Date,
    serviceType?: string,
  ): Promise<any | null> {
    // Look for slots within 3 days of preferred date
    const startDate = new Date(preferredDate);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(preferredDate);
    endDate.setDate(endDate.getDate() + 3);
    endDate.setHours(23, 59, 59, 999);

    const slots = await this.prisma.bookingSlot.findMany({
      where: {
        tenantId,
        status: 'AVAILABLE',
        startTime: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        startTime: 'asc',
      },
      take: 10,
    });

    if (slots.length === 0) {
      return null;
    }

    // Find slot closest to preferred time
    const preferredTime = preferredDate.getTime();
    let nearestSlot = slots[0];
    let minDiff = Math.abs(nearestSlot.startTime.getTime() - preferredTime);

    for (const slot of slots) {
      const diff = Math.abs(slot.startTime.getTime() - preferredTime);
      if (diff < minDiff) {
        minDiff = diff;
        nearestSlot = slot;
      }
    }

    return nearestSlot;
  }

  /**
   * Extract intent from transcript using simple keyword matching
   * In production, this would use NLP/AI service
   */
  extractIntentFromTranscript(transcript: string): {
    intent: string;
    confidence: number;
  } {
    const lowerTranscript = transcript.toLowerCase();

    const intents = [
      {
        keywords: ['book', 'appointment', 'schedule', 'service', 'repair', 'fix'],
        intent: 'booking',
      },
      {
        keywords: ['status', 'when', 'ready', 'done', 'complete', 'progress'],
        intent: 'status_check',
      },
      {
        keywords: ['complaint', 'problem', 'issue', 'unhappy', 'bad', 'wrong', 'disappointed'],
        intent: 'complaint',
      },
    ];

    for (const { keywords, intent } of intents) {
      const matches = keywords.filter((k) => lowerTranscript.includes(k));
      if (matches.length > 0) {
        const confidence = Math.min(matches.length / keywords.length + 0.3, 1);
        return { intent, confidence };
      }
    }

    return { intent: 'other', confidence: 0.5 };
  }
}
