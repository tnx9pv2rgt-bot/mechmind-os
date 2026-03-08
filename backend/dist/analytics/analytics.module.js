"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsModule = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const config_1 = require("@nestjs/config");
const unit_economics_service_1 = require("./services/unit-economics.service");
const reporting_service_1 = require("./services/reporting.service");
const metrics_controller_1 = require("./controllers/metrics.controller");
const reporting_controller_1 = require("./controllers/reporting.controller");
const metabase_controller_1 = require("./controllers/metabase.controller");
const common_module_1 = require("../common/common.module");
const prisma_service_1 = require("../common/services/prisma.service");
let AnalyticsModule = class AnalyticsModule {
};
exports.AnalyticsModule = AnalyticsModule;
exports.AnalyticsModule = AnalyticsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            common_module_1.CommonModule,
            config_1.ConfigModule,
            schedule_1.ScheduleModule.forRoot(),
        ],
        controllers: [metrics_controller_1.MetricsController, reporting_controller_1.ReportingController, metabase_controller_1.MetabaseController],
        providers: [unit_economics_service_1.UnitEconomicsService, reporting_service_1.ReportingService, prisma_service_1.PrismaService],
        exports: [unit_economics_service_1.UnitEconomicsService, reporting_service_1.ReportingService],
    })
], AnalyticsModule);
