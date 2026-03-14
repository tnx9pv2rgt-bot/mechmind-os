"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MfaSessionMiddleware = exports.MfaGuard = exports.RequireMFA = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const mfa_service_1 = require("../mfa/mfa.service");
const RequireMFA = () => {
    return (_target, propertyKey, descriptor) => {
        if (descriptor) {
            Reflect.defineMetadata('requireMFA', true, descriptor.value);
        }
        return descriptor;
    };
};
exports.RequireMFA = RequireMFA;
let MfaGuard = class MfaGuard {
    constructor(reflector, mfaService) {
        this.reflector = reflector;
        this.mfaService = mfaService;
    }
    async canActivate(context) {
        const requireMFA = this.reflector.getAllAndOverride('requireMFA', [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!requireMFA) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user) {
            throw new common_1.UnauthorizedException('User not authenticated');
        }
        const mfaStatus = await this.mfaService.getStatus(user.userId);
        if (!mfaStatus.enabled) {
            return true;
        }
        if (request.mfaVerified && request.mfaVerifiedAt) {
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
            if (new Date(request.mfaVerifiedAt) > tenMinutesAgo) {
                return true;
            }
        }
        throw new common_1.UnauthorizedException({
            message: 'MFA verification required',
            code: 'MFA_REQUIRED',
            requiresMFA: true,
        });
    }
};
exports.MfaGuard = MfaGuard;
exports.MfaGuard = MfaGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        mfa_service_1.MfaService])
], MfaGuard);
let MfaSessionMiddleware = class MfaSessionMiddleware {
    constructor(mfaService) {
        this.mfaService = mfaService;
    }
    async use(req, _res, next) {
        const mfaToken = req.headers['x-mfa-token'];
        if (mfaToken) {
            const userId = await this.mfaService.validateMfaSession(mfaToken);
            if (userId && req.user && userId === req.user.userId) {
                req.mfaVerified = true;
                req.mfaVerifiedAt = new Date();
            }
        }
        next();
    }
};
exports.MfaSessionMiddleware = MfaSessionMiddleware;
exports.MfaSessionMiddleware = MfaSessionMiddleware = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [mfa_service_1.MfaService])
], MfaSessionMiddleware);
