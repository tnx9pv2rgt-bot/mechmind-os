import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@common/services/prisma.service';
import { Prisma } from '@prisma/client';
import { PredictionFilterDto } from './dto/prediction-filter.dto';

export interface PredictionResult {
  id: string;
  vehicleId: string;
  customerId: string;
  serviceType: string;
  predictedDate: Date;
  predictedMileage: number | null;
  confidence: Prisma.Decimal;
  isBooked: boolean;
  bookingId: string | null;
  notificationSent: boolean;
}

export interface MaintenanceScheduleEntry {
  serviceType: string;
  description: string;
  intervalKm: number | null;
  intervalMonths: number | null;
  estimatedCostCents: Prisma.Decimal | null;
  lastDone: Date | null;
  lastMileage: number | null;
  nextDueDate: Date | null;
  nextDueMileage: number | null;
  isOverdue: boolean;
}

@Injectable()
export class PredictiveMaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Predici i prossimi interventi per un veicolo basandosi su marca/modello/anno/km/storico
   */
  // eslint-disable-next-line sonarjs/cognitive-complexity
  async predictForVehicle(tenantId: string, vehicleId: string): Promise<PredictionResult[]> {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, tenantId, deletedAt: null },
    });

    if (!vehicle) {
      throw new NotFoundException(`Veicolo ${vehicleId} non trovato`);
    }

    // Trova template di manutenzione per marca/modello/anno
    const templates = await this.prisma.maintenanceScheduleTemplate.findMany({
      where: {
        make: vehicle.make,
        model: vehicle.model,
        ...(vehicle.year ? { yearFrom: { lte: vehicle.year }, yearTo: { gte: vehicle.year } } : {}),
      },
    });

    // Trova ultimo intervento per ogni tipo di servizio
    const completedOrders = await this.prisma.workOrder.findMany({
      where: {
        tenantId,
        vehicleId,
        status: { in: ['COMPLETED', 'INVOICED'] },
      },
      orderBy: { actualCompletionTime: 'desc' },
      select: {
        diagnosis: true,
        actualCompletionTime: true,
        mileageIn: true,
        createdAt: true,
      },
    });

    // Trova previsioni esistenti per non duplicare
    const existingPredictions = await this.prisma.predictedMaintenance.findMany({
      where: { tenantId, vehicleId },
    });

    const existingServiceTypes = new Set(existingPredictions.map(p => p.serviceType));
    const now = new Date();
    const predictions: PredictionResult[] = [];

    for (const template of templates) {
      if (existingServiceTypes.has(template.serviceType)) {
        const existing = existingPredictions.find(p => p.serviceType === template.serviceType);
        if (existing) {
          predictions.push(this.mapPrediction(existing));
        }
        continue;
      }

      // Calcola prossima data prevista
      const lastService = completedOrders.find(wo =>
        wo.diagnosis?.toUpperCase().includes(template.serviceType.replace(/_/g, ' ')),
      );

      let predictedDate: Date;
      let predictedMileage: number | null = null;

      if (lastService?.actualCompletionTime && template.intervalMonths) {
        predictedDate = new Date(lastService.actualCompletionTime);
        predictedDate.setMonth(predictedDate.getMonth() + template.intervalMonths);
      } else if (template.intervalMonths) {
        predictedDate = new Date(now);
        predictedDate.setMonth(predictedDate.getMonth() + template.intervalMonths);
      } else {
        predictedDate = new Date(now);
        predictedDate.setMonth(predictedDate.getMonth() + 12);
      }

      if (template.intervalKm && vehicle.mileage) {
        const lastMileage = lastService?.mileageIn ?? vehicle.mileage;
        predictedMileage = lastMileage + template.intervalKm;
      }

      // Confidence basata su dati disponibili
      let confidence = 0.5;
      if (lastService) confidence += 0.2;
      if (vehicle.mileage) confidence += 0.1;
      if (vehicle.year) confidence += 0.1;

      // Cerca customer dal veicolo
      const customerId = vehicle.customerId ?? '';

      if (!customerId) continue;

      const prediction = await this.prisma.predictedMaintenance.create({
        data: {
          tenantId,
          vehicleId,
          customerId,
          serviceType: template.serviceType,
          predictedDate,
          predictedMileage,
          confidence: new Prisma.Decimal(Math.min(confidence, 0.99)),
        },
      });

      predictions.push(this.mapPrediction(prediction));
    }

    // Include anche previsioni esistenti non coperte dai template
    for (const existing of existingPredictions) {
      if (!predictions.find(p => p.id === existing.id)) {
        predictions.push(this.mapPrediction(existing));
      }
    }

    return predictions.sort(
      (a, b) => new Date(a.predictedDate).getTime() - new Date(b.predictedDate).getTime(),
    );
  }

  /**
   * Piano manutenzione: confronta schedule del costruttore vs interventi effettuati
   */
  async getMaintenanceSchedule(
    tenantId: string,
    vehicleId: string,
  ): Promise<MaintenanceScheduleEntry[]> {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, tenantId, deletedAt: null },
    });

    if (!vehicle) {
      throw new NotFoundException(`Veicolo ${vehicleId} non trovato`);
    }

    const templates = await this.prisma.maintenanceScheduleTemplate.findMany({
      where: {
        make: vehicle.make,
        model: vehicle.model,
        ...(vehicle.year ? { yearFrom: { lte: vehicle.year }, yearTo: { gte: vehicle.year } } : {}),
      },
    });

    const completedOrders = await this.prisma.workOrder.findMany({
      where: {
        tenantId,
        vehicleId,
        status: { in: ['COMPLETED', 'INVOICED'] },
      },
      orderBy: { actualCompletionTime: 'desc' },
      select: {
        diagnosis: true,
        actualCompletionTime: true,
        mileageIn: true,
      },
    });

    const now = new Date();

    return templates.map(template => {
      const lastService = completedOrders.find(wo =>
        wo.diagnosis?.toUpperCase().includes(template.serviceType.replace(/_/g, ' ')),
      );

      let nextDueDate: Date | null = null;
      let nextDueMileage: number | null = null;

      if (lastService?.actualCompletionTime && template.intervalMonths) {
        nextDueDate = new Date(lastService.actualCompletionTime);
        nextDueDate.setMonth(nextDueDate.getMonth() + template.intervalMonths);
      }

      if (lastService?.mileageIn && template.intervalKm) {
        nextDueMileage = lastService.mileageIn + template.intervalKm;
      }

      const isOverdue =
        (nextDueDate !== null && nextDueDate < now) ||
        (nextDueMileage !== null && vehicle.mileage !== null && nextDueMileage < vehicle.mileage);

      return {
        serviceType: template.serviceType,
        description: template.description,
        intervalKm: template.intervalKm,
        intervalMonths: template.intervalMonths,
        estimatedCostCents: template.estimatedCostCents,
        lastDone: lastService?.actualCompletionTime ?? null,
        lastMileage: lastService?.mileageIn ?? null,
        nextDueDate,
        nextDueMileage,
        isOverdue,
      };
    });
  }

  /**
   * Lista previsioni con filtri
   */
  async getPredictions(
    tenantId: string,
    filters?: PredictionFilterDto,
  ): Promise<{ predictions: PredictionResult[]; total: number }> {
    const where: Prisma.PredictedMaintenanceWhereInput = { tenantId };

    if (filters?.vehicleId) where.vehicleId = filters.vehicleId;
    if (filters?.customerId) where.customerId = filters.customerId;
    if (filters?.serviceType) where.serviceType = filters.serviceType;
    if (filters?.unbookedOnly) where.bookedAt = null;

    if (filters?.fromDate || filters?.toDate) {
      where.predictedDate = {};
      if (filters?.fromDate) where.predictedDate.gte = new Date(filters.fromDate);
      if (filters?.toDate) where.predictedDate.lte = new Date(filters.toDate);
    }

    const limit = filters?.limit ?? 50;
    const offset = filters?.offset ?? 0;

    const [predictions, total] = await Promise.all([
      this.prisma.predictedMaintenance.findMany({
        where,
        orderBy: { predictedDate: 'asc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.predictedMaintenance.count({ where }),
    ]);

    return {
      predictions: predictions.map(p => this.mapPrediction(p)),
      total,
    };
  }

  /**
   * Crea una prenotazione da una previsione
   */
  async createBookingFromPrediction(
    tenantId: string,
    predictionId: string,
  ): Promise<{ predictionId: string; bookingId: string }> {
    const prediction = await this.prisma.predictedMaintenance.findFirst({
      where: { id: predictionId, tenantId },
    });

    if (!prediction) {
      throw new NotFoundException(`Previsione ${predictionId} non trovata`);
    }

    if (prediction.bookedAt) {
      throw new BadRequestException('Previsione gia prenotata');
    }

    // Trova uno slot disponibile per la data prevista
    const targetDate = new Date(prediction.predictedDate);
    targetDate.setHours(9, 0, 0, 0);
    const targetEnd = new Date(targetDate);
    targetEnd.setHours(10, 0, 0, 0);

    const slot = await this.prisma.bookingSlot.create({
      data: {
        tenantId,
        startTime: targetDate,
        endTime: targetEnd,
        status: 'BOOKED',
      },
    });

    const booking = await this.prisma.booking.create({
      data: {
        tenantId,
        customerId: prediction.customerId,
        vehicleId: prediction.vehicleId,
        scheduledDate: targetDate,
        durationMinutes: 60,
        notes: `[PREDITTIVO] ${prediction.serviceType.replace(/_/g, ' ')}`,
        source: 'WEB',
        slotId: slot.id,
      },
    });

    await this.prisma.predictedMaintenance.update({
      where: { id: predictionId },
      data: {
        bookedAt: new Date(),
        bookingId: booking.id,
      },
    });

    return { predictionId, bookingId: booking.id };
  }

  /**
   * Invia promemoria per manutenzioni in scadenza
   */
  async sendMaintenanceReminders(tenantId: string): Promise<{ sent: number }> {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const duePredictions = await this.prisma.predictedMaintenance.findMany({
      where: {
        tenantId,
        predictedDate: { gte: now, lte: thirtyDaysFromNow },
        bookedAt: null,
        notificationSentAt: null,
      },
    });

    let sent = 0;

    for (const prediction of duePredictions) {
      await this.prisma.predictedMaintenance.update({
        where: { id: prediction.id },
        data: { notificationSentAt: new Date() },
      });
      sent++;
    }

    return { sent };
  }

  private mapPrediction(prediction: {
    id: string;
    vehicleId: string;
    customerId: string;
    serviceType: string;
    predictedDate: Date;
    predictedMileage: number | null;
    confidence: Prisma.Decimal;
    bookedAt: Date | null;
    bookingId: string | null;
    notificationSentAt: Date | null;
  }): PredictionResult {
    return {
      id: prediction.id,
      vehicleId: prediction.vehicleId,
      customerId: prediction.customerId,
      serviceType: prediction.serviceType,
      predictedDate: prediction.predictedDate,
      predictedMileage: prediction.predictedMileage,
      confidence: prediction.confidence,
      isBooked: prediction.bookedAt !== null,
      bookingId: prediction.bookingId,
      notificationSent: prediction.notificationSentAt !== null,
    };
  }
}
