import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to extract the current tenant ID from the request
 * @example
 * @Get('bookings')
 * getBookings(@TenantId() tenantId: string) {
 *   return this.bookingService.findByTenant(tenantId);
 * }
 */
export const TenantId = createParamDecorator((data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest();
  return request.tenantId || request.user?.tenantId;
});
