/**
 * Express Type Augmentations
 * 
 * This file augments the Express and Passport types globally.
 * It ensures req.user has the correct shape across the application.
 */

import { DecodedToken } from '../services/jwtService';

declare global {
  namespace Express {
    /**
     * Augment the User interface (from @types/passport)
     * to include all properties from DecodedToken
     */
    interface User extends DecodedToken {}

    /**
     * Augment the Request interface to include custom properties
     */
    interface Request {
      token?: string;
      tenantId?: string;
      userId?: string;
    }
  }
}

/**
 * Empty export to make this a module
 * This allows the global declarations to be properly merged
 */
export {};
