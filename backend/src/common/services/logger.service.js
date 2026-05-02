"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggerService = void 0;
var common_1 = require("@nestjs/common");
var api_1 = require("@opentelemetry/api");
var LoggerService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var LoggerService = _classThis = /** @class */ (function () {
        function LoggerService_1(configService) {
            this.configService = configService;
            this.structuredCtx = {};
        }
        LoggerService_1.prototype.setContext = function (context) {
            this.context = context;
        };
        LoggerService_1.prototype.setStructuredContext = function (ctx) {
            this.structuredCtx = __assign(__assign({}, this.structuredCtx), ctx);
        };
        LoggerService_1.prototype.log = function (message, context) {
            this.printMessage('log', message, context);
        };
        LoggerService_1.prototype.error = function (message, trace, context) {
            this.printMessage('error', message, context);
            if (trace) {
                this.printMessage('error', trace, context);
            }
        };
        LoggerService_1.prototype.warn = function (message, context) {
            this.printMessage('warn', message, context);
        };
        LoggerService_1.prototype.debug = function (message, context) {
            var _a;
            var logLevel = ((_a = this.configService) === null || _a === void 0 ? void 0 : _a.get('LOG_LEVEL')) || 'info';
            if (logLevel === 'debug') {
                this.printMessage('debug', message, context);
            }
        };
        LoggerService_1.prototype.verbose = function (message, context) {
            var _a;
            var logLevel = ((_a = this.configService) === null || _a === void 0 ? void 0 : _a.get('LOG_LEVEL')) || 'info';
            if (logLevel === 'verbose' || logLevel === 'debug') {
                this.printMessage('verbose', message, context);
            }
        };
        LoggerService_1.prototype.logWithCorrelation = function (message, correlationId, context) {
            this.printMessage('log', message, context, correlationId);
        };
        // eslint-disable-next-line sonarjs/cognitive-complexity
        LoggerService_1.prototype.printMessage = function (level, message, context, correlationId) {
            var _a;
            var timestamp = new Date().toISOString();
            var ctx = context || this.context || 'Application';
            var logFormat = ((_a = this.configService) === null || _a === void 0 ? void 0 : _a.get('LOG_FORMAT')) || 'simple';
            if (logFormat === 'json') {
                // Auto-inject traceId/spanId from OpenTelemetry context
                var activeSpan = api_1.trace.getSpan(api_1.context.active());
                var spanContext = activeSpan === null || activeSpan === void 0 ? void 0 : activeSpan.spanContext();
                var otelTraceId = spanContext === null || spanContext === void 0 ? void 0 : spanContext.traceId;
                var otelSpanId = spanContext === null || spanContext === void 0 ? void 0 : spanContext.spanId;
                var logEntry = {
                    timestamp: timestamp,
                    level: level.toUpperCase(),
                    service: 'mechmind-backend',
                    context: ctx,
                    message: message,
                };
                // Add structured context fields — OTel context takes precedence
                if (correlationId || this.structuredCtx.requestId) {
                    logEntry.requestId = correlationId || this.structuredCtx.requestId;
                }
                logEntry.traceId = otelTraceId || this.structuredCtx.traceId;
                logEntry.spanId = otelSpanId || this.structuredCtx.spanId;
                if (this.structuredCtx.tenantId)
                    logEntry.tenantId = this.structuredCtx.tenantId;
                if (this.structuredCtx.userId)
                    logEntry.userId = this.structuredCtx.userId;
                if (this.structuredCtx.method)
                    logEntry.method = this.structuredCtx.method;
                if (this.structuredCtx.url)
                    logEntry.url = this.structuredCtx.url;
                if (this.structuredCtx.statusCode)
                    logEntry.statusCode = this.structuredCtx.statusCode;
                if (this.structuredCtx.durationMs !== undefined)
                    logEntry.duration_ms = this.structuredCtx.durationMs;
                process.stdout.write(JSON.stringify(logEntry) + '\n');
            }
            else {
                var colorMap = {
                    log: '\x1b[32m', // Green
                    error: '\x1b[31m', // Red
                    warn: '\x1b[33m', // Yellow
                    debug: '\x1b[34m', // Blue
                    verbose: '\x1b[35m', // Magenta
                };
                var resetColor = '\x1b[0m';
                // eslint-disable-next-line security/detect-object-injection
                var color = colorMap[level];
                var activeSpanSimple = api_1.trace.getSpan(api_1.context.active());
                var traceIdSimple = activeSpanSimple === null || activeSpanSimple === void 0 ? void 0 : activeSpanSimple.spanContext().traceId;
                var traceStr = traceIdSimple ? " [trace:".concat(traceIdSimple.slice(0, 8), "]") : '';
                process.stdout.write("".concat(color, "[").concat(level.toUpperCase(), "]").concat(resetColor, " ").concat(timestamp, " [").concat(ctx, "]").concat(traceStr, " ").concat(message, "\n"));
            }
        };
        return LoggerService_1;
    }());
    __setFunctionName(_classThis, "LoggerService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        LoggerService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return LoggerService = _classThis;
}();
exports.LoggerService = LoggerService;
