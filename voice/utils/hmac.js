/**
 * MechMind OS v10 - HMAC Verification Utility
 * 
 * Webhook security:
 * - HMAC signature verification
 * - Timestamp validation
 * - Replay attack prevention
 * 
 * @module utils/hmac
 */

const crypto = require('crypto');

// Security configuration
const SECURITY_CONFIG = {
  TIMESTAMP_TOLERANCE_SECONDS: 300, // 5 minutes
  MAX_SIGNATURE_AGE_MS: 5 * 60 * 1000, // 5 minutes
  SIGNATURE_ALGORITHM: 'sha256',
  SIGNATURE_ENCODING: 'hex'
};

/**
 * Verify HMAC signature for webhook requests
 * @param {Object|string} payload - Request body
 * @param {string} signature - Signature from header
 * @param {string} secret - Webhook secret
 * @param {Object} options - Verification options
 */
function verifyHmacSignature(payload, signature, secret, options = {}) {
  if (!signature || !secret) {
    console.error('[HMAC] Missing signature or secret');
    return false;
  }

  try {
    // Parse signature header (format: "t=timestamp,v=signature")
    const { timestamp, signatureValue } = parseSignatureHeader(signature);

    // Validate timestamp (prevent replay attacks)
    if (!options.skipTimestamp && timestamp) {
      const timestampAge = Date.now() - (parseInt(timestamp) * 1000);
      
      if (timestampAge > SECURITY_CONFIG.MAX_SIGNATURE_AGE_MS) {
        console.error('[HMAC] Signature too old:', timestampAge, 'ms');
        return false;
      }

      if (timestampAge < -SECURITY_CONFIG.MAX_SIGNATURE_AGE_MS) {
        console.error('[HMAC] Signature from future');
        return false;
      }
    }

    // Normalize payload
    const payloadString = typeof payload === 'string' 
      ? payload 
      : JSON.stringify(payload);

    // Build signed content
    const signedContent = timestamp 
      ? `${timestamp}.${payloadString}`
      : payloadString;

    // Compute expected signature
    const expectedSignature = crypto
      .createHmac(SECURITY_CONFIG.SIGNATURE_ALGORITHM, secret)
      .update(signedContent, 'utf8')
      .digest(SECURITY_CONFIG.SIGNATURE_ENCODING);

    // Compare signatures (timing-safe)
    const providedSignature = signatureValue.toLowerCase();
    const computedSignature = expectedSignature.toLowerCase();

    const isValid = crypto.timingSafeEqual(
      Buffer.from(providedSignature, 'hex'),
      Buffer.from(computedSignature, 'hex')
    );

    if (!isValid) {
      console.error('[HMAC] Signature mismatch');
      console.error('[HMAC] Expected:', computedSignature);
      console.error('[HMAC] Provided:', providedSignature);
    }

    return isValid;

  } catch (error) {
    console.error('[HMAC] Verification error:', error);
    return false;
  }
}

/**
 * Parse signature header
 * @param {string} header - Signature header value
 */
function parseSignatureHeader(header) {
  // Handle different signature formats
  
  // Format 1: Vapi style - "t=1234567890,v=abc123..."
  if (header.includes('t=') && header.includes('v=')) {
    const parts = header.split(',');
    const timestamp = parts.find(p => p.startsWith('t='))?.split('=')[1];
    const signatureValue = parts.find(p => p.startsWith('v='))?.split('=')[1];
    
    return { timestamp, signatureValue };
  }

  // Format 2: Simple hex signature
  if (/^[a-f0-9]+$/i.test(header)) {
    return { timestamp: null, signatureValue: header };
  }

  // Format 3: Bearer token style - "sha256=abc123..."
  if (header.includes('=')) {
    const [, signatureValue] = header.split('=');
    return { timestamp: null, signatureValue };
  }

  // Unknown format - treat as raw signature
  return { timestamp: null, signatureValue: header.trim() };
}

/**
 * Generate HMAC signature for outgoing webhooks
 * @param {Object|string} payload - Payload to sign
 * @param {string} secret - Webhook secret
 * @param {Object} options - Signing options
 */
function generateHmacSignature(payload, secret, options = {}) {
  try {
    const timestamp = options.timestamp || Math.floor(Date.now() / 1000);
    
    const payloadString = typeof payload === 'string'
      ? payload
      : JSON.stringify(payload);

    const signedContent = options.includeTimestamp
      ? `${timestamp}.${payloadString}`
      : payloadString;

    const signature = crypto
      .createHmac(SECURITY_CONFIG.SIGNATURE_ALGORITHM, secret)
      .update(signedContent, 'utf8')
      .digest(SECURITY_CONFIG.SIGNATURE_ENCODING);

    if (options.includeTimestamp) {
      return `t=${timestamp},v=${signature}`;
    }

    return signature;

  } catch (error) {
    console.error('[HMAC] Generation error:', error);
    throw error;
  }
}

/**
 * Create middleware for Express HMAC verification
 * @param {Object} options - Middleware options
 */
function createHmacMiddleware(options = {}) {
  const {
    secret = process.env.VAPI_WEBHOOK_SECRET,
    headerName = 'x-vapi-signature',
    onFailure = (req, res) => res.status(401).json({ error: 'Invalid signature' })
  } = options;

  return (req, res, next) => {
    const signature = req.headers[headerName.toLowerCase()];
    
    if (!verifyHmacSignature(req.body, signature, secret)) {
      console.error('[HMAC Middleware] Invalid signature from:', req.ip);
      return onFailure(req, res);
    }

    next();
  };
}

/**
 * Verify Twilio request signature
 * @param {string} authToken - Twilio auth token
 * @param {string} url - Request URL
 * @param {Object} params - Request parameters
 * @param {string} signature - X-Twilio-Signature header
 */
function verifyTwilioSignature(authToken, url, params, signature) {
  try {
    const client = require('twilio')(null, authToken);
    return client.validateRequest(authToken, signature, url, params);
  } catch (error) {
    console.error('[HMAC] Twilio verification error:', error);
    return false;
  }
}

/**
 * Generate nonce for additional security
 */
function generateNonce() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Hash sensitive data for logging
 * @param {string} data - Data to hash
 */
function hashForLogging(data) {
  return crypto
    .createHash('sha256')
    .update(data)
    .digest('hex')
    .substring(0, 16);
}

/**
 * Verify request origin
 * @param {string} origin - Request origin
 * @param {string[]} allowedOrigins - List of allowed origins
 */
function verifyOrigin(origin, allowedOrigins) {
  if (!allowedOrigins || allowedOrigins.length === 0) {
    return true; // No origin restriction
  }

  if (!origin) {
    return false;
  }

  return allowedOrigins.some(allowed => {
    if (allowed.includes('*')) {
      const pattern = allowed.replace(/\*/g, '.*');
      return new RegExp(pattern).test(origin);
    }
    return origin === allowed;
  });
}

module.exports = {
  verifyHmacSignature,
  generateHmacSignature,
  parseSignatureHeader,
  createHmacMiddleware,
  verifyTwilioSignature,
  generateNonce,
  hashForLogging,
  verifyOrigin,
  SECURITY_CONFIG
};
