import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from '../strategies/jwt.strategy';

/**
 * Factory function to extract the current authenticated user from the request
 * Exported for testing purposes
 */
export const currentUserFactory = (
  data: keyof AuthenticatedUser | undefined,
  ctx: ExecutionContext,
): AuthenticatedUser | any => {
  const request = ctx.switchToHttp().getRequest();
  const user = request.user as AuthenticatedUser;

  if (!user) {
    return null;
  }

  // If specific field requested, return only that field
  if (data) {
    return user[data];
  }

  return user;
};

/**
 * Decorator to extract the current authenticated user from the request
 * @example
 * @Get('profile')
 * getProfile(@CurrentUser() user: AuthenticatedUser) {
 *   return this.usersService.findById(user.userId);
 * }
 */
export const CurrentUser = createParamDecorator(currentUserFactory);

/**
 * Factory function to extract the current tenant ID from the request
 * Exported for testing purposes
 */
export const currentTenantFactory = (data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest();
  return request.tenantId || request.user?.tenantId;
};

/**
 * Decorator to extract the current tenant ID from the request
 * @example
 * @Get('bookings')
 * getBookings(@CurrentTenant() tenantId: string) {
 *   return this.bookingService.findByTenant(tenantId);
 * }
 */
export const CurrentTenant = createParamDecorator(currentTenantFactory);
