/**
 * Warranty Service - MechMind OS Frontend (Multi-Tenant)
 *
 * All operations delegate to the NestJS backend API.
 * No direct database access from the frontend.
 *
 * @module lib/services/warrantyService
 * @version 4.0.0
 */

import { BACKEND_BASE } from '@/lib/config';
import { requireTenantId } from '@/lib/tenant/context';

const BACKEND_URL = BACKEND_BASE;
const TIMEOUT_MS = 15_000;

// =============================================================================
// Type Definitions
// =============================================================================

export enum WarrantyStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  EXPIRING_SOON = 'EXPIRING_SOON',
  PENDING = 'PENDING',
  CLAIMED = 'CLAIMED',
  VOID = 'VOID',
}

export enum ClaimStatus {
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PAID = 'PAID',
}

export enum WarrantyType {
  MANUFACTURER = 'MANUFACTURER',
  EXTENDED = 'EXTENDED',
  DEALER = 'DEALER',
  AS_IS = 'AS_IS',
}

export const WarrantyTypeValues = Object.values(WarrantyType) as string[];

export interface Warranty {
  id: string;
  tenantId: string;
  warrantyNumber: string;
  vehicleId: string;
  vehicleVin: string | null;
  coverageType: string;
  startDate: Date;
  expirationDate: Date;
  status: WarrantyStatus;
  mileageLimit: number | null;
  maxClaimAmount: number | null;
  deductibleAmount: number | null;
  alertsSent: Date[];
  alertEmailEnabled: boolean;
  alertSmsEnabled: boolean;
  alertDaysBeforeExpiry: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WarrantyClaim {
  id: string;
  tenantId: string;
  warrantyId: string;
  claimNumber: string;
  description: string;
  amount: number;
  approvedAmount?: number | null;
  laborHours?: number | null;
  partsCost?: number | null;
  laborCost?: number | null;
  status: ClaimStatus;
  evidencePhotos: string[];
  documents: string[];
  submittedDate: Date;
  reviewedDate: Date | null;
  resolvedDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  warranty?: {
    vehicle?: {
      make: string;
      model: string;
    };
  };
}

export interface CreateWarrantyDTO {
  vehicleId: string;
  type: WarrantyType;
  provider: string;
  startDate: Date | string;
  expirationDate: Date | string;
  coverageKm?: number | null;
  currentKm: number;
  maxCoverage: number;
  deductible: number;
  terms?: string;
  certificateUrl?: string;
}

export interface FileClaimDTO {
  issueDescription: string;
  estimatedCost: number;
  evidence?: string[];
}

export interface ReviewClaimDTO {
  decision: 'APPROVE' | 'REJECT';
  amount?: number;
  notes?: string;
  reviewedBy: string;
}

export interface RemainingCoverage {
  km: number | null;
  amount: number;
}

export interface WarrantyWithClaims {
  id: string;
  tenantId: string;
  warrantyNumber: string;
  vehicleId: string;
  coverageType: string;
  startDate: Date;
  expirationDate: Date;
  status: WarrantyStatus;
  mileageLimit: number | null;
  maxClaimAmount: number | null;
  deductibleAmount: number | null;
  createdAt: Date;
  updatedAt: Date;
  claims: WarrantyClaim[];
  vehicle?: {
    id: string;
    vin: string;
    make: string;
    model: string;
    year: number;
  };
}

// =============================================================================
// Error Types
// =============================================================================

export class WarrantyError extends Error {
  code: string;
  statusCode?: number;

