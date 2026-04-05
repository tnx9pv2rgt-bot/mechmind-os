import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { EncryptionService } from '../common/services/encryption.service';

@Injectable()
export class PortalService {
  private readonly logger = new Logger(PortalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  private decryptCustomer(customer: {
    id: string;
    encryptedEmail?: string | null;
    encryptedFirstName?: string | null;
    encryptedLastName?: string | null;
    encryptedPhone: string;
  }): {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    phone: string;
  } {
    return {
      id: customer.id,
      email: customer.encryptedEmail ? this.encryption.decrypt(customer.encryptedEmail) : null,
      firstName: customer.encryptedFirstName
        ? this.encryption.decrypt(customer.encryptedFirstName)
        : null,
      lastName: customer.encryptedLastName
        ? this.encryption.decrypt(customer.encryptedLastName)
        : null,
      phone: this.encryption.decrypt(customer.encryptedPhone),
    };
  }

  async getDashboard(
    customerId: string,
    tenantId: string,
  ): Promise<{ data: Record<string, unknown> }> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId, deletedAt: null },
    });

    if (!customer) {
      throw new NotFoundException('Cliente non trovato');
    }

    const decryptedCustomer = this.decryptCustomer(customer);

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      upcomingBooking,
      maintenanceDueVehicles,
      recentInspection,
      recentDocuments,
      unreadNotificationsCount,
      unpaidInvoices,
      activeRepairs,
    ] = await Promise.all([
      // Next upcoming booking
      this.prisma.booking.findFirst({
        where: {
          customerId,
          tenantId,
          deletedAt: null,
          scheduledDate: { gt: now },
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
        include: { vehicle: true },
        orderBy: { scheduledDate: 'asc' },
      }),

      // Vehicles needing maintenance
      this.prisma.vehicle.findMany({
        where: {
          customerId,
          tenantId,
          deletedAt: null,
          OR: [{ revisionExpiry: { lt: thirtyDaysFromNow } }],
        },
      }),

      // Most recent inspection
      this.prisma.inspection.findFirst({
        where: { customerId, tenantId },
        include: { vehicle: true },
        orderBy: { startedAt: 'desc' },
      }),

      // Last 5 invoices as documents
      this.prisma.invoice.findMany({
        where: { customerId, tenantId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          invoiceNumber: true,
          total: true,
          status: true,
          createdAt: true,
          documentType: true,
        },
      }),

      // Unread notifications count
      this.prisma.notification.count({
        where: {
          customerId,
          tenantId,
          deletedAt: null,
          status: { not: 'READ' },
        },
      }),

      // Unpaid invoices
      this.prisma.invoice.aggregate({
        where: {
          customerId,
          tenantId,
          deletedAt: null,
          status: { in: ['SENT', 'OVERDUE'] },
        },
        _count: { id: true },
        _sum: { total: true },
      }),

      // Active repairs
      this.prisma.booking.count({
        where: {
          customerId,
          tenantId,
          deletedAt: null,
          status: 'IN_PROGRESS',
        },
      }),
    ]);

    return {
      data: {
        customer: decryptedCustomer,
        upcomingBooking,
        maintenanceDue: maintenanceDueVehicles,
        recentInspection,
        warrantyStatus: { total: 0, active: 0, expiringSoon: 0, expired: 0 },
        recentDocuments,
        unreadNotifications: unreadNotificationsCount,
        unpaidInvoices: {
          count: unpaidInvoices._count.id,
          total: unpaidInvoices._sum.total ?? 0,
        },
        activeRepairs: { count: activeRepairs },
      },
    };
  }

  async getProfile(
    customerId: string,
    tenantId: string,
  ): Promise<{ data: Record<string, unknown> }> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId, deletedAt: null },
      include: { vehicles: { where: { deletedAt: null } } },
    });

    if (!customer) {
      throw new NotFoundException('Cliente non trovato');
    }

    const decrypted = this.decryptCustomer(customer);

    return {
      data: {
        ...decrypted,
        customerType: customer.customerType,
        codiceFiscale: customer.codiceFiscale,
        partitaIva: customer.partitaIva,
        sdiCode: customer.sdiCode,
        pecEmail: customer.pecEmail,
        address: customer.address,
        city: customer.city,
        postalCode: customer.postalCode,
        gdprConsent: customer.gdprConsent,
        gdprConsentAt: customer.gdprConsentAt,
        vehicles: customer.vehicles,
        createdAt: customer.createdAt,
      },
    };
  }

  async updateProfile(
    customerId: string,
    tenantId: string,
    data: { firstName?: string; lastName?: string; phone?: string },
  ): Promise<{ data: Record<string, unknown> }> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId, deletedAt: null },
    });

    if (!customer) {
      throw new NotFoundException('Cliente non trovato');
    }

    const updateData: Record<string, string> = {};

    if (data.firstName !== undefined) {
      updateData.encryptedFirstName = this.encryption.encrypt(data.firstName);
    }
    if (data.lastName !== undefined) {
      updateData.encryptedLastName = this.encryption.encrypt(data.lastName);
    }
    if (data.phone !== undefined) {
      updateData.encryptedPhone = this.encryption.encrypt(data.phone);
    }

    await this.prisma.customer.updateMany({
      where: { id: customerId, tenantId },
      data: updateData,
    });

    const updated = await this.prisma.customer.findFirstOrThrow({
      where: { id: customerId, tenantId, deletedAt: null },
    });

    const decrypted = this.decryptCustomer(updated);

    this.logger.log(`Profile updated for customer ${customerId} in tenant ${tenantId}`);

    return { data: decrypted };
  }

  async getVehicles(customerId: string, tenantId: string): Promise<{ data: unknown[] }> {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { customerId, tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    return { data: vehicles };
  }

  async getBookings(customerId: string, tenantId: string): Promise<{ data: unknown[] }> {
    const bookings = await this.prisma.booking.findMany({
      where: { customerId, tenantId, deletedAt: null },
      include: {
        vehicle: true,
        services: true,
        slot: true,
      },
      orderBy: { scheduledDate: 'desc' },
    });

    return { data: bookings };
  }

  async getAvailableSlots(
    tenantId: string,
    date: string,
    serviceType?: string,
  ): Promise<{ data: unknown[] }> {
    if (!date) {
      throw new BadRequestException('Il parametro date è obbligatorio');
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const where: Record<string, unknown> = {
      tenantId,
      status: 'AVAILABLE',
      startTime: { gte: startOfDay, lte: endOfDay },
    };

    // serviceType can be used for future filtering logic
    if (serviceType) {
      this.logger.debug(`Filtering slots for serviceType: ${serviceType}`);
    }

    const slots = await this.prisma.bookingSlot.findMany({
      where,
      orderBy: { startTime: 'asc' },
    });

    return { data: slots };
  }

  async createBooking(
    customerId: string,
    tenantId: string,
    data: { vehicleId: string; slotId: string; notes?: string; serviceType?: string },
  ): Promise<{ data: Record<string, unknown> }> {
    // Verify the customer exists
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId, deletedAt: null },
    });

    if (!customer) {
      throw new NotFoundException('Cliente non trovato');
    }

    // Verify the vehicle belongs to this customer
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: data.vehicleId, customerId, tenantId, deletedAt: null },
    });

    if (!vehicle) {
      throw new NotFoundException('Veicolo non trovato');
    }

    // Verify the slot is available
    const slot = await this.prisma.bookingSlot.findFirst({
      where: { id: data.slotId, tenantId, status: 'AVAILABLE' },
    });

    if (!slot) {
      throw new BadRequestException('Lo slot selezionato non è disponibile');
    }

    // Create the booking in a transaction
    const booking = await this.prisma.$transaction(async tx => {
      // Mark slot as booked
      await tx.bookingSlot.update({
        where: { id: data.slotId },
        data: { status: 'BOOKED' },
      });

      // Create the booking
      return tx.booking.create({
        data: {
          tenantId,
          customerId,
          vehicleId: data.vehicleId,
          slotId: data.slotId,
          scheduledDate: slot.startTime,
          durationMinutes: Math.round((slot.endTime.getTime() - slot.startTime.getTime()) / 60000),
          notes: data.notes ?? null,
          source: 'WEB',
          status: 'PENDING',
        },
        include: { vehicle: true, slot: true },
      });
    });

    this.logger.log(
      `Booking ${booking.id} created by customer ${customerId} in tenant ${tenantId}`,
    );

    return { data: booking };
  }

  async getInspections(customerId: string, tenantId: string): Promise<{ data: unknown[] }> {
    const inspections = await this.prisma.inspection.findMany({
      where: { customerId, tenantId },
      include: {
        vehicle: true,
        findings: true,
        photos: true,
      },
      orderBy: { startedAt: 'desc' },
    });

    return { data: inspections };
  }

  async getMaintenanceSchedule(customerId: string, tenantId: string): Promise<{ data: unknown[] }> {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { customerId, tenantId, deletedAt: null },
      select: {
        id: true,
        licensePlate: true,
        make: true,
        model: true,
        year: true,
        mileage: true,
        lastServiceDate: true,
        nextServiceDueKm: true,
        revisionExpiry: true,
        insuranceExpiry: true,
        taxExpiry: true,
      },
    });

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const schedule = vehicles.map(vehicle => {
      const alerts: string[] = [];

      if (vehicle.revisionExpiry && vehicle.revisionExpiry < thirtyDaysFromNow) {
        alerts.push(vehicle.revisionExpiry < now ? 'REVISION_EXPIRED' : 'REVISION_EXPIRING_SOON');
      }

      if (vehicle.insuranceExpiry && vehicle.insuranceExpiry < thirtyDaysFromNow) {
        alerts.push(
          vehicle.insuranceExpiry < now ? 'INSURANCE_EXPIRED' : 'INSURANCE_EXPIRING_SOON',
        );
      }

      if (vehicle.taxExpiry && vehicle.taxExpiry < thirtyDaysFromNow) {
        alerts.push(vehicle.taxExpiry < now ? 'TAX_EXPIRED' : 'TAX_EXPIRING_SOON');
      }

      if (
        vehicle.nextServiceDueKm &&
        vehicle.mileage &&
        vehicle.mileage >= vehicle.nextServiceDueKm - 1000
      ) {
        alerts.push('SERVICE_DUE_SOON');
      }

      return {
        vehicle,
        alerts,
        needsAttention: alerts.length > 0,
      };
    });

    return { data: schedule };
  }

  async getInvoices(
    customerId: string,
    tenantId: string,
    options: {
      page: number;
      limit: number;
      year?: number;
      from?: string;
      to?: string;
      status?: string;
    },
  ): Promise<{ data: unknown[]; meta: { total: number; page: number; limit: number } }> {
    const { page, limit } = options;

    const where: Record<string, unknown> = { customerId, tenantId, deletedAt: null };

    // Year filter
    if (options.year) {
      where.createdAt = {
        gte: new Date(`${options.year}-01-01`),
        lt: new Date(`${options.year + 1}-01-01`),
      };
    }

    // Date range filter (overrides year if both provided)
    if (options.from || options.to) {
      where.createdAt = {
        ...(options.from && { gte: new Date(options.from) }),
        ...(options.to && { lt: new Date(options.to + 'T23:59:59.999Z') }),
      };
    }

    // Status filter
    if (options.status) {
      where.status = options.status.toUpperCase();
    }

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          invoiceNumber: true,
          total: true,
          subtotal: true,
          taxAmount: true,
          status: true,
          createdAt: true,
          dueDate: true,
          paidAt: true,
          documentType: true,
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return { data: invoices, meta: { total, page, limit } };
  }

  async getInvoice(
    invoiceId: string,
    customerId: string,
    tenantId: string,
  ): Promise<{ data: Record<string, unknown> }> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, customerId, tenantId, deletedAt: null },
      include: { invoiceItems: true },
    });

    if (!invoice) {
      throw new NotFoundException('Fattura non trovata');
    }

    return { data: invoice as unknown as Record<string, unknown> };
  }

  async getNotifications(customerId: string, tenantId: string): Promise<{ data: unknown[] }> {
    const notifications = await this.prisma.notification.findMany({
      where: { customerId, tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return { data: notifications };
  }

  async markNotificationsRead(
    customerId: string,
    tenantId: string,
    ids: string[],
  ): Promise<{ data: { updated: number } }> {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('Nessuna notifica specificata');
    }

    const result = await this.prisma.notification.updateMany({
      where: {
        id: { in: ids },
        customerId,
        tenantId,
        deletedAt: null,
      },
      data: { status: 'READ' },
    });

    this.logger.log(`Marked ${result.count} notifications as read for customer ${customerId}`);

    return { data: { updated: result.count } };
  }

  async getDocuments(
    customerId: string,
    tenantId: string,
    type?: string,
  ): Promise<{ data: unknown[] }> {
    const invoices = await this.prisma.invoice.findMany({
      where: { customerId, tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const inspections = await this.prisma.inspection.findMany({
      where: { customerId, tenantId },
      include: { vehicle: true },
      orderBy: { startedAt: 'desc' },
      take: 20,
    });

    const docs: {
      id: string;
      type: string;
      title: string;
      date: Date;
      status: string;
      amount: number | null;
      pdfUrl: string | null;
    }[] = [
      ...invoices.map(inv => ({
        id: inv.id,
        type: 'INVOICE' as const,
        title: `Fattura ${inv.invoiceNumber}`,
        date: inv.createdAt,
        status: inv.status,
        amount: Number(inv.total),
        pdfUrl: inv.pdfUrl,
      })),
      ...inspections.map(ins => ({
        id: ins.id,
        type: 'INSPECTION_REPORT' as const,
        title: `Ispezione ${ins.vehicle?.make ?? ''} ${ins.vehicle?.model ?? ''}`.trim(),
        date: ins.startedAt,
        status: ins.status,
        amount: null,
        pdfUrl: null,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const filtered = type ? docs.filter(d => d.type === type) : docs;
    return { data: filtered };
  }

  async getWarranties(_customerId: string, _tenantId: string): Promise<{ data: unknown[] }> {
    // No warranty model exists yet — return empty with structure
    return { data: [] };
  }

  async getPayments(customerId: string, tenantId: string): Promise<{ data: unknown[] }> {
    const paidInvoices = await this.prisma.invoice.findMany({
      where: { customerId, tenantId, deletedAt: null, status: 'PAID' },
      orderBy: { paidAt: 'desc' },
      take: 50,
    });

    const payments = paidInvoices.map(inv => ({
      id: inv.id,
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      amount: Number(inv.total),
      currency: 'EUR',
      status: 'SUCCESS',
      method: inv.paymentMethod ?? null,
      paidAt: inv.paidAt,
      createdAt: inv.createdAt,
    }));

    return { data: payments };
  }

  async getPayment(
    paymentId: string,
    customerId: string,
    tenantId: string,
  ): Promise<{ data: Record<string, unknown> }> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: paymentId, customerId, tenantId, deletedAt: null },
      include: { invoiceItems: true },
    });

    if (!invoice) {
      throw new NotFoundException('Pagamento non trovato');
    }

    return {
      data: {
        id: invoice.id,
        status:
          invoice.status === 'PAID'
            ? 'SUCCESS'
            : invoice.status === 'OVERDUE'
              ? 'FAILED'
              : 'PENDING',
        amount: Number(invoice.total),
        currency: 'EUR',
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        method: invoice.paymentMethod ?? null,
        receiptUrl: invoice.pdfUrl,
        failureReason: null,
        createdAt: invoice.createdAt,
        updatedAt: invoice.updatedAt,
      },
    };
  }

  async getAccount(
    customerId: string,
    tenantId: string,
  ): Promise<{ data: Record<string, unknown> }> {
    return this.getProfile(customerId, tenantId);
  }

  async updateAccount(
    customerId: string,
    tenantId: string,
    data: { firstName?: string; lastName?: string; phone?: string },
  ): Promise<{ data: Record<string, unknown> }> {
    return this.updateProfile(customerId, tenantId, data);
  }

  async getEstimates(customerId: string, tenantId: string): Promise<{ data: unknown[] }> {
    const estimates = await this.prisma.estimate.findMany({
      where: { customerId, tenantId },
      include: { lines: { orderBy: { position: 'asc' } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return { data: estimates };
  }

  async getEstimate(
    estimateId: string,
    customerId: string,
    tenantId: string,
  ): Promise<{ data: Record<string, unknown> }> {
    const estimate = await this.prisma.estimate.findFirst({
      where: { id: estimateId, customerId, tenantId },
      include: { lines: { orderBy: { position: 'asc' } } },
    });

    if (!estimate) {
      throw new NotFoundException('Preventivo non trovato');
    }

    return { data: estimate as unknown as Record<string, unknown> };
  }

  async acceptEstimate(
    estimateId: string,
    customerId: string,
    tenantId: string,
  ): Promise<{ data: Record<string, unknown> }> {
    const estimate = await this.prisma.estimate.findFirst({
      where: { id: estimateId, customerId, tenantId },
    });

    if (!estimate) {
      throw new NotFoundException('Preventivo non trovato');
    }

    await this.prisma.estimate.updateMany({
      where: { id: estimateId, customerId, tenantId },
      data: { status: 'ACCEPTED', acceptedAt: new Date() },
    });

    const updated = await this.prisma.estimate.findFirst({
      where: { id: estimateId, customerId, tenantId },
      include: { lines: true },
    });

    this.logger.log(`Estimate ${estimateId} accepted by customer ${customerId}`);

    return { data: updated as unknown as Record<string, unknown> };
  }

  async rejectEstimate(
    estimateId: string,
    customerId: string,
    tenantId: string,
    reason?: string,
  ): Promise<{ data: Record<string, unknown> }> {
    const estimate = await this.prisma.estimate.findFirst({
      where: { id: estimateId, customerId, tenantId },
    });

    if (!estimate) {
      throw new NotFoundException('Preventivo non trovato');
    }

    await this.prisma.estimate.updateMany({
      where: { id: estimateId, customerId, tenantId },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        notes: reason || estimate.notes,
      },
    });

    const updated = await this.prisma.estimate.findFirst({
      where: { id: estimateId, customerId, tenantId },
      include: { lines: true },
    });

    this.logger.log(`Estimate ${estimateId} rejected by customer ${customerId}`);

    return { data: updated as unknown as Record<string, unknown> };
  }

  async getTracking(customerId: string, tenantId: string): Promise<{ data: unknown[] }> {
    const workOrders = await this.prisma.workOrder.findMany({
      where: {
        customerId,
        tenantId,
        deletedAt: null,
        status: { in: ['PENDING', 'IN_PROGRESS', 'WAITING_PARTS', 'CHECKED_IN'] },
      },
      include: { vehicle: true, services: true, parts: true },
      orderBy: { createdAt: 'desc' },
    });

    return { data: workOrders };
  }

  async getNotificationPreferences(
    customerId: string,
    _tenantId: string,
  ): Promise<{ data: unknown[] }> {
    const prefs = await this.prisma.customerNotificationPreference.findMany({
      where: { customerId },
    });

    return { data: prefs };
  }

  async updateNotificationPreferences(
    customerId: string,
    _tenantId: string,
    data: Record<string, boolean>,
  ): Promise<{ data: unknown[] }> {
    const results = [];

    for (const [channel, enabled] of Object.entries(data)) {
      const pref = await this.prisma.customerNotificationPreference.upsert({
        where: {
          customerId_channel: {
            customerId,
            channel: channel as 'SMS' | 'WHATSAPP' | 'EMAIL' | 'IN_APP',
          },
        },
        update: { enabled },
        create: {
          customerId,
          channel: channel as 'SMS' | 'WHATSAPP' | 'EMAIL' | 'IN_APP',
          enabled,
        },
      });
      results.push(pref);
    }

    return { data: results };
  }

  async getMessages(customerId: string, tenantId: string): Promise<{ data: unknown[] }> {
    const threads = await this.prisma.smsThread.findMany({
      where: { customerId, tenantId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    return { data: threads };
  }

  async sendMessage(
    customerId: string,
    tenantId: string,
    body: string,
  ): Promise<{ data: Record<string, unknown> }> {
    if (!body || body.trim().length === 0) {
      throw new BadRequestException('Il messaggio non può essere vuoto');
    }

    // Find existing thread or create one
    let thread = await this.prisma.smsThread.findFirst({
      where: { customerId, tenantId },
      orderBy: { lastMessageAt: 'desc' },
    });

    if (!thread) {
      // Get customer phone hash for thread creation
      const customer = await this.prisma.customer.findFirst({
        where: { id: customerId, tenantId, deletedAt: null },
        select: { phoneHash: true },
      });

      if (!customer) {
        throw new NotFoundException('Cliente non trovato');
      }

      thread = await this.prisma.smsThread.create({
        data: {
          tenantId,
          customerId,
          phoneHash: customer.phoneHash,
          lastMessageAt: new Date(),
        },
      });
    }

    const message = await this.prisma.smsMessage.create({
      data: {
        threadId: thread.id,
        direction: 'INBOUND',
        body: body.trim(),
        status: 'SENT',
      },
    });

    // Update thread's lastMessageAt
    await this.prisma.smsThread.update({
      where: { id: thread.id },
      data: { lastMessageAt: new Date() },
    });

    this.logger.log(`Message sent by customer ${customerId} in thread ${thread.id}`);

    return { data: message as unknown as Record<string, unknown> };
  }

  /**
   * G1: Generate invoice PDF
   */
  async getInvoicePdf(
    invoiceId: string,
    customerId: string,
    tenantId: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, customerId, tenantId, deletedAt: null },
      include: {
        invoiceItems: { orderBy: { position: 'asc' } },
        customer: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Fattura non trovata');
    }

    // Decrypt customer data
    const customer = this.decryptCustomer(invoice.customer);

    // Get tenant info for header (address/phone stored in settings JSON)
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, settings: true },
    });
    const settings = (tenant?.settings || {}) as Record<string, unknown>;

    // eslint-disable-next-line @typescript-eslint/no-var-requires,@typescript-eslint/no-require-imports
    const PDFDoc = require('pdfkit');
    const doc = new PDFDoc({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const filename = `fattura-${invoice.invoiceNumber}.pdf`;
        resolve({ buffer, filename });
      });
      doc.on('error', reject);

      // Header: shop info
      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .text(tenant?.name || 'MechMind OS', 50, 50);
      doc.fontSize(9).font('Helvetica');
      if (settings.address)
        doc.text(
          `${settings.address}, ${settings.postalCode || ''} ${settings.city || ''} (${settings.province || ''})`,
        );
      if (settings.vatNumber) doc.text(`P.IVA: ${settings.vatNumber}`);
      if (settings.phone) doc.text(`Tel: ${settings.phone}`);
      if (settings.email) doc.text(`Email: ${settings.email}`);

      doc.moveDown(1.5);

      // Invoice info
      doc.fontSize(14).font('Helvetica-Bold').text(`FATTURA ${invoice.invoiceNumber}`);
      doc.fontSize(10).font('Helvetica');
      doc.text(`Data: ${invoice.createdAt.toLocaleDateString('it-IT')}`);
      if (invoice.dueDate) doc.text(`Scadenza: ${invoice.dueDate.toLocaleDateString('it-IT')}`);
      doc.text(`Stato: ${invoice.status}`);
      doc.text(`Tipo: ${invoice.documentType}`);

      doc.moveDown();

      // Customer info
      doc.fontSize(11).font('Helvetica-Bold').text('Cliente:');
      doc.fontSize(10).font('Helvetica');
      doc.text(`${customer.firstName || ''} ${customer.lastName || ''}`.trim());
      if (customer.email) doc.text(`Email: ${customer.email}`);
      if (customer.phone) doc.text(`Tel: ${customer.phone}`);

      doc.moveDown(1.5);

      // Items table
      const tableTop = doc.y;
      const colX = { desc: 50, qty: 320, price: 380, vat: 440, total: 490 };

      doc.fontSize(9).font('Helvetica-Bold');
      doc.text('Descrizione', colX.desc, tableTop);
      doc.text('Qtà', colX.qty, tableTop);
      doc.text('Prezzo', colX.price, tableTop);
      doc.text('IVA%', colX.vat, tableTop);
      doc.text('Totale', colX.total, tableTop);

      doc
        .moveTo(50, tableTop + 14)
        .lineTo(545, tableTop + 14)
        .stroke();

      let y = tableTop + 20;
      doc.font('Helvetica');
      for (const item of invoice.invoiceItems) {
        doc.text(item.description, colX.desc, y, { width: 260 });
        doc.text(Number(item.quantity).toString(), colX.qty, y);
        doc.text(`€${Number(item.unitPrice).toFixed(2)}`, colX.price, y);
        doc.text(`${Number(item.vatRate)}%`, colX.vat, y);
        doc.text(`€${Number(item.total).toFixed(2)}`, colX.total, y);
        y += 16;
      }

      doc.moveTo(50, y).lineTo(545, y).stroke();
      y += 10;

      // Totals
      doc.font('Helvetica');
      doc.text(`Imponibile: €${Number(invoice.subtotal).toFixed(2)}`, colX.price, y);
      y += 14;
      doc.text(`IVA: €${Number(invoice.taxAmount).toFixed(2)}`, colX.price, y);
      y += 14;
      doc.font('Helvetica-Bold').fontSize(11);
      doc.text(`TOTALE: €${Number(invoice.total).toFixed(2)}`, colX.price, y);

      // Footer
      doc
        .fontSize(8)
        .font('Helvetica')
        .text('Documento generato da MechMind OS — mechmind.it', 50, 780, { align: 'center' });

      doc.end();
    });
  }

  /**
   * G3: Change password for portal customer
   */
  async changePassword(
    customerId: string,
    tenantId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    // Dynamic import for argon2
    const argon2 = await import('argon2');

    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      select: { id: true, passwordHash: true },
    });

    if (!customer) {
      throw new NotFoundException('Cliente non trovato');
    }

    if (!customer.passwordHash) {
      throw new BadRequestException('Nessuna password impostata per questo account');
    }

    // Verify current password
    const isValid = await argon2.verify(customer.passwordHash, currentPassword);
    if (!isValid) {
      throw new UnauthorizedException('Password corrente errata');
    }

    // Prevent same password
    if (currentPassword === newPassword) {
      throw new BadRequestException('La nuova password deve essere diversa dalla precedente');
    }

    // Hash new password
    const newHash = await argon2.hash(newPassword, {
      type: argon2.argon2id,
      memoryCost: 47104,
      timeCost: 1,
      parallelism: 1,
      hashLength: 32,
    });

    await this.prisma.customer.update({
      where: { id: customerId },
      data: { passwordHash: newHash },
    });

    this.logger.log(`Portal customer ${customerId} changed password`);

    return { success: true, message: 'Password aggiornata con successo' };
  }

  /**
   * G4: Vehicle history timeline
   */
  async getVehicleHistory(
    vehicleId: string,
    customerId: string,
    tenantId: string,
  ): Promise<{ data: { vehicle: Record<string, unknown>; timeline: Record<string, unknown>[] } }> {
    // Verify vehicle belongs to customer
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, customerId, tenantId },
      select: {
        id: true,
        licensePlate: true,
        make: true,
        model: true,
        year: true,
        revisionExpiry: true,
        insuranceExpiry: true,
        lastServiceDate: true,
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Veicolo non trovato');
    }

    // Aggregate timeline from multiple sources
    const timeline: Record<string, unknown>[] = [];

    // Work orders (maintenance/repair)
    const workOrders = await this.prisma.workOrder.findMany({
      where: { vehicleId, tenantId },
      select: { id: true, createdAt: true, status: true, diagnosis: true, totalCost: true },
      orderBy: { createdAt: 'desc' },
    });

    for (const wo of workOrders) {
      timeline.push({
        date: wo.createdAt,
        type: 'maintenance',
        title: wo.diagnosis || `Ordine di lavoro — ${wo.status}`,
        amount: wo.totalCost ? Number(wo.totalCost) : null,
        documentId: wo.id,
      });
    }

    // Invoices
    const invoices = await this.prisma.invoice.findMany({
      where: {
        customerId,
        tenantId,
        deletedAt: null,
        workOrderId: { in: workOrders.map(w => w.id) },
      },
      select: { id: true, createdAt: true, invoiceNumber: true, total: true, status: true },
      orderBy: { createdAt: 'desc' },
    });

    for (const inv of invoices) {
      timeline.push({
        date: inv.createdAt,
        type: 'invoice',
        title: `Fattura ${inv.invoiceNumber} — ${inv.status}`,
        amount: Number(inv.total),
        documentId: inv.id,
      });
    }

    // Inspections
    const inspections = await this.prisma.inspection.findMany({
      where: { vehicleId, tenantId },
      select: { id: true, startedAt: true, status: true },
      orderBy: { startedAt: 'desc' },
    });

    for (const insp of inspections) {
      timeline.push({
        date: insp.startedAt,
        type: 'inspection',
        title: `Ispezione — ${insp.status}`,
        outcome: insp.status,
        documentId: insp.id,
      });
    }

    // Bookings
    const bookings = await this.prisma.booking.findMany({
      where: { vehicleId, tenantId },
      select: { id: true, scheduledDate: true, status: true, notes: true },
      orderBy: { scheduledDate: 'desc' },
    });

    for (const bk of bookings) {
      timeline.push({
        date: bk.scheduledDate,
        type: 'booking',
        title: `Prenotazione — ${bk.status}`,
        documentId: bk.id,
      });
    }

    // Sort timeline by date descending
    timeline.sort(
      (a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime(),
    );

    return {
      data: {
        vehicle: vehicle as unknown as Record<string, unknown>,
        timeline,
      },
    };
  }
}
