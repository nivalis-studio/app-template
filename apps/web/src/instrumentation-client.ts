import {
  captureRouterTransitionStart,
  init,
  replayIntegration,
} from '@sentry/nextjs';

const tracesSampleRate = 1.0;
const replaysSessionSampleRate = 1.0;
const replaysOnErrorSampleRate = 1.0;
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  init({
    dsn,
    tracesSampleRate,
    replaysSessionSampleRate,
    replaysOnErrorSampleRate,
    enableLogs: true,
    sendDefaultPii: false,
    integrations: [
      replayIntegration({
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: true,
      }),
    ],
  });
}

export const onRouterTransitionStart = captureRouterTransitionStart;
