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
const prisma_service_1 = require("../common/services/prisma.service");
const logger_service_1 = require("../common/services/logger.service");
const two_factor_service_1 = require("./two-factor/services/two-factor.service");
const two_factor_controller_1 = require("./two-factor/controllers/two-factor.controller");
const mfa_service_1 = require("./mfa/mfa.service");
const mfa_controller_1 = require("./mfa/mfa.controller");
const encryption_service_1 = require("../common/services/encryption.service");
let AuthModule = class AuthModule {
    configure(consumer) {
        consumer
            .apply(tenant_context_middleware_1.TenantContextMiddleware)
            .forRoutes('*');
    }
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            passport_1.PassportModule.register({ defaultStrategy: 'jwt' }),
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                useFactory: (configService) => ({
                    secret: configService.get('JWT_SECRET'),
                    signOptions: {
                        expiresIn: configService.get('JWT_EXPIRES_IN', '24h'),
                    },
                }),
                inject: [config_1.ConfigService],
            }),
        ],
        controllers: [auth_controller_1.AuthController, two_factor_controller_1.TwoFactorController, mfa_controller_1.MfaController],
        providers: [
            auth_service_1.AuthService,
            two_factor_service_1.TwoFactorService,
            mfa_service_1.MfaService,
            jwt_strategy_1.JwtStrategy,
            jwt_auth_guard_1.JwtAuthGuard,
            roles_guard_1.RolesGuard,
            prisma_service_1.PrismaService,
            logger_service_1.LoggerService,
            encryption_service_1.EncryptionService,
        ],
        exports: [auth_service_1.AuthService, two_factor_service_1.TwoFactorService, mfa_service_1.MfaService, jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, jwt_1.JwtModule],
    })
], AuthModule);
