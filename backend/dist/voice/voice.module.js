"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const voice_webhook_controller_1 = require("./controllers/voice-webhook.controller");
const vapi_webhook_service_1 = require("./services/vapi-webhook.service");
const intent_handler_service_1 = require("./services/intent-handler.service");
const escalation_service_1 = require("./services/escalation.service");
const voice_event_listener_1 = require("./listeners/voice-event.listener");
const common_module_1 = require("../common/common.module");
const customer_module_1 = require("../customer/customer.module");
const booking_module_1 = require("../booking/booking.module");
let VoiceModule = class VoiceModule {
};
exports.VoiceModule = VoiceModule;
exports.VoiceModule = VoiceModule = __decorate([
    (0, common_1.Module)({
        imports: [config_1.ConfigModule, common_module_1.CommonModule, customer_module_1.CustomerModule, booking_module_1.BookingModule],
        controllers: [voice_webhook_controller_1.VoiceWebhookController],
        providers: [vapi_webhook_service_1.VapiWebhookService, intent_handler_service_1.IntentHandlerService, escalation_service_1.EscalationService, voice_event_listener_1.VoiceEventListener],
        exports: [vapi_webhook_service_1.VapiWebhookService, intent_handler_service_1.IntentHandlerService, escalation_service_1.EscalationService],
    })
], VoiceModule);
