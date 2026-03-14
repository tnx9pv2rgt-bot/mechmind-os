"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const core_1 = require("@nestjs/core");
const platform_express_1 = require("@nestjs/platform-express");
const common_1 = require("@nestjs/common");
const express_1 = __importDefault(require("express"));
const app_module_1 = require("./app.module");
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';
let cachedApp = null;
async function bootstrap() {
    if (cachedApp) {
        return cachedApp;
    }
    const expressApp = (0, express_1.default)();
    const adapter = new platform_express_1.ExpressAdapter(expressApp);
    const app = await core_1.NestFactory.create(app_module_1.AppModule, adapter, {
        logger: process.env.NODE_ENV === 'dev' ? ['debug', 'log', 'warn', 'error'] : ['warn', 'error'],
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
    }));
    const corsOrigin = process.env.CORS_ORIGIN;
    app.enableCors({
        origin: corsOrigin ? corsOrigin.split(',').map(o => o.trim()) : false,
        credentials: true,
    });
    await app.init();
    cachedApp = expressApp;
    return expressApp;
}
const handler = async (_event, _context) => {
    if (!cachedApp) {
        await bootstrap();
    }
    return {
        statusCode: 200,
        body: JSON.stringify({
            message: 'Lambda Web Adapter active - HTTP proxy mode',
            adapter_version: process.env.AWS_LAMBDA_WEB_ADAPTER_VERSION || 'unknown',
        }),
    };
};
exports.handler = handler;
if (require.main === module) {
    bootstrap().then(app => {
        app.listen(PORT, HOST, () => {
            console.log(`🚀 MechMind OS API running on http://${HOST}:${PORT}`);
            console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    });
}
