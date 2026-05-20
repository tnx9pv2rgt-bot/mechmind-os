import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || '',
  enabled: process.env.NODE_ENV === 'production',
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});

// Required by @sentry/nextjs v10+ for navigation instrumentation.
// On Next.js 14 this export is a no-op; on 15+ it activates route transition tracing.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
