"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const subscription_service_1 = require("./services/subscription.service");
const feature_access_service_1 = require("./services/feature-access.service");
const subscription_controller_1 = require("./controllers/subscription.controller");
const feature_guard_1 = require("./guards/feature.guard");
const limit_guard_1 = require("./guards/limit.guard");
const common_module_1 = require("../common/common.module");
const auth_module_1 = require("../auth/auth.module");
let SubscriptionModule = class SubscriptionModule {
    configure(consumer) {
        consumer
            .apply(limit_guard_1.ApiUsageMiddleware)
            .forRoutes({ path: 'api/*', method: common_1.RequestMethod.ALL }, { path: 'subscription/*', method: common_1.RequestMethod.ALL });
    }
};
exports.SubscriptionModule = SubscriptionModule;
exports.SubscriptionModule = SubscriptionModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            common_module_1.CommonModule,
            auth_module_1.AuthModule,
        ],
        controllers: [
            subscription_controller_1.SubscriptionController,
            subscription_controller_1.AdminSubscriptionController,
            subscription_controller_1.StripeWebhookController,
        ],
        providers: [
            subscription_service_1.SubscriptionService,
            feature_access_service_1.FeatureAccessService,
            feature_guard_1.FeatureGuard,
            limit_guard_1.LimitGuard,
            limit_guard_1.ApiUsageMiddleware,
        ],
        exports: [
            subscription_service_1.SubscriptionService,
            feature_access_service_1.FeatureAccessService,
            feature_guard_1.FeatureGuard,
            limit_guard_1.LimitGuard,
        ],
    })
], SubscriptionModule);
