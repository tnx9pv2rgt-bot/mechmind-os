/**
 * MechMind OS v10 - Voice AI Integration Layer
 * 
 * Main entry point for voice AI functionality:
 * - Express server setup
 * - Webhook route registration
 * - Middleware configuration
 * - Health checks
 * 
 * @module voice/index
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Webhook handlers
const { handleCallEvent } = require('./webhooks/call-event-handler');
const { handleTransferWebhook, handleQueueCheck, handleConferenceStatus } = require('./webhooks/transfer-handler');

// Twilio handlers
const { handleIncomingSMS, handleSMSStatus } = require('./twilio/sms');
const { handleTransferStatus, handleCallbackConfirm } = require('./twilio/transfer');

// Utilities
const { createHmacMiddleware } = require('./utils/hmac');
const { logCallEvent, logError, logPerformance } = require('./utils/logger');

// Create Express app
const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://api.mechmind-os.com'],
  methods: ['POST', 'GET'],
  allowedHeaders: ['Content-Type', 'X-Vapi-Signature', 'X-Shop-ID', 'X-Tenant-ID']
}));

// Rate limiting
const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { error: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false
});

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    logPerformance({
      name: 'http_request',
      value: duration,
      unit: 'ms',
      context: {
        method: req.method,
        path: req.path,
        status: res.statusCode
      }
    });
  });
  
  next();
});

// ============================================
// HEALTH CHECKS
// ============================================

/**
 * Health check endpoint
 * GET /health
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'mechmind-voice-ai',
    version: '10.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * Readiness check endpoint
 * GET /ready
 */
app.get('/ready', async (req, res) => {
  const checks = await runReadinessChecks();
  
  const allReady = Object.values(checks).every(c => c.ready);
  
  res.status(allReady ? 200 : 503).json({
    ready: allReady,
    checks,
    timestamp: new Date().toISOString()
  });
});

// ============================================
// VAPI WEBHOOKS
// ============================================

/**
 * Main Vapi call event webhook
 * POST /webhooks/vapi/call-event
 */
app.post('/webhooks/vapi/call-event', 
  webhookLimiter,
  createHmacMiddleware({
    secret: process.env.VAPI_WEBHOOK_SECRET,
    headerName: 'x-vapi-signature'
  }),
  async (req, res) => {
    try {
      await handleCallEvent(req, res);
    } catch (error) {
      logError(error, {
        path: '/webhooks/vapi/call-event',
        shopId: req.headers['x-shop-id']
      });
      
      // Return graceful error
      res.status(500).json({
        success: false,
        error: 'Internal error',
        fallback: true,
        message: 'Aspetta un momento, ti passo a un collega umano.'
      });
    }
  }
);

/**
 * Vapi transfer webhook
 * POST /webhooks/vapi/transfer
 */
app.post('/webhooks/vapi/transfer',
  webhookLimiter,
  createHmacMiddleware({
    secret: process.env.VAPI_WEBHOOK_SECRET,
    headerName: 'x-vapi-signature'
  }),
  async (req, res) => {
    try {
      await handleTransferWebhook(req, res);
    } catch (error) {
      logError(error, { path: '/webhooks/vapi/transfer' });
      res.status(500).json({
        success: false,
        error: 'Transfer failed',
        fallbackNumber: process.env.FALLBACK_SHOP_NUMBER
      });
    }
  }
);

// ============================================
// TWILIO WEBHOOKS
// ============================================

/**
 * Twilio incoming SMS webhook
 * POST /twilio/sms-incoming
 */
app.post('/twilio/sms-incoming', async (req, res) => {
  try {
    await handleIncomingSMS(req, res);
  } catch (error) {
    logError(error, { path: '/twilio/sms-incoming' });
    res.sendStatus(500);
  }
});

/**
 * Twilio SMS status callback
 * POST /twilio/sms-status
 */
app.post('/twilio/sms-status', async (req, res) => {
  try {
    await handleSMSStatus(req, res);
  } catch (error) {
    logError(error, { path: '/twilio/sms-status' });
    res.sendStatus(500);
  }
});

/**
 * Twilio transfer status callback
 * POST /twilio/transfer-status
 */
app.post('/twilio/transfer-status', async (req, res) => {
  try {
    await handleTransferStatus(req, res);
  } catch (error) {
    logError(error, { path: '/twilio/transfer-status' });
    res.sendStatus(500);
  }
});

/**
 * Twilio queue check
 * POST /twilio/queue-check
 */
app.post('/twilio/queue-check', async (req, res) => {
  try {
    await handleQueueCheck(req, res);
  } catch (error) {
    logError(error, { path: '/twilio/queue-check' });
    res.sendStatus(500);
  }
});

/**
 * Twilio callback confirmation
 * POST /twilio/callback-confirm
 */
