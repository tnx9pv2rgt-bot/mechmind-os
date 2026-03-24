'use client';

import { useRouter } from 'next/navigation';
import { WelcomeScreen } from '@/components/onboarding/welcome-screen';
import { useOnboardingStore } from '@/stores/onboarding-store';

const SHOP_TYPE_LABELS: Record<string, string> = {
  meccanica: 'Meccanica generale',
  carrozzeria: 'Carrozzeria',
  elettrauto: 'Elettrauto',
  gommista: 'Gommista',
  multimarca: 'Multimarca',
  concessionaria: 'Concessionaria',
};

export default function OnboardingWelcomePage(): React.ReactElement {
  const router = useRouter();
  const { answers } = useOnboardingStore();

  const shopTypeLabel = answers.shopType
    ? SHOP_TYPE_LABELS[answers.shopType] || answers.shopType
    : 'la tua officina';

  return (
    <WelcomeScreen
      userName=""
      shopType={shopTypeLabel}
      onGoToDashboard={() => router.push('/dashboard')}
      onWatchTutorial={() => {
        // Future: open tutorial video modal
      }}
    />
  );
}
