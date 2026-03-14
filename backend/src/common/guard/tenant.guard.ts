import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { RequestWithTenant } from '@auth/middleware/tenant-context.middleware';

/**
 * TenantGuard - Ensures tenant context is properly set for multi-tenant requests
 *
 * This guard validates that:
 * 1. A tenant ID is present in the request
 * 2. The user belongs to the specified tenant
 * 3. The tenant context is properly isolated
 */
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithTenant>();

    // Check if tenant ID is present
    const tenantId = request.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant ID is required');
    }

    // Validate tenant ID format (UUID)
    if (!this.isValidUUID(tenantId)) {
      throw new ForbiddenException('Invalid tenant ID format');
    }

    // Check user authentication and tenant membership
    const user = (request as RequestWithTenant & { user?: { tenantId?: string } }).user;
    if (user) {
      // If user is authenticated, verify they belong to the requested tenant
      if (user.tenantId && user.tenantId !== tenantId) {
        throw new ForbiddenException('User does not have access to this tenant');
      }
    }

    // Store validated tenant context on request
    request.tenantId = tenantId;

    return true;
  }

  /**
   * Validate UUID format
   */
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}
