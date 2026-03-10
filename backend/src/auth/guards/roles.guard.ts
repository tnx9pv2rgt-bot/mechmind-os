import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser } from '../strategies/jwt.strategy';

export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  MECHANIC = 'MECHANIC',
  RECEPTIONIST = 'RECEPTIONIST',
}

export const ROLES_KEY = 'roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required roles from decorator
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user has required role
    const hasRole = requiredRoles.some(role => user.role === role);

    if (!hasRole) {
      throw new ForbiddenException(`Access denied. Required roles: ${requiredRoles.join(', ')}`);
    }

    return true;
  }

  /**
   * Check role hierarchy - higher roles can access lower role endpoints
   */
  private checkRoleHierarchy(userRole: string, requiredRole: UserRole): boolean {
    const roleHierarchy: Record<string, number> = {
      [UserRole.ADMIN]: 4,
      [UserRole.MANAGER]: 3,
      [UserRole.MECHANIC]: 2,
      [UserRole.RECEPTIONIST]: 1,
    };

    const userLevel = roleHierarchy[userRole] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;

    return userLevel >= requiredLevel;
  }
}
