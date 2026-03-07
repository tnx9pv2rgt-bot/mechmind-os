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
export { default as CustomerFormPremium } from "./customer-form-premium";
export { default as CustomerFormComplete } from "./customer-form-complete";
export { default as CustomerForm } from "./CustomerForm";
export { default as CustomerDialog } from "./customer-dialog";

// AI Assistant Components
export { default as AIFormAssistant } from "./ai-form-assistant";
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
export { default as LoyaltyProgram } from "./loyalty-program";
export { default as MarketingCampaigns } from "./marketing-campaigns";
export { default as SegmentationPanel } from "./segmentation-panel";

// Types (re-exported from ai-form-assistant)
export type {
  AIStatus,
  Message,
  ParsedAddress,
  CompanyData,
  AIAction,
} from "./ai-form-assistant";
