"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateJWT = generateJWT;
exports.generateRefreshToken = generateRefreshToken;
exports.verifyJWT = verifyJWT;
exports.decodeJWT = decodeJWT;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = require("crypto");
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';
const JWT_EXPIRY = '1h';
const REFRESH_TOKEN_EXPIRY = '7d';
function generateJWT(user) {
    const jti = (0, crypto_1.randomBytes)(16).toString('hex');
    return jsonwebtoken_1.default.sign({
        sub: user.id,
        email: user.email,
        tenantId: user.tenantId,
        role: user.role,
        jti,
    }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}
function generateRefreshToken(user) {
    return jsonwebtoken_1.default.sign({ sub: user.id, jti: (0, crypto_1.randomBytes)(16).toString('hex') }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}
function verifyJWT(token) {
    try {
        return jsonwebtoken_1.default.verify(token, JWT_SECRET);
    }
    catch {
        return null;
    }
}
function decodeJWT(token) {
    try {
        return jsonwebtoken_1.default.decode(token);
    }
    catch {
        return null;
    }
}
