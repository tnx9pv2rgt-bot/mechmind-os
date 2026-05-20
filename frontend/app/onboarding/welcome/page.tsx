'use client';

import { useEffect, useState } from 'react';
import { WelcomeScreen } from '@/components/onboarding/welcome-screen';
import type { ShopType } from '@/stores/onboarding-store';

const SHOP_TYPE_LABELS: Record<string, string> = {
  meccanica: 'Meccanica generale',
  carrozzeria: 'Carrozzeria',
  elettrauto: 'Elettrauto',
  gommista: 'Gommista',
  multimarca: 'Multimarca',
  concessionaria: 'Concessionaria',
};

export default function OnboardingWelcomePage(): React.ReactElement {
  const [userName, setUserName] = useState('');
  const [shopTypeLabel, setShopTypeLabel] = useState('la tua officina');
  const [rawShopType, setRawShopType] = useState<ShopType | null>(null);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.json())
      .then((data: { user?: { name?: string; email?: string } }) => {
        if (data.user?.name) setUserName(data.user.name);
        else if (data.user?.email) setUserName(data.user.email.split('@')[0]);
      })
      .catch(() => {});

    try {
      const raw = localStorage.getItem('mechmind_onboarding_answers');
      if (raw) {
        const answers = JSON.parse(raw) as { shopType?: string };
        if (answers.shopType && SHOP_TYPE_LABELS[answers.shopType]) {
          setShopTypeLabel(SHOP_TYPE_LABELS[answers.shopType]);
          setRawShopType(answers.shopType as ShopType);
        }
      }
    } catch {
      // localStorage non disponibile, usa default
    }
  }, []);

  const handleGoToDashboard = async (): Promise<void> => {
    localStorage.setItem('mechmind_onboarding_dismissed', 'true');
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      const data = (await res.json()) as { user?: unknown };
      if (data.user) {
        window.location.href = '/dashboard';
      } else {
        window.location.href = '/auth?redirect=/dashboard';
      }
    } catch {
      window.location.href = '/auth?redirect=/dashboard';
    }
  };

  return (
    <WelcomeScreen
      userName={userName}
      shopType={shopTypeLabel}
      rawShopType={rawShopType}
      onGoToDashboard={handleGoToDashboard}
    />
  );
}
