'use client';

import { Toaster } from 'sonner';
import { useThemeStore } from '@/stores/theme-store';

export function DynamicToaster(): React.ReactElement {
  const { toastPosition } = useThemeStore();
  return <Toaster richColors position={toastPosition} />;
}
