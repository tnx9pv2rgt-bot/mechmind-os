/**
 * Auth Components Index
 * Esporta tutti i componenti di autenticazione
 */

// Liquid Glass Components
export {
  LiquidGlassCard,
  LiquidGlassCardAnimated,
  AuthCard,
} from './LiquidGlassCard';

// Passkey / WebAuthn Components
export {
  PasskeyButton,
  PasskeyRegistrationButton,
  AuthMethodSelector,
  PasskeyStatusBadge,
  PasskeyList,
} from './passkey-button';
export type {
  PasskeyButtonProps,
  AuthMethodSelectorProps,
  PasskeyRegistrationPromptProps,
} from './passkey-button';

// Apple Sign In
export {
  SignInWithApple,
  SignInWithAppleFull,
} from './SignInWithApple';

// Animated Background
export { default as AnimatedBackground } from './AnimatedBackground';

// Auth Left Panel
export { AuthLeftPanel } from './auth-left-panel';

// OTP Input
export { OtpInput, OTPInput } from './otp-input';

// Password Strength
export { PasswordStrength } from './password-strength';

// Social OAuth Buttons
export { SocialButtons } from './social-buttons';

// Demo Components
export { DemoBanner } from './demo-banner';
export { DemoCTA } from './demo-cta';

// Passkey Prompt
export { PasskeyPrompt } from './passkey-prompt';

// Magic Link
export { MagicLinkSent } from './magic-link-sent';
