/**
 * ClientOnly Component
 * 
 * Wrapper component that only renders its children on the client-side.
 * Use this to prevent hydration mismatches for components that depend on
 * browser APIs or have different server/client renders.
 * 
 * @example
 * <ClientOnly fallback={<Loading />}>
 *   <ChartComponent />
 * </ClientOnly>
 */

'use client';

import { useState, useEffect, ReactNode } from 'react';

interface ClientOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Renders children only on the client-side after hydration is complete.
 * During SSR and initial hydration, renders the fallback (or null if not provided).
 */
export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient ? <>{children}</> : <>{fallback}</>;
}

/**
 * Alternative: ClientOnly with a wrapper div
 * Useful when you need to maintain layout during SSR
 */
interface ClientOnlyWrapperProps extends ClientOnlyProps {
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

export function ClientOnlyWrapper({ 
  children, 
  fallback = null, 
  className,
  as: Component = 'div'
}: ClientOnlyWrapperProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const Wrapper = Component as any;

  return (
    <Wrapper className={className}>
      {isClient ? children : fallback}
    </Wrapper>
  );
}

export default ClientOnly;