  constructor(message: string, code: string, statusCode?: number) {
    super(message);
    this.name = 'WarrantyError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class WarrantyNotFoundError extends WarrantyError {
  constructor(warrantyId: string) {
    super(`Warranty with ID "${warrantyId}" not found`, 'WARRANTY_NOT_FOUND', 404);
    this.name = 'WarrantyNotFoundError';
  }
}

export class ClaimNotFoundError extends WarrantyError {
  constructor(claimId: string) {
    super(`Claim with ID "${claimId}" not found`, 'CLAIM_NOT_FOUND', 404);
    this.name = 'ClaimNotFoundError';
  }
}

export class InvalidWarrantyDataError extends WarrantyError {
  constructor(message: string) {
    super(message, 'INVALID_WARRANTY_DATA', 400);
    this.name = 'InvalidWarrantyDataError';
  }
}

export class InvalidClaimDataError extends WarrantyError {
  constructor(message: string) {
    super(message, 'INVALID_CLAIM_DATA', 400);
    this.name = 'InvalidClaimDataError';
  }
}

export class TenantRequiredError extends Error {
  constructor() {
    super('Tenant context is required for this operation');
    this.name = 'TenantRequiredError';
  }
}

export class UnauthorizedTenantAccessError extends WarrantyError {
  constructor() {
    super('Unauthorized access to tenant data', 'UNAUTHORIZED_TENANT_ACCESS', 403);
    this.name = 'UnauthorizedTenantAccessError';
  }
}

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
      const body = await res.json().catch(() => ({}));
      const msg =
        (body as { error?: { message?: string } })?.error?.message ||
        `Backend error: ${res.status}`;
      const code =
        (body as { error?: { code?: string } })?.error?.code || 'BACKEND_ERROR';

      // Throw specific error types based on code or status
      if (code === 'WARRANTY_NOT_FOUND') {
        throw new WarrantyNotFoundError('unknown');
      }
      if (code === 'CLAIM_NOT_FOUND') {
        throw new ClaimNotFoundError('unknown');
      }
      // Default 404 to WarrantyNotFoundError if no specific code
      if (res.status === 404 && code === 'BACKEND_ERROR') {
        throw new WarrantyNotFoundError('unknown');
      }
      if (code === 'INVALID_WARRANTY_DATA') {
        throw new InvalidWarrantyDataError(msg);
      }
      if (code === 'INVALID_CLAIM_DATA') {
        throw new InvalidClaimDataError(msg);
      }

      throw new WarrantyError(msg, code, res.status);
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
// Warranty Service Class
// =============================================================================

export class WarrantyService {
  async createWarranty(
    data: CreateWarrantyDTO,
    inputTenantId?: string
  ): Promise<WarrantyWithClaims> {
    const tenantId = await resolveTenantId(inputTenantId);
    return backendFetch<WarrantyWithClaims>('v1/warranties', {
      method: 'POST',
      body: JSON.stringify(data),
      tenantId,
    });
  }

  async getWarranty(
    warrantyId: string,
    inputTenantId?: string
  ): Promise<WarrantyWithClaims | null> {
    const tenantId = await resolveTenantId(inputTenantId);
    try {
      return await backendFetch<WarrantyWithClaims>(`v1/warranties/${warrantyId}`, {
        method: 'GET',
        tenantId,
      });
    } catch (error) {
      if (error instanceof WarrantyError && error.statusCode === 404) return null;
      throw error;
    }
  }

  async getWarrantyByVehicle(
    vehicleId: string,
    inputTenantId?: string
  ): Promise<WarrantyWithClaims | null> {
    const tenantId = await resolveTenantId(inputTenantId);
    try {
      return await backendFetch<WarrantyWithClaims>(
        `v1/warranties/vehicle/${vehicleId}`,
        { method: 'GET', tenantId }
      );
    } catch (error) {
      if (error instanceof WarrantyError && error.statusCode === 404) return null;
      throw error;
    }
  }

  async updateStatus(
    warrantyId: string,
    inputTenantId?: string
  ): Promise<WarrantyWithClaims> {
    const tenantId = await resolveTenantId(inputTenantId);
    return backendFetch<WarrantyWithClaims>(
      `v1/warranties/${warrantyId}/update-status`,
      { method: 'POST', tenantId }
    );
  }

  async updateAllStatuses(inputTenantId?: string): Promise<{ updated: number }> {
    const tenantId = await resolveTenantId(inputTenantId);
    return backendFetch<{ updated: number }>('v1/warranties/update-all-statuses', {
      method: 'POST',
      tenantId,
    });
  }

  async fileClaim(
    warrantyId: string,
    data: FileClaimDTO,
    inputTenantId?: string
  ): Promise<WarrantyClaim> {
    const tenantId = await resolveTenantId(inputTenantId);
    return backendFetch<WarrantyClaim>(`v1/warranties/${warrantyId}/claims`, {
      method: 'POST',
      body: JSON.stringify(data),
      tenantId,
    });
  }

