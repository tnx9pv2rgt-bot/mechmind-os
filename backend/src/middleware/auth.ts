/**
 * Auth Middleware
 * Middleware per autenticazione e autorizzazione
 * - verifyToken: verifica validità token JWT
 * - requireAuth: richiede autenticazione
 * - extractUser: estrae dati utente dalla richiesta
 */

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, verifyRefreshToken } from '../services/jwtService';

// Import express types to ensure global augmentations are loaded
import '../types/express';

// Interfacce
export interface AuthMiddlewareOptions {
  optional?: boolean; // Se true, non ritorna errore se manca token
  allowExpired?: boolean; // Se true, accetta token scaduti
  requireRole?: string[]; // Ruoli richiesti
  requireTenant?: boolean; // Se true, richiede tenantId nel token
}

export interface AuthError {
  status: number;
  code: string;
  message: string;
}

// Errori standard
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

/**
 * Estrae il token dall'header Authorization
 * Formato atteso: "Bearer <token>"
 * @param req - Request Express
 * @returns string | null
 */
export function extractTokenFromHeader(req: Request): string | null {
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

/**
 * Estrae il token dai cookie
 * @param req - Request Express
 * @param cookieName - Nome del cookie
 * @returns string | null
 */
export function extractTokenFromCookie(
  req: Request,
  cookieName: string = 'accessToken',
): string | null {
  return req.cookies?.[cookieName] || null;
}

/**
 * Middleware base per verificare il token JWT
 * Aggiunge req.user e req.token se valido
 */
export function verifyToken(options: AuthMiddlewareOptions = {}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Estrai token da header o cookie
    let token = extractTokenFromHeader(req);

    if (!token) {
      token = extractTokenFromCookie(req);
    }

    // Se manca il token
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

    // Verifica token
    const verification = verifyAccessToken(token);

    // Gestione token scaduto
    if (!verification.valid && verification.expired) {
      if (options.allowExpired && verification.payload) {
        // Permetti accesso con payload scaduto (per refresh)
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

    // Token non valido
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

    // Verifica tenant se richiesto
    if (options.requireTenant && !verification.payload.tenantId) {
      res.status(400).json({
        success: false,
        error: AUTH_ERRORS.TENANT_REQUIRED,
      });
      return;
    }

    // Aggiungi dati alla request
    req.user = verification.payload;
    req.token = token;
    req.userId = verification.payload.sub;
    req.tenantId = verification.payload.tenantId;

    next();
  };
}

/**
 * Middleware che richiede autenticazione
 * Combina verifyToken con gestione errori standard
 */
export function requireAuth(options: AuthMiddlewareOptions = {}) {
  return verifyToken({ ...options, optional: false });
}

/**
 * Middleware che estrae l'utente se presente, ma non richiede autenticazione
 */
export function extractUser(req: Request, res: Response, next: NextFunction): void {
  const token = extractTokenFromHeader(req) || extractTokenFromCookie(req);

  if (token) {
    const verification = verifyAccessToken(token);

    if (verification.valid && verification.payload) {
      req.user = verification.payload;
      req.token = token;
      req.userId = verification.payload.sub;
      req.tenantId = verification.payload.tenantId;
    }
  }

  next();
}

/**
 * Middleware per verificare i ruoli
 * Da usare dopo requireAuth
 */
export function requireRoles(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
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

/**
 * Middleware per verificare il tenant
 * Da usare dopo requireAuth in contesto multi-tenant
 */
export function requireTenant(req: Request, res: Response, next: NextFunction): void {
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

/**
 * Middleware combinato: richiede auth + ruolo specifico
 */
export function requireAuthWithRole(...roles: string[]) {
  const middlewares = [requireAuth(), requireRoles(...roles)];

  return (req: Request, res: Response, next: NextFunction): void => {
    let index = 0;

    function runNext(): void {
      if (index >= middlewares.length) {
        return next();
      }

      const middleware = middlewares[index++];
      middleware(req, res, runNext);
    }

    runNext();
  };
}

/**
 * Middleware per refresh token endpoint
 * Verifica il refresh token e permette il rinnovo
 */
export function verifyRefreshTokenMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const token = req.body.refreshToken || extractTokenFromHeader(req);

  if (!token) {
    res.status(401).json({
      success: false,
      error: AUTH_ERRORS.NO_TOKEN,
    });
    return;
  }

  const verification = verifyRefreshToken(token);

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

/**
 * Middleware CORS per tenant
 * Verifica che l'origine sia consentita per il tenant
 */
export function tenantCorsMiddleware(allowedOrigins: string[] = []) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.headers.origin;
    // tenantId available via req.tenantId or x-tenant-id header

    // Se non c'è origine o è Postman/localhost, permetti
    if (!origin || origin.includes('localhost') || origin.includes('postman')) {
      return next();
    }

    // Verifica origine consentita
    const isAllowed = allowedOrigins.some(
      allowed => origin === allowed || origin.endsWith(allowed.replace('*', '')),
    );

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

    // Imposta header CORS
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Tenant-Id',
    );

    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }

    next();
  };
}

/**
 * Utility per creare un middleware di audit logging
 */
export function auditLogMiddleware(action: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Log dopo il completamento della richiesta
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

      // Qui puoi salvare su DB o inviare a servizio di logging
      console.log('[AUDIT]', JSON.stringify(logData));
    });

    next();
  };
}

/**
 * Handler per errori di autenticazione globale
 * Da usare alla fine della catena di middleware
 */
export function authErrorHandler(
  err: Error & { name?: string },
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (err.name === 'UnauthorizedError') {
    res.status(401).json({
      success: false,
      error: AUTH_ERRORS.INVALID_TOKEN,
    });
    return;
  }

  next(err);
}

// Export default con tutti i middleware
export default {
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
