'use client';

import dynamic from 'next/dynamic';
import { SkipLink } from '@/components/accessibility/SkipLink';
import { DemoBanner } from '@/components/auth/demo-banner';
import { BetaBanner } from '@/components/layout/BetaBanner';
import { KeyboardShortcutsProvider } from '@/lib/hooks/use-keyboard-shortcuts';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { OnboardingRedirect } from '@/components/layout/onboarding-redirect';
import { useThemeApplier } from '@/lib/hooks/use-theme-applier';

const CommandPalette = dynamic(
  () => import('@/components/command-palette').then(m => m.CommandPalette),
  { ssr: false }
);

const AiChatPanel = dynamic(
  () => import('@/components/ai/ai-chat-panel').then(m => m.AiChatPanel),
  { ssr: false }
);

function ThemeApplier(): null {
  useThemeApplier();
  return null;
}

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  return (
    <KeyboardShortcutsProvider>
      <ThemeApplier />
      <OnboardingRedirect />
      <DemoBanner />
      <BetaBanner />
      <SkipLink targetId='main-content' />
      <DashboardLayout>{children}</DashboardLayout>
      <CommandPalette />
      <AiChatPanel />
    </KeyboardShortcutsProvider>
  );
}
