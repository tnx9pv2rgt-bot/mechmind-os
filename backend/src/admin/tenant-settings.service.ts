import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { Prisma } from '@prisma/client';
import { UpdateTenantSettingsDto } from './dto/update-tenant-settings.dto';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';

export interface TenantSettings {
  ragioneSociale?: string;
  partitaIva?: string;
  codiceFiscale?: string;
  sdiCode?: string;
  pecEmail?: string;
  regimeFiscale?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  province?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  defaultVatRate?: number;
  invoiceNumberFormat?: string;
  defaultPaymentTerms?: string;
  currency?: string;
  slotDurationMinutes?: number;
  numberOfBays?: number;
  businessHours?: Record<
    string,
    { open: string; close: string; lunchStart?: string; lunchEnd?: string } | null
  >;
  closedDates?: string[];
  partMarkupMatrix?: {
    rules: Array<{ maxCostPrice: number; markupPercent: number }>;
  };
  onboardingCompleted?: boolean;
}

export interface OnboardingSteps {
  ragioneSociale: boolean;
  partitaIva: boolean;
  businessHours: boolean;
  numberOfBays: boolean;
  slotDurationMinutes: boolean;
  defaultVatRate: boolean;
  invoiceNumberFormat: boolean;
  currency: boolean;
}

export interface OnboardingStatus {
  completed: boolean;
  steps: OnboardingSteps;
}

@Injectable()
export class TenantSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(tenantId: string): Promise<TenantSettings> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }

    return (tenant.settings ?? {}) as TenantSettings;
  }

  async updateSettings(tenantId: string, dto: UpdateTenantSettingsDto): Promise<TenantSettings> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }

    const currentSettings = (tenant.settings ?? {}) as Record<string, unknown>;
    const updatedSettings = { ...currentSettings };

    // Merge only provided fields
    for (const [key, value] of Object.entries(dto)) {
      if (value !== undefined) {
        updatedSettings[key] = value;
      }
    }

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { settings: updatedSettings as Prisma.InputJsonValue },
      select: { settings: true },
    });

    return (updated.settings ?? {}) as TenantSettings;
  }

  async completeOnboarding(tenantId: string, dto: CompleteOnboardingDto): Promise<TenantSettings> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }

    const currentSettings = (tenant.settings ?? {}) as Record<string, unknown>;
    const updatedSettings = { ...currentSettings };

    for (const [key, value] of Object.entries(dto)) {
      if (value !== undefined) {
        updatedSettings[key] = value;
      }
    }

    updatedSettings.onboardingCompleted = true;

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { settings: updatedSettings as Prisma.InputJsonValue },
      select: { settings: true },
    });

    return (updated.settings ?? {}) as TenantSettings;
  }

  async getOnboardingStatus(tenantId: string): Promise<OnboardingStatus> {
    const settings = await this.getSettings(tenantId);

    const steps: OnboardingSteps = {
      ragioneSociale: !!settings.ragioneSociale,
      partitaIva: !!settings.partitaIva,
      businessHours: !!settings.businessHours && Object.keys(settings.businessHours).length > 0,
      numberOfBays: !!settings.numberOfBays,
      slotDurationMinutes: !!settings.slotDurationMinutes,
      defaultVatRate: settings.defaultVatRate !== undefined && settings.defaultVatRate !== null,
      invoiceNumberFormat: !!settings.invoiceNumberFormat,
      currency: !!settings.currency,
    };

    return {
      completed: !!settings.onboardingCompleted,
      steps,
    };
  }

  async updateLogo(tenantId: string, logoUrl: string): Promise<TenantSettings> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }

    const currentSettings = (tenant.settings ?? {}) as Record<string, unknown>;
    currentSettings.logoUrl = logoUrl;

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { settings: currentSettings as Prisma.InputJsonValue },
      select: { settings: true },
    });

    return (updated.settings ?? {}) as TenantSettings;
  }
}
