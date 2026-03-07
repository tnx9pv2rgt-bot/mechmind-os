import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { MiddlewareConsumer } from '@nestjs/common';
import { AuthModule } from '../auth.module';
import { AuthService } from '../services/auth.service';
import { AuthController } from '../controllers/auth.controller';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { TenantContextMiddleware } from '../middleware/tenant-context.middleware';
import { PrismaService } from '../../common/services/prisma.service';
import { LoggerService } from '../../common/services/logger.service';

describe('AuthModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({
            JWT_SECRET: 'test-secret',
            JWT_EXPIRES_IN: '24h',
            JWT_REFRESH_SECRET: 'test-refresh-secret',
            DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
          })],
        }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '24h' },
        }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        JwtStrategy,
        JwtAuthGuard,
        RolesGuard,
        {
          provide: PrismaService,
          useValue: {
            setTenantContext: jest.fn(),
            clearTenantContext: jest.fn(),
            $connect: jest.fn(),
            $disconnect: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            debug: jest.fn(),
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should provide AuthService', () => {
    const service = module.get<AuthService>(AuthService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(AuthService);
  });

  it('should provide AuthController', () => {
    const controller = module.get<AuthController>(AuthController);
    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(AuthController);
  });

  it('should provide JwtStrategy', () => {
    const strategy = module.get<JwtStrategy>(JwtStrategy);
    expect(strategy).toBeDefined();
  });

  it('should provide JwtAuthGuard', () => {
    const guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    expect(guard).toBeDefined();
  });

  it('should provide RolesGuard', () => {
    const guard = module.get<RolesGuard>(RolesGuard);
    expect(guard).toBeDefined();
  });

  it('should configure TenantContextMiddleware', () => {
    const prismaService = module.get<PrismaService>(PrismaService);
    const loggerService = module.get<LoggerService>(LoggerService);
    
    const middleware = new TenantContextMiddleware(prismaService, loggerService);
    expect(middleware).toBeDefined();
    expect(typeof middleware.use).toBe('function');
  });

  describe('module configuration', () => {
    it('should have configure method for middleware', () => {
      // Create a new instance of the module to test configure
      const authModule = new AuthModule();
      expect(authModule.configure).toBeDefined();
      expect(typeof authModule.configure).toBe('function');
    });

    it('should configure middleware for all routes', () => {
      const authModule = new AuthModule();
      
      // Create mock middleware consumer
      const mockApply = jest.fn().mockReturnThis();
      const mockForRoutes = jest.fn().mockReturnThis();
      const mockConsumer: Partial<MiddlewareConsumer> = {
        apply: mockApply,
        forRoutes: mockForRoutes,
      };

      authModule.configure(mockConsumer as MiddlewareConsumer);

      expect(mockApply).toHaveBeenCalledWith(TenantContextMiddleware);
      expect(mockForRoutes).toHaveBeenCalledWith('*');
    });

    it('should chain apply and forRoutes correctly', () => {
      const authModule = new AuthModule();
      
      // Verify method chaining works
      const mockConsumer = {
        apply: jest.fn().mockReturnThis(),
        forRoutes: jest.fn().mockReturnThis(),
      };

      authModule.configure(mockConsumer as any);

      // Verify both methods were called
      expect(mockConsumer.apply).toHaveBeenCalled();
      expect(mockConsumer.forRoutes).toHaveBeenCalled();
    });
  });

  describe('module exports', () => {
    it('should be able to get all exported providers', () => {
      // Verify all providers can be resolved
      const authService = module.get<AuthService>(AuthService);
      const jwtAuthGuard = module.get<JwtAuthGuard>(JwtAuthGuard);
      const rolesGuard = module.get<RolesGuard>(RolesGuard);

      expect(authService).toBeDefined();
      expect(jwtAuthGuard).toBeDefined();
      expect(rolesGuard).toBeDefined();
    });
  });
});
