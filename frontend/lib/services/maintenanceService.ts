/**
 * MechMind OS - Preventive Maintenance Service (Multi-Tenant)
 *
 * Service layer for managing vehicle preventive maintenance schedules.
 * All operations delegate to the NestJS backend API.
 *
 * @module lib/services/maintenanceService
 * @version 3.0.0
 */

import { BACKEND_BASE } from '@/lib/config';
import { requireTenantId } from '@/lib/tenant/context';

const BACKEND_URL = BACKEND_BASE;
const TIMEOUT_MS = 15_000;

// =============================================================================
// Type Definitions
// =============================================================================

export type MaintenanceType =
  | 'OIL_CHANGE'
  | 'TIRE_ROTATION'
  | 'BRAKE_CHECK'
  | 'FILTER'
  | 'INSPECTION'
  | 'BELTS'
  | 'BATTERY';

export type NotificationLevel = 'ALERT' | 'WARNING' | 'CRITICAL';

export interface InspectionFinding {
  id: string;
  category: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'OK';
}

export interface CreateMaintenanceScheduleInput {
  vehicleId: string;
  type: MaintenanceType;
  intervalKm: number;
  intervalMonths: number;
  lastServiceDate: Date;
  lastServiceKm: number;
  notificationLevel?: NotificationLevel;
}

export interface UpdateMaintenanceScheduleInput {
  intervalKm?: number;
  intervalMonths?: number;
  lastServiceDate?: Date;
  lastServiceKm?: number;
  nextDueDate?: Date;
  nextDueKm?: number;
  notificationLevel?: NotificationLevel;
}

export interface CompleteMaintenanceInput {
  currentKm: number;
  date?: Date;
  notes?: string;
}

export interface NextDueCalculation {
  nextDueDate: Date;
  nextDueKm: number;
  daysUntilDue: number;
  kmUntilDue: number;
  isOverdue: boolean;
}

export interface MaintenanceSummary {
  total: number;
  overdue: number;
  dueSoon: number;
  upcoming: number;
  byVehicle: Record<
    string,
    {
      vehicleInfo: string;
      total: number;
      overdue: number;
      upcoming: number;
    }
  >;
}

