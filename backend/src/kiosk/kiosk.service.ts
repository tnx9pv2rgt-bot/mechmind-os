import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@common/services/prisma.service';
import { BookingStatus } from '@prisma/client';

export interface ShopStatus {
  baysOccupied: number;
  baysTotal: number;
  estimatedWaitMinutes: number;
  queueSize: number;
}

export interface KioskBooking {
  id: string;
  scheduledDate: Date;
  durationMinutes: number;
  status: BookingStatus;
  vehiclePlate: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  services: string[];
}

@Injectable()
export class KioskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Cerca prenotazioni di oggi tramite hash del telefono
   */
  async findBookingByPhone(tenantId: string, phoneHash: string): Promise<KioskBooking[]> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const customers = await this.prisma.customerEncrypted.findMany({
      where: {
        tenantId,
        phoneHash,
      },
      select: { id: true },
    });

    if (customers.length === 0) {
      return [];
    }

    const customerIds = customers.map(c => c.id);

    const bookings = await this.prisma.booking.findMany({
      where: {
        tenantId,
        customerEncryptedId: { in: customerIds },
        scheduledDate: { gte: todayStart, lte: todayEnd },
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        deletedAt: null,
      },
      include: {
        vehicle: { select: { licensePlate: true, make: true, model: true } },
        services: { include: { service: { select: { name: true } } } },
      },
      orderBy: { scheduledDate: 'asc' },
    });

    return bookings.map(b => this.mapBooking(b));
  }

  /**
   * Cerca prenotazioni di oggi tramite targa
   */
  async findBookingByPlate(tenantId: string, licensePlate: string): Promise<KioskBooking[]> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const normalizedPlate = licensePlate.toUpperCase().replace(/[\s-]/g, '');

    const bookings = await this.prisma.booking.findMany({
      where: {
        tenantId,
        vehicle: { licensePlate: normalizedPlate },
        scheduledDate: { gte: todayStart, lte: todayEnd },
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        deletedAt: null,
      },
      include: {
        vehicle: { select: { licensePlate: true, make: true, model: true } },
        services: { include: { service: { select: { name: true } } } },
      },
      orderBy: { scheduledDate: 'asc' },
    });

    return bookings.map(b => this.mapBooking(b));
  }

  /**
   * Check-in del cliente: segna la prenotazione come CHECKED_IN
   */
  async checkIn(
    tenantId: string,
    bookingId: string,
    customerNotes?: string,
  ): Promise<KioskBooking> {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, tenantId, deletedAt: null },
      include: {
        vehicle: { select: { licensePlate: true, make: true, model: true } },
        services: { include: { service: { select: { name: true } } } },
      },
    });

    if (!booking) {
      throw new NotFoundException(`Prenotazione ${bookingId} non trovata`);
    }

    if (booking.status !== BookingStatus.CONFIRMED && booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException(
        `Impossibile effettuare il check-in: stato attuale ${booking.status}`,
      );
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CHECKED_IN,
        notes: customerNotes
          ? `${booking.notes ?? ''}\n[KIOSK] ${customerNotes}`.trim()
          : booking.notes,
        events: {
          create: {
            eventType: 'CHECKED_IN',
            payload: {
              source: 'KIOSK',
              customerNotes: customerNotes ?? null,
              checkedInAt: new Date().toISOString(),
            },
          },
        },
      },
      include: {
        vehicle: { select: { licensePlate: true, make: true, model: true } },
        services: { include: { service: { select: { name: true } } } },
      },
    });

    this.eventEmitter.emit('booking.checked_in', {
      bookingId,
      tenantId,
      source: 'KIOSK',
      checkedInAt: new Date(),
    });

    return this.mapBooking(updated);
  }

  /**
   * Stato corrente dell'officina: bay occupate, attesa stimata, coda
   */
  async getShopStatus(tenantId: string): Promise<ShopStatus> {
    const shopFloors = await this.prisma.shopFloor.findMany({
      where: { tenantId },
      include: { bays: true },
    });

    const allBays = shopFloors.flatMap(sf => sf.bays);
    const baysTotal = allBays.length;
    const baysOccupied = allBays.filter(b => b.status === 'OCCUPIED').length;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const queueSize = await this.prisma.booking.count({
      where: {
        tenantId,
        scheduledDate: { gte: todayStart, lte: todayEnd },
        status: { in: [BookingStatus.CHECKED_IN, BookingStatus.CONFIRMED] },
        deletedAt: null,
      },
    });

    const avgDuration = 45;
    const estimatedWaitMinutes =
      baysTotal > 0
        ? Math.ceil((queueSize / Math.max(baysTotal - baysOccupied, 1)) * avgDuration)
        : 0;

    return {
      baysOccupied,
      baysTotal,
      estimatedWaitMinutes,
      queueSize,
    };
  }

  /**
   * Valida la chiave API del kiosk
   */
  async validateKioskKey(kioskKey: string): Promise<string | null> {
    const crypto = await import('crypto');
    const keyHash = crypto.createHash('sha256').update(kioskKey).digest('hex');

    const tenant = await this.prisma.tenant.findFirst({
      where: { apiKeyHash: keyHash, isActive: true },
      select: { id: true },
    });

    return tenant?.id ?? null;
  }

  private mapBooking(booking: {
    id: string;
    scheduledDate: Date;
    durationMinutes: number;
    status: BookingStatus;
    vehicle: { licensePlate: string; make: string; model: string } | null;
    services: Array<{ service: { name: string } | null }>;
  }): KioskBooking {
    return {
      id: booking.id,
      scheduledDate: booking.scheduledDate,
      durationMinutes: booking.durationMinutes,
      status: booking.status,
      vehiclePlate: booking.vehicle?.licensePlate ?? null,
      vehicleMake: booking.vehicle?.make ?? null,
      vehicleModel: booking.vehicle?.model ?? null,
      services: booking.services.filter(s => s.service !== null).map(s => s.service!.name),
    };
  }
}
