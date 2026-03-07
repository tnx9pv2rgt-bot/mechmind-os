/**
 * Tests for auth/index.ts exports
 */

describe('Auth Module Index Exports', () => {
  it('should export all required modules', async () => {
    // Dynamic import to test exports
    const indexModule = await import('../index');
    
    // Verify all expected exports are present
    expect(indexModule.AuthModule).toBeDefined();
    expect(indexModule.AuthService).toBeDefined();
    // AuthController is not exported from index.ts (internal use only)
    expect(indexModule.JwtStrategy).toBeDefined();
    expect(indexModule.JwtAuthGuard).toBeDefined();
    expect(indexModule.RolesGuard).toBeDefined();
    expect(indexModule.Roles).toBeDefined();
    expect(indexModule.UserRole).toBeDefined();
    expect(indexModule.CurrentUser).toBeDefined();
    expect(indexModule.TenantContextMiddleware).toBeDefined();
  });

  it('should re-export AuthModule', async () => {
    const { AuthModule } = await import('../index');
    const { AuthModule: OriginalAuthModule } = await import('../auth.module');
    
    expect(AuthModule).toBe(OriginalAuthModule);
  });

  it('should re-export AuthService', async () => {
    const { AuthService } = await import('../index');
    const { AuthService: OriginalAuthService } = await import('../services/auth.service');
    
    expect(AuthService).toBe(OriginalAuthService);
  });

  it('should re-export JwtStrategy', async () => {
    const { JwtStrategy } = await import('../index');
    const { JwtStrategy: OriginalJwtStrategy } = await import('../strategies/jwt.strategy');
    
    expect(JwtStrategy).toBe(OriginalJwtStrategy);
  });

  it('should re-export JwtAuthGuard', async () => {
    const { JwtAuthGuard } = await import('../index');
    const { JwtAuthGuard: OriginalJwtAuthGuard } = await import('../guards/jwt-auth.guard');
    
    expect(JwtAuthGuard).toBe(OriginalJwtAuthGuard);
  });

  it('should re-export RolesGuard', async () => {
    const { RolesGuard } = await import('../index');
    const { RolesGuard: OriginalRolesGuard } = await import('../guards/roles.guard');
    
    expect(RolesGuard).toBe(OriginalRolesGuard);
  });

  it('should re-export Roles decorator', async () => {
    const { Roles } = await import('../index');
    const { Roles: OriginalRoles } = await import('../decorators/roles.decorator');
    
    expect(Roles).toBe(OriginalRoles);
  });

  it('should re-export UserRole enum', async () => {
    const { UserRole } = await import('../index');
    const { UserRole: OriginalUserRole } = await import('../guards/roles.guard');
    
    expect(UserRole).toBe(OriginalUserRole);
    expect(UserRole.ADMIN).toBe('ADMIN');
    expect(UserRole.MANAGER).toBe('MANAGER');
    expect(UserRole.MECHANIC).toBe('MECHANIC');
    expect(UserRole.RECEPTIONIST).toBe('RECEPTIONIST');
  });

  it('should re-export CurrentUser decorator', async () => {
    const { CurrentUser } = await import('../index');
    const { CurrentUser: OriginalCurrentUser } = await import('../decorators/current-user.decorator');
    
    expect(CurrentUser).toBe(OriginalCurrentUser);
  });

  it('should re-export TenantContextMiddleware', async () => {
    const { TenantContextMiddleware } = await import('../index');
    const { TenantContextMiddleware: OriginalTenantContextMiddleware } = await import('../middleware/tenant-context.middleware');
    
    expect(TenantContextMiddleware).toBe(OriginalTenantContextMiddleware);
  });
});