  async reviewClaim(
    claimId: string,
    decision: 'APPROVE' | 'REJECT',
    amount?: number,
    notes?: string,
    reviewedBy?: string,
    inputTenantId?: string
  ): Promise<WarrantyClaim> {
    const tenantId = await resolveTenantId(inputTenantId);
    return backendFetch<WarrantyClaim>(`v1/warranties/claims/${claimId}/review`, {
      method: 'POST',
      body: JSON.stringify({ decision, amount, notes, reviewedBy }),
      tenantId,
    });
  }

  async markClaimPaid(
    claimId: string,
    inputTenantId?: string
  ): Promise<WarrantyClaim> {
    const tenantId = await resolveTenantId(inputTenantId);
    return backendFetch<WarrantyClaim>(`v1/warranties/claims/${claimId}/pay`, {
      method: 'POST',
      tenantId,
    });
  }

  async getExpiringWarranties(
    days: number,
    inputTenantId?: string
  ): Promise<WarrantyWithClaims[]> {
    const tenantId = await resolveTenantId(inputTenantId);
    return backendFetch<WarrantyWithClaims[]>(
      `v1/warranties/expiring?days=${days}`,
      { method: 'GET', tenantId }
    );
  }

  async getClaims(
    status?: ClaimStatus,
    inputTenantId?: string
  ): Promise<WarrantyClaim[]> {
    const tenantId = await resolveTenantId(inputTenantId);
    const params = status ? `?status=${status}` : '';
    return backendFetch<WarrantyClaim[]>(`v1/warranties/claims${params}`, {
      method: 'GET',
      tenantId,
    });
  }

  async getClaimsByWarranty(
    warrantyId: string,
    inputTenantId?: string
  ): Promise<WarrantyClaim[]> {
    const tenantId = await resolveTenantId(inputTenantId);
    return backendFetch<WarrantyClaim[]>(
      `v1/warranties/${warrantyId}/claims`,
      { method: 'GET', tenantId }
    );
  }

  async getClaim(
    claimId: string,
    inputTenantId?: string
  ): Promise<WarrantyClaim | null> {
    const tenantId = await resolveTenantId(inputTenantId);
    try {
      return await backendFetch<WarrantyClaim>(`v1/warranties/claims/${claimId}`, {
        method: 'GET',
        tenantId,
      });
    } catch (error) {
      if (error instanceof WarrantyError && error.statusCode === 404) return null;
      throw error;
    }
  }

  async getRemainingCoverage(
    warrantyId: string,
    inputTenantId?: string
  ): Promise<RemainingCoverage> {
    const tenantId = await resolveTenantId(inputTenantId);
    return backendFetch<RemainingCoverage>(
      `v1/warranties/${warrantyId}/remaining-coverage`,
      { method: 'GET', tenantId }
    );
  }

  async listWarranties(
    filters?: {
      vehicleId?: string;
      status?: WarrantyStatus;
      type?: WarrantyType;
    },
    inputTenantId?: string
  ): Promise<WarrantyWithClaims[]> {
    const tenantId = await resolveTenantId(inputTenantId);
    const params = new URLSearchParams();
    if (filters?.vehicleId) params.set('vehicleId', filters.vehicleId);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.type) params.set('type', filters.type);
    const qs = params.toString();
    return backendFetch<WarrantyWithClaims[]>(
      `v1/warranties${qs ? `?${qs}` : ''}`,
      { method: 'GET', tenantId }
    );
  }

