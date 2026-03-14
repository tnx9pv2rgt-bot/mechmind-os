"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractTokenFromHeader = extractTokenFromHeader;
exports.extractTokenFromCookie = extractTokenFromCookie;
exports.verifyToken = verifyToken;
exports.requireAuth = requireAuth;
exports.extractUser = extractUser;
exports.requireRoles = requireRoles;
exports.requireTenant = requireTenant;
exports.requireAuthWithRole = requireAuthWithRole;
exports.verifyRefreshTokenMiddleware = verifyRefreshTokenMiddleware;
exports.tenantCorsMiddleware = tenantCorsMiddleware;
exports.auditLogMiddleware = auditLogMiddleware;
exports.authErrorHandler = authErrorHandler;
const jwtService_1 = require("../services/jwtService");
require("../types/express");
const AUTH_ERRORS = {
    NO_TOKEN: {
        status: 401,
        code: 'AUTH_NO_TOKEN',
        message: 'Token di autenticazione mancante',
    },
    INVALID_TOKEN: {
        status: 401,
        code: 'AUTH_INVALID_TOKEN',
        message: 'Token non valido',
    },
    EXPIRED_TOKEN: {
        status: 401,
        code: 'AUTH_EXPIRED_TOKEN',
        message: 'Token scaduto',
    },
    INSUFFICIENT_PERMISSIONS: {
        status: 403,
        code: 'AUTH_INSUFFICIENT_PERMISSIONS',
        message: 'Permessi insufficienti',
    },
    TENANT_REQUIRED: {
        status: 400,
        code: 'AUTH_TENANT_REQUIRED',
        message: 'Tenant ID mancante nel token',
    },
};
function extractTokenFromHeader(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return null;
    }
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
        return null;
    }
    return parts[1];
}
function extractTokenFromCookie(req, cookieName = 'accessToken') {
    return req.cookies?.[cookieName] || null;
}
function verifyToken(options = {}) {
    return (req, res, next) => {
        let token = extractTokenFromHeader(req);
        if (!token) {
            token = extractTokenFromCookie(req);
        }
        if (!token) {
            if (options.optional) {
                return next();
            }
            res.status(401).json({
                success: false,
                error: AUTH_ERRORS.NO_TOKEN,
            });
            return;
        }
        const verification = (0, jwtService_1.verifyAccessToken)(token);
        if (!verification.valid && verification.expired) {
            if (options.allowExpired && verification.payload) {
                req.user = verification.payload;
                req.token = token;
                req.userId = verification.payload.sub;
                req.tenantId = verification.payload.tenantId;
                return next();
            }
            res.status(401).json({
                success: false,
                error: AUTH_ERRORS.EXPIRED_TOKEN,
            });
            return;
        }
        if (!verification.valid || !verification.payload) {
            res.status(401).json({
                success: false,
                error: {
                    ...AUTH_ERRORS.INVALID_TOKEN,
                    details: verification.error,
                },
            });
            return;
        }
        if (options.requireTenant && !verification.payload.tenantId) {
            res.status(400).json({
                success: false,
                error: AUTH_ERRORS.TENANT_REQUIRED,
            });
            return;
        }
        req.user = verification.payload;
        req.token = token;
        req.userId = verification.payload.sub;
        req.tenantId = verification.payload.tenantId;
        next();
    };
}
function requireAuth(options = {}) {
    return verifyToken({ ...options, optional: false });
}
function extractUser(req, res, next) {
    const token = extractTokenFromHeader(req) || extractTokenFromCookie(req);
    if (token) {
        const verification = (0, jwtService_1.verifyAccessToken)(token);
        if (verification.valid && verification.payload) {
            req.user = verification.payload;
            req.token = token;
            req.userId = verification.payload.sub;
            req.tenantId = verification.payload.tenantId;
        }
    }
    next();
}
function requireRoles(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: AUTH_ERRORS.NO_TOKEN,
            });
            return;
        }
        const userRole = req.user.role;
        if (!allowedRoles.includes(userRole)) {
            res.status(403).json({
                success: false,
                error: {
                    ...AUTH_ERRORS.INSUFFICIENT_PERMISSIONS,
                    details: {
                        required: allowedRoles,
                        current: userRole,
                    },
                },
            });
            return;
        }
        next();
    };
}
function requireTenant(req, res, next) {
    if (!req.user) {
        res.status(401).json({
            success: false,
            error: AUTH_ERRORS.NO_TOKEN,
        });
        return;
    }
    if (!req.user.tenantId) {
        res.status(400).json({
            success: false,
            error: AUTH_ERRORS.TENANT_REQUIRED,
        });
        return;
    }
    next();
}
function requireAuthWithRole(...roles) {
    const middlewares = [requireAuth(), requireRoles(...roles)];
    return (req, res, next) => {
        let index = 0;
        function runNext() {
            if (index >= middlewares.length) {
                return next();
            }
            const middleware = middlewares[index++];
            middleware(req, res, runNext);
        }
        runNext();
    };
}
function verifyRefreshTokenMiddleware(req, res, next) {
    const token = req.body.refreshToken || extractTokenFromHeader(req);
    if (!token) {
        res.status(401).json({
            success: false,
            error: AUTH_ERRORS.NO_TOKEN,
        });
        return;
    }
    const verification = (0, jwtService_1.verifyRefreshToken)(token);
    if (!verification.valid || !verification.payload) {
        res.status(401).json({
            success: false,
            error: {
                ...AUTH_ERRORS.INVALID_TOKEN,
                details: verification.error,
            },
        });
        return;
    }
    req.user = verification.payload;
    req.token = token;
    req.userId = verification.payload.sub;
    req.tenantId = verification.payload.tenantId;
    next();
}
function tenantCorsMiddleware(allowedOrigins = []) {
    return (req, res, next) => {
        const origin = req.headers.origin;
        if (!origin || origin.includes('localhost') || origin.includes('postman')) {
            return next();
        }
        const isAllowed = allowedOrigins.some(allowed => origin === allowed || origin.endsWith(allowed.replace('*', '')));
        if (!isAllowed && allowedOrigins.length > 0) {
            res.status(403).json({
                success: false,
                error: {
                    status: 403,
                    code: 'AUTH_INVALID_ORIGIN',
                    message: 'Origine non consentita',
                },
            });
            return;
        }
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Tenant-Id');
        if (req.method === 'OPTIONS') {
            res.sendStatus(200);
            return;
        }
        next();
    };
}
function auditLogMiddleware(action) {
    return (req, res, next) => {
        res.on('finish', () => {
            const logData = {
                action,
                userId: req.userId,
                tenantId: req.tenantId,
                method: req.method,
                path: req.path,
                statusCode: res.statusCode,
                timestamp: new Date().toISOString(),
                ip: req.ip,
                userAgent: req.headers['user-agent'],
            };
            console.log('[AUDIT]', JSON.stringify(logData));
        });
        next();
    };
}
function authErrorHandler(err, req, res, next) {
    if (err.name === 'UnauthorizedError') {
        res.status(401).json({
            success: false,
            error: AUTH_ERRORS.INVALID_TOKEN,
        });
        return;
    }
    next(err);
}
exports.default = {
    verifyToken,
    requireAuth,
    extractUser,
    requireRoles,
    requireTenant,
    requireAuthWithRole,
    verifyRefreshTokenMiddleware,
    tenantCorsMiddleware,
    auditLogMiddleware,
    authErrorHandler,
    extractTokenFromHeader,
    extractTokenFromCookie,
};
