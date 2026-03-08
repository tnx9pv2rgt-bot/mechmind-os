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
exports.FeatureGuard = exports.REQUIRED_FEATURE_KEY = void 0;
exports.RequireFeature = RequireFeature;
exports.createFeatureGuard = createFeatureGuard;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const feature_access_service_1 = require("../services/feature-access.service");
exports.REQUIRED_FEATURE_KEY = 'requiredFeature';
function RequireFeature(...features) {
    return function (target, propertyKey, descriptor) {
        if (descriptor) {
            Reflect.defineMetadata(exports.REQUIRED_FEATURE_KEY, features, descriptor.value);
        }
        else {
            Reflect.defineMetadata(exports.REQUIRED_FEATURE_KEY, features, target);
        }
    };
}
let FeatureGuard = class FeatureGuard {
    constructor(reflector, featureAccessService) {
        this.reflector = reflector;
        this.featureAccessService = featureAccessService;
    }
    async canActivate(context) {
        const requiredFeatures = this.reflector.getAllAndOverride(exports.REQUIRED_FEATURE_KEY, [context.getHandler(), context.getClass()]);
        if (!requiredFeatures || requiredFeatures.length === 0) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const tenantId = request.tenantId;
        if (!tenantId) {
            throw new common_1.ForbiddenException('Tenant ID not found in request');
        }
        const checks = await this.featureAccessService.canAccessFeatures(tenantId, requiredFeatures);
        const missingFeatures = requiredFeatures.filter(feature => !checks[feature].allowed);
        if (missingFeatures.length > 0) {
            const firstMissing = missingFeatures[0];
            const check = checks[firstMissing];
            throw new common_1.ForbiddenException({
                message: check.reason || `Feature ${firstMissing} is not available`,
                features: missingFeatures,
                requiredPlan: check.requiredPlan,
                requiresAiAddon: check.requiresAiAddon,
                code: 'FEATURE_NOT_AVAILABLE',
            });
        }
        return true;
    }
};
exports.FeatureGuard = FeatureGuard;
exports.FeatureGuard = FeatureGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        feature_access_service_1.FeatureAccessService])
], FeatureGuard);
function createFeatureGuard(...features) {
    let DynamicFeatureGuard = class DynamicFeatureGuard {
        constructor(featureAccessService) {
            this.featureAccessService = featureAccessService;
        }
        async canActivate(context) {
            const request = context.switchToHttp().getRequest();
            const tenantId = request.tenantId;
            if (!tenantId) {
                throw new common_1.ForbiddenException('Tenant ID not found in request');
            }
            await this.featureAccessService.assertCanAccessFeature(tenantId, features[0]);
            return true;
        }
    };
    DynamicFeatureGuard = __decorate([
        (0, common_1.Injectable)(),
        __metadata("design:paramtypes", [feature_access_service_1.FeatureAccessService])
    ], DynamicFeatureGuard);
    return DynamicFeatureGuard;
}
