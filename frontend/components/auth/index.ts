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
export type { LiquidGlassCardProps } from './LiquidGlassCard';

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
export type { SignInWithAppleProps } from './SignInWithApple';

// Animated Background
export { default as AnimatedBackground } from './AnimatedBackground';
