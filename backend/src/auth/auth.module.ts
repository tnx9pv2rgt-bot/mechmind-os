import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './services/auth.service';
import { TokenBlacklistService } from './services/token-blacklist.service';
import { PasswordPolicyService } from './services/password-policy.service';
import { LoginThrottleService } from './services/login-throttle.service';
import { SessionService } from './services/session.service';
import { RiskAssessmentService } from './services/risk-assessment.service';
import { TrustedDeviceService } from './services/trusted-device.service';
import { SecurityActivityService } from './services/security-activity.service';
import { JwksService } from './services/jwks.service';
import { JwksController } from './controllers/jwks.controller';
import { AuthController } from './controllers/auth.controller';
import { PortalAuthController } from './controllers/portal-auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RolesGuard } from './guards/roles.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { TenantContextMiddleware } from './middleware/tenant-context.middleware';
import { CommonModule } from '@common/common.module';
import { MfaService } from './mfa/mfa.service';
import { MfaController } from './mfa/mfa.controller';
import { SmsOtpService } from './services/sms-otp.service';
import { PasskeyService } from './passkey/passkey.service';
import { PasskeyController } from './passkey/passkey.controller';
import { MagicLinkService } from './magic-link/magic-link.service';
import { MagicLinkController } from './magic-link/magic-link.controller';
import { OAuthService } from './oauth/oauth.service';
import { OAuthController } from './oauth/oauth.controller';
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
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '15m'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [
    AuthController,
    PortalAuthController,
    MfaController,
    PasskeyController,
    MagicLinkController,
    OAuthController,
    JwksController,
  ],
  providers: [
    AuthService,
    TokenBlacklistService,
    PasswordPolicyService,
    LoginThrottleService,
    SessionService,
    RiskAssessmentService,
    TrustedDeviceService,
    SecurityActivityService,
    JwksService,
    MfaService,
    SmsOtpService,
    PasskeyService,
    MagicLinkService,
    OAuthService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [
    AuthService,
    TokenBlacklistService,
    MfaService,
    SmsOtpService,
    PasskeyService,
    MagicLinkService,
    OAuthService,
    TrustedDeviceService,
    SecurityActivityService,
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