export interface PaginatedMaintenance {
  items: MaintenanceScheduleWithVehicle[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MaintenanceScheduleWithVehicle {
  id: string;
  tenantId: string;
  vehicleId: string;
  type: MaintenanceType;
  intervalKm: number;
  intervalMonths: number;
  lastServiceDate: Date;
  lastServiceKm: number;
  nextDueDate: Date;
  nextDueKm: number;
  daysUntilDue: number;
  kmUntilDue: number;
  isOverdue: boolean;
  notificationLevel: NotificationLevel;
  alertSentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  vehicle: {
    id: string;
    make: string;
    model: string;
    year: number;
    licensePlate: string | null;
    mileage: number | null;
  };
}

export interface MaintenanceFilters {
  vehicleId?: string;
  type?: MaintenanceType;
  isOverdue?: boolean;
  dueBefore?: Date;
  dueAfter?: Date;
  notificationLevel?: NotificationLevel;
  tenantId?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// =============================================================================
// Error Classes
// =============================================================================

export class MaintenanceNotFoundError extends Error {
  constructor(scheduleId: string) {
    super(`Maintenance schedule with ID "${scheduleId}" not found`);
    this.name = 'MaintenanceNotFoundError';
  }
}

export class MaintenanceValidationError extends Error {
  constructor(
    message: string,
    public field?: string
  ) {
    super(message);
    this.name = 'MaintenanceValidationError';
  }
}

export class VehicleNotFoundError extends Error {
  constructor(vehicleId: string) {
    super(`Vehicle with ID "${vehicleId}" not found`);
    this.name = 'VehicleNotFoundError';
  }
}

export class TenantRequiredError extends Error {
  constructor() {
    super('Tenant context is required for this operation');
    this.name = 'TenantRequiredError';
  }
}

// =============================================================================
// Logger
// =============================================================================

const logger = {
  debug: (message: string, meta?: object) => {
    if (process.env.NODE_ENV === 'development') {
      console.info(`[MaintenanceService] ${message}`, meta ? JSON.stringify(meta) : '');
    }
  },
  info: (message: string, meta?: object) => {
    console.info(`[MaintenanceService] ${message}`, meta ? JSON.stringify(meta) : '');
  },
  warn: (message: string, meta?: object) => {
    console.warn(`[MaintenanceService] ${message}`, meta ? JSON.stringify(meta) : '');
  },
  error: (message: string, error?: unknown, meta?: object) => {
    console.error(`[MaintenanceService] ${message}`, error, meta ? JSON.stringify(meta) : '');
  },
};

// =============================================================================
// Backend HTTP Helper
// =============================================================================

async function backendFetch<T>(
  path: string,
  options?: RequestInit & { tenantId?: string }
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };

  if (options?.tenantId) {
    headers['x-tenant-id'] = options.tenantId;
  }

  try {
    const res = await fetch(`${BACKEND_URL}/${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    if (!res.ok) {
      if (res.status === 404) {
        throw new MaintenanceNotFoundError('unknown');
      }
      const body = await res.json().catch(() => ({}));
      const msg = (body as { error?: { message?: string } })?.error?.message || `Backend error: ${res.status}`;
      throw new Error(msg);
    }

    const body = await res.json();
    return ((body as { data?: T }).data ?? body) as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

// =============================================================================
// Tenant Context Helper
// =============================================================================

async function resolveTenantId(inputTenantId?: string): Promise<string> {
  if (inputTenantId) {
    return inputTenantId;
  }

  try {
    return await requireTenantId();
  } catch {
    throw new TenantRequiredError();
  }
}

// =============================================================================
// Core Functions
// =============================================================================

export function calculateNextDue(
  lastKm: number,
  lastDate: Date,
  intervalKm: number,
  intervalMonths: number
): NextDueCalculation {
  logger.debug('Calculating next due', { lastKm, lastDate, intervalKm, intervalMonths });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextDueDate = new Date(lastDate);
  nextDueDate.setMonth(nextDueDate.getMonth() + intervalMonths);

  const nextDueKm = lastKm + intervalKm;

  const diffTime = nextDueDate.getTime() - today.getTime();
  const daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const kmUntilDue = intervalKm;

  const isOverdue = daysUntilDue < 0;

  return {
    nextDueDate,
    nextDueKm,
    daysUntilDue,
    kmUntilDue,
    isOverdue,
  };
}

export async function createMaintenanceSchedule(
  data: CreateMaintenanceScheduleInput,
  inputTenantId?: string
): Promise<MaintenanceScheduleWithVehicle> {
  const tenantId = await resolveTenantId(inputTenantId);

  logger.info('Creating maintenance schedule', {
    tenantId,
    vehicleId: data.vehicleId,
    type: data.type,
  });

  return backendFetch<MaintenanceScheduleWithVehicle>('v1/maintenance', {
    method: 'POST',
    body: JSON.stringify(data),
    tenantId,
  });
}

export async function getMaintenanceScheduleById(
  id: string,
  inputTenantId?: string
): Promise<MaintenanceScheduleWithVehicle> {
  const tenantId = await resolveTenantId(inputTenantId);

  return backendFetch<MaintenanceScheduleWithVehicle>(`v1/maintenance/${id}`, {
    method: 'GET',
    tenantId,
  });
}

export async function updateMaintenanceSchedule(
  id: string,
  data: UpdateMaintenanceScheduleInput,
  inputTenantId?: string
): Promise<MaintenanceScheduleWithVehicle> {
  const tenantId = await resolveTenantId(inputTenantId);

  return backendFetch<MaintenanceScheduleWithVehicle>(`v1/maintenance/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
    tenantId,
  });
}

export async function deleteMaintenanceSchedule(
  id: string,
  inputTenantId?: string
): Promise<{ success: boolean; deletedAt: Date }> {
  const tenantId = await resolveTenantId(inputTenantId);

  await backendFetch<void>(`v1/maintenance/${id}`, {
    method: 'DELETE',
    tenantId,
  });

  return { success: true, deletedAt: new Date() };
}

export async function listMaintenanceSchedules(
  filters: MaintenanceFilters = {},
  pagination: PaginationParams = {},
  inputTenantId?: string
): Promise<PaginatedMaintenance> {
  const tenantId = filters.tenantId || (await resolveTenantId(inputTenantId));

  const params = new URLSearchParams();
  if (filters.vehicleId) params.set('vehicleId', filters.vehicleId);
  if (filters.type) params.set('type', filters.type);
  if (filters.isOverdue !== undefined) params.set('isOverdue', String(filters.isOverdue));
  if (filters.notificationLevel) params.set('notificationLevel', filters.notificationLevel);
  if (filters.dueBefore) params.set('dueBefore', filters.dueBefore.toISOString());
  if (filters.dueAfter) params.set('dueAfter', filters.dueAfter.toISOString());
  if (pagination.page) params.set('page', String(pagination.page));
  if (pagination.limit) params.set('limit', String(pagination.limit));
  if (pagination.sortBy) params.set('sortBy', pagination.sortBy);
  if (pagination.sortOrder) params.set('sortOrder', pagination.sortOrder);

  const qs = params.toString();
  const path = `v1/maintenance${qs ? `?${qs}` : ''}`;

  return backendFetch<PaginatedMaintenance>(path, {
    method: 'GET',
    tenantId,
  });
}

/**
 * Get overdue maintenance items for a tenant
 */
export async function getOverdueItems(
  tenantIdOrVehicleId?: string,
  vehicleId?: string,
  inputTenantId?: string
): Promise<MaintenanceScheduleWithVehicle[]> {
  const tenantId = inputTenantId || tenantIdOrVehicleId || (await resolveTenantId());
  const actualVehicleId = vehicleId || (inputTenantId ? tenantIdOrVehicleId : undefined);

  const params = new URLSearchParams({ isOverdue: 'true' });
  if (actualVehicleId) params.set('vehicleId', actualVehicleId);

  return backendFetch<MaintenanceScheduleWithVehicle[]>(
    `v1/maintenance/overdue?${params}`,
    { method: 'GET', tenantId }
  );
}

export async function getUpcomingItems(
  days: number = 30,
  vehicleId?: string,
  inputTenantId?: string
): Promise<MaintenanceScheduleWithVehicle[]> {
  const tenantId = await resolveTenantId(inputTenantId);

  const params = new URLSearchParams({ days: String(days) });
  if (vehicleId) params.set('vehicleId', vehicleId);

  return backendFetch<MaintenanceScheduleWithVehicle[]>(
    `v1/maintenance/upcoming?${params}`,
    { method: 'GET', tenantId }
  );
}

export async function markAsCompleted(
  scheduleId: string,
  data: CompleteMaintenanceInput,
  inputTenantId?: string
): Promise<MaintenanceScheduleWithVehicle> {
  const tenantId = await resolveTenantId(inputTenantId);

  return backendFetch<MaintenanceScheduleWithVehicle>(
    `v1/maintenance/${scheduleId}/complete`,
    {
      method: 'POST',
      body: JSON.stringify(data),
      tenantId,
    }
  );
}

export async function checkOverdueStatus(inputTenantId?: string): Promise<{
  updated: number;
  newlyOverdue: number;
  alertsToSend: MaintenanceScheduleWithVehicle[];
}> {
  const tenantId = await resolveTenantId(inputTenantId);

  return backendFetch<{
    updated: number;
    newlyOverdue: number;
    alertsToSend: MaintenanceScheduleWithVehicle[];
  }>('v1/maintenance/check-overdue', {
    method: 'POST',
    tenantId,
  });
}

export async function getMaintenanceSummary(inputTenantId?: string): Promise<MaintenanceSummary> {
  const tenantId = await resolveTenantId(inputTenantId);

  return backendFetch<MaintenanceSummary>('v1/maintenance/summary', {
    method: 'GET',
    tenantId,
  });
}

export async function createFromInspection(
  inspectionId: string,
  findings: InspectionFinding[],
  inputTenantId?: string
): Promise<MaintenanceScheduleWithVehicle[]> {
  const tenantId = await resolveTenantId(inputTenantId);

  return backendFetch<MaintenanceScheduleWithVehicle[]>(
    'v1/maintenance/from-inspection',
    {
      method: 'POST',
      body: JSON.stringify({ inspectionId, findings }),
      tenantId,
    }
  );
}
