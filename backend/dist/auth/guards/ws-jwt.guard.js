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
var WsJwtGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WsJwtGuard = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const websockets_1 = require("@nestjs/websockets");
let WsJwtGuard = WsJwtGuard_1 = class WsJwtGuard {
    constructor(jwtService) {
        this.jwtService = jwtService;
        this.logger = new common_1.Logger(WsJwtGuard_1.name);
    }
    async canActivate(context) {
        try {
            const client = context.switchToWs().getClient();
            const token = this.extractToken(client);
            if (!token) {
                throw new websockets_1.WsException('Unauthorized: No token provided');
            }
            const payload = await this.jwtService.verifyAsync(token, {
                secret: process.env.JWT_SECRET,
            });
            client.data.user = payload;
            return true;
        }
        catch (error) {
            this.logger.error(`WebSocket authentication failed: ${error.message}`);
            throw new websockets_1.WsException('Unauthorized: Invalid token');
        }
    }
    extractToken(client) {
        if (client.handshake.auth?.token) {
            return client.handshake.auth.token;
        }
        if (client.handshake.query?.token) {
            return client.handshake.query.token;
        }
        const authHeader = client.handshake.headers.authorization;
        if (authHeader) {
            const [bearer, token] = authHeader.split(' ');
            if (bearer === 'Bearer' && token) {
                return token;
            }
        }
        return undefined;
    }
};
exports.WsJwtGuard = WsJwtGuard;
exports.WsJwtGuard = WsJwtGuard = WsJwtGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService])
], WsJwtGuard);
