"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhooksModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const index_1 = require("./index");
let WebhooksModule = class WebhooksModule {
    configure(consumer) {
        consumer
            .apply((req, res, next) => {
            let data = '';
            req.setEncoding('utf8');
            req.on('data', (chunk) => {
                data += chunk;
            });
            req.on('end', () => {
                req.rawBody = data;
                next();
            });
        })
            .forRoutes('webhooks/slack');
    }
};
exports.WebhooksModule = WebhooksModule;
exports.WebhooksModule = WebhooksModule = __decorate([
    (0, common_1.Module)({
        imports: [config_1.ConfigModule],
        controllers: [index_1.WebhookController],
        providers: [
            index_1.SegmentWebhookService,
            index_1.ZapierWebhookService,
            index_1.SlackWebhookService,
            index_1.CRMWebhookService,
        ],
        exports: [
            index_1.SegmentWebhookService,
            index_1.ZapierWebhookService,
            index_1.SlackWebhookService,
            index_1.CRMWebhookService,
        ],
    })
], WebhooksModule);
