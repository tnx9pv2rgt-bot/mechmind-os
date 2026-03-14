"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExternalServicesModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const viesApi_1 = require("./viesApi");
const googlePlaces_1 = require("./googlePlaces");
const zerobounce_1 = require("./zerobounce");
const twilio_1 = require("./twilio");
const validation_controller_1 = require("./validation.controller");
let ExternalServicesModule = class ExternalServicesModule {
};
exports.ExternalServicesModule = ExternalServicesModule;
exports.ExternalServicesModule = ExternalServicesModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [config_1.ConfigModule],
        controllers: [validation_controller_1.ValidationController],
        providers: [viesApi_1.ViesApiService, googlePlaces_1.GooglePlacesService, zerobounce_1.ZeroBounceService, twilio_1.TwilioService],
        exports: [viesApi_1.ViesApiService, googlePlaces_1.GooglePlacesService, zerobounce_1.ZeroBounceService, twilio_1.TwilioService],
    })
], ExternalServicesModule);
