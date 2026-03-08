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
exports.ApiUsageMiddleware = exports.LimitGuard = exports.LIMIT_CHECK_KEY = void 0;
exports.CheckLimit = CheckLimit;
exports.createLimitGuard = createLimitGuard;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const feature_access_service_1 = require("../services/feature-access.service");
exports.LIMIT_CHECK_KEY = 'limitCheck';
function CheckLimit(limitType) {
    return function (target, propertyKey, descriptor) {
        Reflect.defineMetadata(exports.LIMIT_CHECK_KEY, limitType, descriptor.value);
    };
}
let LimitGuard = class LimitGuard {
    constructor(reflector, featureAccessService) {
        this.reflector = reflector;
        this.featureAccessService = featureAccessService;
    }
    async canActivate(context) {
        const limitType = this.reflector.getAllAndOverride(exports.LIMIT_CHECK_KEY, [context.getHandler(), context.getClass()]);
        if (!limitType) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const tenantId = request.tenantId;
        if (!tenantId) {
            throw new common_1.ForbiddenException('Tenant ID not found in request');
        }
        const limitTypeMap = {
            user: 'maxUsers',
            location: 'maxLocations',
            customer: 'maxCustomers',
            apiCall: 'maxApiCallsPerMonth',
            storage: 'maxStorageBytes',
        };
        if (limitType === 'apiCall' || limitType === 'storage') {
            const check = await this.featureAccessService.checkSpecificLimit(tenantId, limitTypeMap[limitType]);
            if (!check.withinLimit) {
                throw new common_1.ForbiddenException({
                    message: `You have exceeded your ${limitType} limit for this billing period. Please upgrade your plan.`,
                    limit: check.limit,
                    current: check.current,
                    code: 'LIMIT_EXCEEDED',
                });
            }
        }
        else {
            const check = await this.featureAccessService.canAddResource(tenantId, limitType);
            if (!check.withinLimit) {
                const resourceName = limitType === 'user' ? 'users' :
                    limitType === 'location' ? 'locations' : 'customers';
                throw new common_1.ForbiddenException({
                    message: `You have reached your ${resourceName} limit. Please upgrade your plan to add more.`,
                    limit: check.limit,
                    current: check.current,
                    code: 'LIMIT_EXCEEDED',
                });
            }
        }
        return true;
    }
};
exports.LimitGuard = LimitGuard;
exports.LimitGuard = LimitGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        feature_access_service_1.FeatureAccessService])
], LimitGuard);
let ApiUsageMiddleware = class ApiUsageMiddleware {
    constructor(featureAccessService) {
        this.featureAccessService = featureAccessService;
    }
    async use(req, res, next) {
        const tenantId = req.tenantId;
        if (tenantId) {
            this.featureAccessService.recordApiCall(tenantId, req.path, 0).catch(() => {
            });
        }
        next();
    }
};
exports.ApiUsageMiddleware = ApiUsageMiddleware;
exports.ApiUsageMiddleware = ApiUsageMiddleware = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [feature_access_service_1.FeatureAccessService])
], ApiUsageMiddleware);
function createLimitGuard(resourceType) {
    let DynamicLimitGuard = class DynamicLimitGuard {
        constructor(featureAccessService) {
            this.featureAccessService = featureAccessService;
        }
        async canActivate(context) {
            const request = context.switchToHttp().getRequest();
            const tenantId = request.tenantId;
            if (!tenantId) {
                throw new common_1.ForbiddenException('Tenant ID not found in request');
            }
            const check = await this.featureAccessService.canAddResource(tenantId, resourceType);
            if (!check.withinLimit) {
                const resourceName = resourceType === 'user' ? 'users' :
                    resourceType === 'location' ? 'locations' : 'customers';
                throw new common_1.ForbiddenException({
                    message: `You have reached your ${resourceName} limit. Please upgrade your plan to add more.`,
                    limit: check.limit,
                    current: check.current,
                    code: 'LIMIT_EXCEEDED',
                });
            }
            return true;
        }
    };
    DynamicLimitGuard = __decorate([
        (0, common_1.Injectable)(),
        __metadata("design:paramtypes", [feature_access_service_1.FeatureAccessService])
    ], DynamicLimitGuard);
    return DynamicLimitGuard;
}
