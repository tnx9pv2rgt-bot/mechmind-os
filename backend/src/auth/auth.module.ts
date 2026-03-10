import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RolesGuard } from './guards/roles.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { TenantContextMiddleware } from './middleware/tenant-context.middleware';
import { CommonModule } from '@common/common.module';
import { MfaService } from './mfa/mfa.service';
import { MfaController } from './mfa/mfa.controller';
import { PasskeyService } from './passkey/passkey.service';
import { PasskeyController } from './passkey/passkey.controller';
import { MagicLinkService } from './magic-link/magic-link.service';
import { MagicLinkController } from './magic-link/magic-link.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    CommonModule,
    ConfigModule,
    NotificationsModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '24h'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, MfaController, PasskeyController, MagicLinkController],
  providers: [
    AuthService,
    MfaService,
    PasskeyService,
    MagicLinkService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [
    AuthService,
    MfaService,
    PasskeyService,
    MagicLinkService,
    JwtAuthGuard,
    RolesGuard,
    JwtModule,
  ],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
