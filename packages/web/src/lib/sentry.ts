/**
 * Sentry initialization.
 *
 * To enable:
 * 1. pnpm add @sentry/react  (in packages/web)
 * 2. Set VITE_SENTRY_DSN in .env
 * 3. Uncomment the init call below
 */

// import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

export function initSentry() {
  if (!SENTRY_DSN) return; // No DSN configured — skip

  // Uncomment when @sentry/react is installed:
  // Sentry.init({
  //   dsn: SENTRY_DSN,
  //   environment: import.meta.env.MODE,
  //   tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
  //   replaysSessionSampleRate: 0,
  //   replaysOnErrorSampleRate: import.meta.env.PROD ? 0.5 : 1.0,
  //   integrations: [
  //     Sentry.browserTracingIntegration(),
  //     Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
  //   ],
  //   beforeSend(event) {
  //     // Strip PII from error reports
  //     if (event.request?.headers) {
  //       delete event.request.headers['cookie'];
  //       delete event.request.headers['authorization'];
  //     }
  //     return event;
  //   },
  // });
}