  async updateWarranty(
    warrantyId: string,
    data: Partial<CreateWarrantyDTO>,
    inputTenantId?: string
  ): Promise<WarrantyWithClaims> {
    const tenantId = await resolveTenantId(inputTenantId);
    return backendFetch<WarrantyWithClaims>(`v1/warranties/${warrantyId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      tenantId,
    });
  }

  async deleteWarranty(
    warrantyId: string,
    inputTenantId?: string
  ): Promise<void> {
    const tenantId = await resolveTenantId(inputTenantId);
    await backendFetch<void>(`v1/warranties/${warrantyId}`, {
      method: 'DELETE',
      tenantId,
    });
  }

  async recordAlertSent(
    warrantyId: string,
    inputTenantId?: string
  ): Promise<WarrantyWithClaims> {
    const tenantId = await resolveTenantId(inputTenantId);
    return backendFetch<WarrantyWithClaims>(
      `v1/warranties/${warrantyId}/record-alert`,
      { method: 'POST', tenantId }
    );
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const warrantyService = new WarrantyService();

// =============================================================================
// Convenience Functions with Tenant Support
// =============================================================================

export const createWarranty = (data: CreateWarrantyDTO, tenantId?: string) =>
  warrantyService.createWarranty(data, tenantId);
export const getWarranty = (warrantyId: string, tenantId?: string) =>
  warrantyService.getWarranty(warrantyId, tenantId);
export const getWarrantyByVehicle = (vehicleId: string, tenantId?: string) =>
  warrantyService.getWarrantyByVehicle(vehicleId, tenantId);
export const updateWarrantyStatus = (warrantyId: string, tenantId?: string) =>
  warrantyService.updateStatus(warrantyId, tenantId);
export const fileClaim = (warrantyId: string, data: FileClaimDTO, tenantId?: string) =>
  warrantyService.fileClaim(warrantyId, data, tenantId);
export const reviewClaim = (
  claimId: string,
  decision: 'APPROVE' | 'REJECT',
  amount?: number,
  notes?: string,
  reviewedBy?: string,
  tenantId?: string
) => warrantyService.reviewClaim(claimId, decision, amount, notes, reviewedBy, tenantId);
export const markClaimPaid = (claimId: string, tenantId?: string) =>
  warrantyService.markClaimPaid(claimId, tenantId);
export const getExpiringWarranties = (days: number, tenantId?: string) =>
  warrantyService.getExpiringWarranties(days, tenantId);
export const getClaims = (status?: ClaimStatus, tenantId?: string) =>
  warrantyService.getClaims(status, tenantId);
export const getClaimsByWarranty = (warrantyId: string, tenantId?: string) =>
  warrantyService.getClaimsByWarranty(warrantyId, tenantId);
export const getClaim = (claimId: string, tenantId?: string) =>
  warrantyService.getClaim(claimId, tenantId);
export const getRemainingCoverage = (warrantyId: string, tenantId?: string) =>
  warrantyService.getRemainingCoverage(warrantyId, tenantId);
export const listWarranties = (
  filters?: Parameters<WarrantyService['listWarranties']>[0],
  tenantId?: string
) => warrantyService.listWarranties(filters, tenantId);
export const updateWarranty = (
  warrantyId: string,
  data: Partial<CreateWarrantyDTO>,
  tenantId?: string
) => warrantyService.updateWarranty(warrantyId, data, tenantId);
export const deleteWarranty = (warrantyId: string, tenantId?: string) =>
  warrantyService.deleteWarranty(warrantyId, tenantId);
export const updateAllWarrantyStatuses = (tenantId?: string) =>
  warrantyService.updateAllStatuses(tenantId);
export const recordAlertSent = (warrantyId: string, tenantId?: string) =>
  warrantyService.recordAlertSent(warrantyId, tenantId);

// =============================================================================
// Additional Compatibility Exports
// =============================================================================

export const createWarrantyClaim = fileClaim;

export async function getWarrantyByInspection(
  _inspectionId: string,
  _tenantId?: string
): Promise<WarrantyWithClaims | null> {
  return null;
}

export async function getWarrantyClaims(
  warrantyId: string,
  tenantId?: string
): Promise<WarrantyClaim[]> {
  const effectiveTenantId = tenantId || (await requireTenantId());
  return warrantyService.getClaimsByWarranty(warrantyId, effectiveTenantId);
}

export async function updateWarrantyAlerts(
  warrantyId: string,
  alertSettings: { email?: boolean; sms?: boolean; daysBefore?: number },
  tenantId?: string
): Promise<Warranty> {
  const effectiveTenantId = tenantId || (await requireTenantId());
  return backendFetch<Warranty>(`v1/warranties/${warrantyId}/alerts`, {
    method: 'PATCH',
    body: JSON.stringify(alertSettings),
    tenantId: effectiveTenantId,
  });
}
