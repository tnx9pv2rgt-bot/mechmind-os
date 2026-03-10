import { SetMetadata } from '@nestjs/common';
import { UserRole, ROLES_KEY } from '../guards/roles.guard';

/**
 * Decorator to specify required roles for a route handler
 * @param roles Array of roles that can access this route
 * @example
 * @Roles(UserRole.ADMIN, UserRole.MANAGER)
 * @Post('users')
 * createUser() { ... }
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Decorator to allow only admin access
 */
export const AdminOnly = () => Roles(UserRole.ADMIN);

/**
 * Decorator to allow manager and admin access
 */
export const ManagerAndAbove = () => Roles(UserRole.ADMIN, UserRole.MANAGER);

/**
 * Decorator to allow all authenticated users
 */
export const AllRoles = () =>
  Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MECHANIC, UserRole.RECEPTIONIST);