app.post('/twilio/callback-confirm', async (req, res) => {
  try {
    await handleCallbackConfirm(req, res);
  } catch (error) {
    logError(error, { path: '/twilio/callback-confirm' });
    res.sendStatus(500);
  }
});

/**
 * Twilio conference status
 * POST /twilio/conference-status
 */
app.post('/twilio/conference-status', async (req, res) => {
  try {
    await handleConferenceStatus(req, res);
  } catch (error) {
    logError(error, { path: '/twilio/conference-status' });
    res.sendStatus(500);
  }
});

/**
 * Twilio recording status
 * POST /twilio/recording-status
 */
app.post('/twilio/recording-status', (req, res) => {
  console.log('[Twilio] Recording status:', req.body);
  res.sendStatus(200);
});

/**
 * Twilio voicemail received
 * POST /twilio/voicemail-received
 */
app.post('/twilio/voicemail-received', (req, res) => {
  console.log('[Twilio] Voicemail received:', req.body);
  
  // Log voicemail for follow-up
  logCallEvent({
    event: 'voicemail.received',
    recordingUrl: req.body.RecordingUrl,
    from: req.body.From,
    duration: req.body.RecordingDuration
  });
  
  res.sendStatus(200);
});

// ============================================
// API ENDPOINTS
// ============================================

/**
 * Get voice configuration for shop
 * GET /api/config/:shopId
 */
app.get('/api/config/:shopId', async (req, res) => {
  try {
    const { shopId } = req.params;
    
    // Fetch shop-specific config
    const config = await getShopVoiceConfig(shopId);
    
    res.json({
      success: true,
      config
    });
  } catch (error) {
    logError(error, { path: '/api/config', shopId: req.params.shopId });
    res.status(500).json({
      success: false,
      error: 'Failed to load config'
    });
  }
});

/**
 * Get call statistics
 * GET /api/stats/:shopId
 */
app.get('/api/stats/:shopId', async (req, res) => {
  try {
    const { shopId } = req.params;
    const { period = '24h' } = req.query;
    
    const stats = await getCallStats(shopId, period);
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logError(error, { path: '/api/stats', shopId: req.params.shopId });
    res.status(500).json({
      success: false,
      error: 'Failed to load stats'
    });
  }
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path
  });
});

// Global error handler
app.use((error, req, res, next) => {
  logError(error, {
    path: req.path,
    method: req.method,
    shopId: req.headers['x-shop-id']
  });

  res.status(500).json({
    error: 'Internal server error',
    requestId: req.id
  });
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Run readiness checks
 */
async function runReadinessChecks() {
  const checks = {
    backend: { ready: false },
    twilio: { ready: false },
    vapi: { ready: false }
  };

  // Check backend connectivity
  try {
    const backendResponse = await fetch(
      `${process.env.BACKEND_API_URL}/health`,
      { timeout: 5000 }
    );
    checks.backend.ready = backendResponse.ok;
  } catch (error) {
    checks.backend.error = error.message;
  }

  // Check Twilio (verify credentials are set)
  checks.twilio.ready = !!(
    process.env.TWILIO_ACCOUNT_SID && 
    process.env.TWILIO_AUTH_TOKEN
  );

  // Check Vapi (verify secret is set)
  checks.vapi.ready = !!process.env.VAPI_WEBHOOK_SECRET;

  return checks;
}

/**
 * Get shop voice configuration
 */
async function getShopVoiceConfig(shopId) {
  try {
    const response = await fetch(
      `${process.env.BACKEND_API_URL}/shops/${shopId}/voice-config`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`
        }
      }
    );

    if (!response.ok) {
      throw new Error('Config not found');
    }

    return await response.json();
  } catch (error) {
    // Return default config
    return require('./vapi-config.json');
  }
}

/**
 * Get call statistics
 */
async function getCallStats(shopId, period) {
  try {
    const response = await fetch(
      `${process.env.BACKEND_API_URL}/analytics/calls?shopId=${shopId}&period=${period}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`
        }
      }
    );

    if (!response.ok) {
      throw new Error('Stats not found');
    }

    return await response.json();
  } catch (error) {
    return {
      totalCalls: 0,
      avgDuration: 0,
      escalationRate: 0,
      bookingConversion: 0
    };
  }
}

// ============================================
// SERVER STARTUP
// ============================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   MechMind OS v10 - Voice AI Integration                   ║
║                                                            ║
║   Server running on port ${PORT}                          ║
║   Environment: ${process.env.NODE_ENV || 'development'}                          ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  
  // Flush any pending logs
  const { flushLogBuffer } = require('./utils/logger');
  await flushLogBuffer();
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  
  const { flushLogBuffer } = require('./utils/logger');
  await flushLogBuffer();
  
  process.exit(0);
});

module.exports = app;
