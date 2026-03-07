/**
 * Voice Fallback Strategy - Multi-Layer
 * Implements production-ready fallback for voice latency issues
 * 
 * Architecture:
 * Layer 1: Vapi.ai Primary (target < 1.2s)
 * Layer 2: IVR Fallback (trigger @ 2.5s)
 * Layer 3: Human Transfer
 * Layer 4: Voicemail + Callback
 * Layer 5: Alternative AI (Retell)
 * 
 * Validation: https://voiceaiwrapper.com/insights/vapi-voice-ai-optimization-performance-guide-voiceaiwrapper
 */

const IVRFallback = require('./ivr-fallback');
const logger = require('../utils/logger');

class VoiceFallbackManager {
  constructor() {
    this.ivr = new IVRFallback();
    this.metrics = {
      totalCalls: 0,
      fallbackCount: 0,
      latencySum: 0,
    };
  }

  /**
   * Monitor voice latency and trigger fallback if needed
   */
  async monitorLatency(callId, latencyMs, error = null) {
    this.metrics.totalCalls++;
    this.metrics.latencySum += latencyMs;
    
    const avgLatency = this.metrics.latencySum / this.metrics.totalCalls;
    const fallbackDecision = this.ivr.shouldTriggerFallback(latencyMs, error);
    
    if (fallbackDecision.trigger) {
      this.metrics.fallbackCount++;
      
      logger.warn('FALLBACK_TRIGGERED', {
        callId,
        latencyMs,
        reason: fallbackDecision.reason,
        fallbackRate: (this.metrics.fallbackCount / this.metrics.totalCalls * 100).toFixed(2) + '%',
        avgLatency: avgLatency.toFixed(2),
      });
      
      // Alert if fallback rate > 10%
      if (this.metrics.fallbackCount / this.metrics.totalCalls > 0.10) {
        logger.error('FALLBACK_RATE_CRITICAL', {
          rate: this.metrics.fallbackCount / this.metrics.totalCalls,
          threshold: 0.10,
        });
        // TODO: Trigger PagerDuty alert
      }
      
      return {
        action: 'FALLBACK_TO_IVR',
        reason: fallbackDecision.reason,
        ivrUrl: '/webhooks/ivr-menu',
      };
    }
    
    return { action: 'CONTINUE' };
  }

  /**
   * Get fallback statistics
   */
  getStats() {
    return {
      ...this.metrics,
      fallbackRate: this.metrics.totalCalls > 0 
        ? (this.metrics.fallbackCount / this.metrics.totalCalls * 100).toFixed(2) + '%'
        : '0%',
      avgLatency: this.metrics.totalCalls > 0
        ? (this.metrics.latencySum / this.metrics.totalCalls).toFixed(2) + 'ms'
        : '0ms',
    };
  }

  /**
   * Reset metrics (for daily reporting)
   */
  resetMetrics() {
    this.metrics = {
      totalCalls: 0,
      fallbackCount: 0,
      latencySum: 0,
    };
  }
}

module.exports = {
  VoiceFallbackManager,
  IVRFallback,
};
