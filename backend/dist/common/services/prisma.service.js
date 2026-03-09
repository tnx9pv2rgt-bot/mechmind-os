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
exports.PrismaService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const logger_service_1 = require("./logger.service");
let PrismaService = class PrismaService extends client_1.PrismaClient {
    constructor(configService, logger) {
        const databaseUrl = configService.get('DATABASE_URL') || '';
        const connectionLimit = configService.get('DATABASE_CONNECTION_LIMIT', 10);
        const separator = databaseUrl.includes('?') ? '&' : '?';
        const urlWithPooling = databaseUrl.includes('connection_limit')
            ? databaseUrl
            : `${databaseUrl}${separator}connection_limit=${connectionLimit}`;
        super({
            datasources: {
                db: {
                    url: urlWithPooling,
                },
            },
            transactionOptions: {
                maxWait: 5000,
                timeout: 15000,
            },
            log: [
                { emit: 'event', level: 'query' },
                { emit: 'event', level: 'error' },
                { emit: 'event', level: 'info' },
                { emit: 'event', level: 'warn' },
            ],
        });
        this.configService = configService;
        this.logger = logger;
        this.currentTenantContext = null;
    }
    async onModuleInit() {
        await this.$connect();
        this.logger.log('Prisma connected to database');
        if (this.configService.get('NODE_ENV') === 'development') {
            this.$on('query', (e) => {
                this.logger.debug(`Query: ${e.query}, Duration: ${e.duration}ms`);
            });
        }
        await this.setupRLS();
    }
    async onModuleDestroy() {
        await this.$disconnect();
        this.logger.log('Prisma disconnected from database');
    }
    async setTenantContext(tenantId) {
        this.currentTenantContext = { tenantId };
        await this.$executeRaw `SELECT set_config('app.current_tenant', ${tenantId}, true)`;
    }
    async clearTenantContext() {
        this.currentTenantContext = null;
        await this.$executeRaw `SELECT set_config('app.current_tenant', '', true)`;
    }
    getCurrentTenantContext() {
        return this.currentTenantContext;
    }
    async withTenant(tenantId, callback) {
        const previousContext = this.currentTenantContext;
        try {
            await this.setTenantContext(tenantId);
            return await callback(this);
        }
        finally {
            if (previousContext) {
                await this.setTenantContext(previousContext.tenantId);
            }
            else {
                await this.clearTenantContext();
            }
        }
    }
    async withSerializableTransaction(callback, options) {
        const maxRetries = options?.maxRetries ?? 3;
        const retryDelay = options?.retryDelay ?? 100;
        let lastError = null;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await this.$transaction(async (tx) => {
                    return await callback(tx);
                }, {
                    isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable,
                    maxWait: 5000,
                    timeout: 10000,
                });
            }
            catch (error) {
                lastError = error;
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                    if (error.code === 'P2034') {
                        this.logger.warn(`Transaction serialization failure, attempt ${attempt}/${maxRetries}`);
                        if (attempt < maxRetries) {
                            await this.delay(retryDelay * attempt);
                            continue;
                        }
                    }
                }
                throw error;
            }
        }
        throw lastError || new Error('Transaction failed after max retries');
    }
    async acquireAdvisoryLock(tenantId, resourceId) {
        const lockId = this.generateLockId(tenantId, resourceId);
        const result = await this.$queryRaw `
      SELECT pg_try_advisory_lock(${lockId}::bigint) as acquired
    `;
        return result?.[0]?.acquired ?? false;
    }
    async releaseAdvisoryLock(tenantId, resourceId) {
        const lockId = this.generateLockId(tenantId, resourceId);
        await this.$queryRaw `SELECT pg_advisory_unlock(${lockId}::bigint)`;
    }
    generateLockId(tenantId, resourceId) {
        const tenantHash = this.hashUUID(tenantId);
        const resourceHash = this.hashUUID(resourceId);
        const lockId = (BigInt.asUintN(64, BigInt(tenantHash) << BigInt(32)) |
            BigInt.asUintN(64, BigInt(resourceHash)));
        return lockId.toString();
    }
    hashUUID(uuid) {
        const clean = uuid.replace(/-/g, '').substring(0, 8);
        let hash = 0;
        for (let i = 0; i < clean.length; i++) {
            const char = clean.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & 0xFFFFFFFF;
        }
        return Math.abs(hash);
    }
    async setupRLS() {
        const tables = ['users', 'customers', 'vehicles', 'bookings', 'booking_slots', 'services'];
        for (const table of tables) {
            try {
                await this.$executeRawUnsafe(`
          ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;
        `);
                await this.$executeRawUnsafe(`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_policies 
              WHERE tablename = '${table}' AND policyname = '${table}_tenant_isolation'
            ) THEN
              CREATE POLICY ${table}_tenant_isolation ON ${table}
                USING (tenant_id = current_setting('app.current_tenant', true)::text);
            END IF;
          END
          $$;
        `);
            }
            catch (error) {
                this.logger.warn(`RLS setup for ${table}: ${error.message}`);
            }
        }
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};
exports.PrismaService = PrismaService;
exports.PrismaService = PrismaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        logger_service_1.LoggerService])
], PrismaService);
