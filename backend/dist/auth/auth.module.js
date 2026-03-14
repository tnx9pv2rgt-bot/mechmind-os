"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const passport_1 = require("@nestjs/passport");
const jwt_1 = require("@nestjs/jwt");
const auth_service_1 = require("./services/auth.service");
const auth_controller_1 = require("./controllers/auth.controller");
const jwt_strategy_1 = require("./strategies/jwt.strategy");
const roles_guard_1 = require("./guards/roles.guard");
const jwt_auth_guard_1 = require("./guards/jwt-auth.guard");
const tenant_context_middleware_1 = require("./middleware/tenant-context.middleware");
const common_module_1 = require("../common/common.module");
const mfa_service_1 = require("./mfa/mfa.service");
const mfa_controller_1 = require("./mfa/mfa.controller");
const passkey_service_1 = require("./passkey/passkey.service");
const passkey_controller_1 = require("./passkey/passkey.controller");
const magic_link_service_1 = require("./magic-link/magic-link.service");
const magic_link_controller_1 = require("./magic-link/magic-link.controller");
const oauth_service_1 = require("./oauth/oauth.service");
const oauth_controller_1 = require("./oauth/oauth.controller");
const notifications_module_1 = require("../notifications/notifications.module");
let AuthModule = class AuthModule {
    configure(consumer) {
        consumer.apply(tenant_context_middleware_1.TenantContextMiddleware).forRoutes('*');
    }
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            common_module_1.CommonModule,
            config_1.ConfigModule,
            notifications_module_1.NotificationsModule,
            passport_1.PassportModule.register({ defaultStrategy: 'jwt' }),
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                useFactory: (configService) => ({
                    secret: configService.get('JWT_SECRET'),
                    signOptions: {
                        expiresIn: configService.get('JWT_EXPIRES_IN', '1h'),
                    },
                }),
                inject: [config_1.ConfigService],
            }),
        ],
        controllers: [
            auth_controller_1.AuthController,
            mfa_controller_1.MfaController,
            passkey_controller_1.PasskeyController,
            magic_link_controller_1.MagicLinkController,
            oauth_controller_1.OAuthController,
        ],
        providers: [
            auth_service_1.AuthService,
            mfa_service_1.MfaService,
            passkey_service_1.PasskeyService,
            magic_link_service_1.MagicLinkService,
            oauth_service_1.OAuthService,
            jwt_strategy_1.JwtStrategy,
            jwt_auth_guard_1.JwtAuthGuard,
            roles_guard_1.RolesGuard,
        ],
        exports: [
            auth_service_1.AuthService,
            mfa_service_1.MfaService,
            passkey_service_1.PasskeyService,
            magic_link_service_1.MagicLinkService,
            oauth_service_1.OAuthService,
            jwt_auth_guard_1.JwtAuthGuard,
            roles_guard_1.RolesGuard,
            jwt_1.JwtModule,
        ],
    })
], AuthModule);
