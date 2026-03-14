"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTokenPair = generateTokenPair;
exports.generateAccessToken = generateAccessToken;
exports.generateRefreshToken = generateRefreshToken;
exports.verifyAccessToken = verifyAccessToken;
exports.verifyRefreshToken = verifyRefreshToken;
exports.decodeToken = decodeToken;
exports.extractTenantId = extractTenantId;
exports.extractUserId = extractUserId;
exports.isTokenExpired = isTokenExpired;
exports.getTokenExpiryTime = getTokenExpiryTime;
exports.refreshAccessToken = refreshAccessToken;
exports.generateTwoFactorTempToken = generateTwoFactorTempToken;
exports.verifyTwoFactorTempToken = verifyTwoFactorTempToken;
exports.generateEmailVerificationToken = generateEmailVerificationToken;
exports.verifyEmailVerificationToken = verifyEmailVerificationToken;
exports.generatePasswordResetToken = generatePasswordResetToken;
exports.verifyPasswordResetToken = verifyPasswordResetToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'default-jwt-secret-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-in-production';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60;
const REFRESH_TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60;
function generateTokenPair(payload) {
    const accessToken = jsonwebtoken_1.default.sign({ ...payload, type: 'access' }, JWT_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRY,
    });
    const refreshToken = jsonwebtoken_1.default.sign({ ...payload, type: 'refresh' }, JWT_REFRESH_SECRET, {
        expiresIn: REFRESH_TOKEN_EXPIRY,
    });
    return {
        accessToken,
        refreshToken,
        accessTokenExpiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
        refreshTokenExpiresIn: REFRESH_TOKEN_EXPIRY_SECONDS,
    };
}
function generateAccessToken(payload) {
    return jsonwebtoken_1.default.sign({ ...payload, type: 'access' }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}
function generateRefreshToken(payload) {
    return jsonwebtoken_1.default.sign({ ...payload, type: 'refresh' }, JWT_REFRESH_SECRET, {
        expiresIn: REFRESH_TOKEN_EXPIRY,
    });
}
function verifyAccessToken(token) {
    try {
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        if (payload.type !== 'access') {
            return {
                valid: false,
                error: 'Token type mismatch: expected access token',
            };
        }
        return {
            valid: true,
            payload,
        };
    }
    catch (error) {
        if (error instanceof Error && error.name === 'TokenExpiredError') {
            try {
                const decoded = jsonwebtoken_1.default.decode(token);
                return {
                    valid: false,
                    expired: true,
                    payload: decoded,
                    error: 'Token expired',
                };
            }
            catch {
                return {
                    valid: false,
                    expired: true,
                    error: 'Token expired and cannot be decoded',
                };
            }
        }
        return {
            valid: false,
            error: error instanceof Error ? error.message : 'Invalid token',
        };
    }
}
function verifyRefreshToken(token) {
    try {
        const payload = jsonwebtoken_1.default.verify(token, JWT_REFRESH_SECRET);
        if (payload.type !== 'refresh') {
            return {
                valid: false,
                error: 'Token type mismatch: expected refresh token',
            };
        }
        return {
            valid: true,
            payload,
        };
    }
    catch (error) {
        if (error instanceof Error && error.name === 'TokenExpiredError') {
            return {
                valid: false,
                expired: true,
                error: 'Refresh token expired',
            };
        }
        return {
            valid: false,
            error: error instanceof Error ? error.message : 'Invalid refresh token',
        };
    }
}
function decodeToken(token) {
    try {
        return jsonwebtoken_1.default.decode(token);
    }
    catch {
        return null;
    }
}
function extractTenantId(token) {
    const payload = decodeToken(token);
    return payload?.tenantId || null;
}
function extractUserId(token) {
    const payload = decodeToken(token);
    return payload?.sub || null;
}
function isTokenExpired(token) {
    const payload = decodeToken(token);
    if (!payload?.exp)
        return true;
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
}
function getTokenExpiryTime(token) {
    const payload = decodeToken(token);
    if (!payload?.exp)
        return 0;
    const now = Math.floor(Date.now() / 1000);
    const remaining = payload.exp - now;
    return remaining > 0 ? remaining : 0;
}
function refreshAccessToken(refreshToken) {
    const verification = verifyRefreshToken(refreshToken);
    if (!verification.valid || !verification.payload) {
        return null;
    }
    const { sub, email, role, tenantId } = verification.payload;
    return generateTokenPair({ sub, email, role, tenantId });
}
function generateTwoFactorTempToken(userId, email) {
    return jsonwebtoken_1.default.sign({
        sub: userId,
        email,
        type: '2fa_pending',
    }, JWT_SECRET, { expiresIn: '5m' });
}
function verifyTwoFactorTempToken(token) {
    try {
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        if (payload.type !== '2fa_pending') {
            return {
                valid: false,
                error: 'Invalid token type',
            };
        }
        return {
            valid: true,
            payload,
        };
    }
    catch (error) {
        return {
            valid: false,
            expired: error instanceof Error && error.name === 'TokenExpiredError',
            error: error instanceof Error ? error.message : 'Invalid 2FA token',
        };
    }
}
function generateEmailVerificationToken(email, tenantId) {
    return jsonwebtoken_1.default.sign({
        email,
        tenantId,
        type: 'email_verification',
    }, JWT_SECRET, { expiresIn: '24h' });
}
function verifyEmailVerificationToken(token) {
    try {
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        if (payload.type !== 'email_verification') {
            return {
                valid: false,
                error: 'Invalid token type',
            };
        }
        return {
            valid: true,
            payload,
        };
    }
    catch (error) {
        return {
            valid: false,
            expired: error instanceof Error && error.name === 'TokenExpiredError',
            error: error instanceof Error ? error.message : 'Invalid verification token',
        };
    }
}
function generatePasswordResetToken(email, tenantId) {
    return jsonwebtoken_1.default.sign({
        email,
        tenantId,
        type: 'password_reset',
    }, JWT_SECRET, { expiresIn: '1h' });
}
function verifyPasswordResetToken(token) {
    try {
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        if (payload.type !== 'password_reset') {
            return {
                valid: false,
                error: 'Invalid token type',
            };
        }
        return {
            valid: true,
            payload,
        };
    }
    catch (error) {
        return {
            valid: false,
            expired: error instanceof Error && error.name === 'TokenExpiredError',
            error: error instanceof Error ? error.message : 'Invalid reset token',
        };
    }
}
exports.default = {
    generateTokenPair,
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    decodeToken,
    extractTenantId,
    extractUserId,
    isTokenExpired,
    getTokenExpiryTime,
    refreshAccessToken,
    generateTwoFactorTempToken,
    verifyTwoFactorTempToken,
    generateEmailVerificationToken,
    verifyEmailVerificationToken,
    generatePasswordResetToken,
    verifyPasswordResetToken,
};
