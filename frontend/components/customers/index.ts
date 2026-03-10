/**
 * Customer Components
 *
 * This module exports all customer-related components including:
 * - AI-powered form assistant with voice input, smart address parsing,
 *   company intelligence, and contextual suggestions
 * - Premium and standard customer forms
 * - Dialogs and management components
 */

// Main Components
export { CustomerFormPremiumIntegrated as CustomerFormPremium } from "./customer-form-premium-integrated";
export { CustomerFormComplete } from "./customer-form-complete";
export { CustomerForm } from "./CustomerForm";
export { CustomerDialog } from "./customer-dialog";

// AI Assistant Components
export {
  VoiceInputButton,
  SmartAddressInput,
  CompanyIntelligence,
  PredictiveInput,
  AIValidationMessage,
  useAIValidation,
  stepSuggestions,
} from "./ai-form-assistant";

// Loyalty & Marketing
export { LoyaltyProgram } from "./loyalty-program";
export { MarketingCampaigns } from "./marketing-campaigns";
export { SegmentationPanel } from "./segmentation-panel";

// Types (re-exported from ai-form-assistant)
export type {
  AIStatus,
  Message,
  ParsedAddress,
  CompanyData,
  AIAction,
} from "./ai-form-assistant";
