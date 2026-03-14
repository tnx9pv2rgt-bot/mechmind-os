"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminSetupService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const prisma_service_1 = require("../common/services/prisma.service");
let AdminSetupService = class AdminSetupService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async seedDemoData() {
        const passwordHash = await bcrypt.hash('Demo2026!', 12);
        const tenant = await this.prisma.tenant.upsert({
            where: { slug: 'demo' },
            update: {
                name: 'Demo Officina Roma',
                isActive: true,
                settings: { timezone: 'Europe/Rome', currency: 'EUR', language: 'it' },
            },
            create: {
                name: 'Demo Officina Roma',
                slug: 'demo',
                isActive: true,
                settings: { timezone: 'Europe/Rome', currency: 'EUR', language: 'it' },
            },
        });
        const location = await this.prisma.location.upsert({
            where: {
                tenantId_isMain: {
                    tenantId: tenant.id,
                    isMain: true,
                },
            },
            update: {
                name: 'Sede Principale',
                address: 'Via Roma 1',
                city: 'Roma',
                postalCode: '00100',
                country: 'IT',
                isActive: true,
            },
            create: {
                tenantId: tenant.id,
                name: 'Sede Principale',
                address: 'Via Roma 1',
                city: 'Roma',
                postalCode: '00100',
                country: 'IT',
                isMain: true,
                isActive: true,
            },
        });
        const usersConfig = [
            { email: 'admin@demo.mechmind.it', name: 'Admin Demo', role: client_1.UserRole.ADMIN },
            { email: 'manager@demo.mechmind.it', name: 'Marco Rossi', role: client_1.UserRole.MANAGER },
            { email: 'tecnico@demo.mechmind.it', name: 'Luca Bianchi', role: client_1.UserRole.MECHANIC },
        ];
        const users = [];
        for (const userConfig of usersConfig) {
            const user = await this.prisma.user.upsert({
                where: {
                    tenantId_email: {
                        tenantId: tenant.id,
                        email: userConfig.email,
                    },
                },
                update: {
                    passwordHash,
                    name: userConfig.name,
                    role: userConfig.role,
                    isActive: true,
                    locationId: location.id,
                },
                create: {
                    tenantId: tenant.id,
                    email: userConfig.email,
                    passwordHash,
                    name: userConfig.name,
                    role: userConfig.role,
                    isActive: true,
                    locationId: location.id,
                },
            });
            users.push({ id: user.id, email: user.email, role: user.role });
        }
        return {
            tenantId: tenant.id,
            locationId: location.id,
            users,
        };
    }
};
exports.AdminSetupService = AdminSetupService;
exports.AdminSetupService = AdminSetupService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminSetupService);
