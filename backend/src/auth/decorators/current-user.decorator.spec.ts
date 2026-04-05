import { currentUserFactory, currentTenantFactory } from './current-user.decorator';
import { ExecutionContext } from '@nestjs/common';

describe('currentUserFactory', () => {
  function createContext(user: unknown): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  const mockUser = {
    userId: 'user-1',
    email: 'test@example.com',
    role: 'ADMIN',
    tenantId: 'tenant-1',
  };

  it('should return the full user when no data key is specified', () => {
    const ctx = createContext(mockUser);
    const result = currentUserFactory(undefined, ctx);
    expect(result).toEqual(mockUser);
  });

  it('should return a specific field when data key is provided', () => {
    const ctx = createContext(mockUser);

    expect(currentUserFactory('userId', ctx)).toBe('user-1');
    expect(currentUserFactory('email', ctx)).toBe('test@example.com');
    expect(currentUserFactory('role', ctx)).toBe('ADMIN');
    expect(currentUserFactory('tenantId', ctx)).toBe('tenant-1');
  });

  it('should return null when user is not present', () => {
    const ctx = createContext(undefined);
    const result = currentUserFactory(undefined, ctx);
    expect(result).toBeNull();
  });

  it('should return null when user is null', () => {
    const ctx = createContext(null);
    const result = currentUserFactory(undefined, ctx);
    expect(result).toBeNull();
  });

  it('should return null when user is missing and specific field requested', () => {
    const ctx = createContext(undefined);
    const result = currentUserFactory('userId', ctx);
    expect(result).toBeNull();
  });
});

describe('currentTenantFactory', () => {
  function createContext(tenantId?: string, user?: { tenantId?: string }): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ tenantId, user }),
      }),
    } as unknown as ExecutionContext;
  }

  it('should return tenantId from request when present', () => {
    const ctx = createContext('tenant-from-req', { tenantId: 'tenant-from-user' });
    const result = currentTenantFactory(undefined, ctx);
    expect(result).toBe('tenant-from-req');
  });

  it('should fall back to user.tenantId when request tenantId is missing', () => {
    const ctx = createContext(undefined, { tenantId: 'tenant-from-user' });
    const result = currentTenantFactory(undefined, ctx);
    expect(result).toBe('tenant-from-user');
  });

  it('should return undefined when neither is present', () => {
    const ctx = createContext(undefined, undefined);
    const result = currentTenantFactory(undefined, ctx);
    expect(result).toBeUndefined();
  });

  it('should return undefined when user exists but has no tenantId', () => {
    const ctx = createContext(undefined, {});
    const result = currentTenantFactory(undefined, ctx);
    expect(result).toBeUndefined();
  });
});
