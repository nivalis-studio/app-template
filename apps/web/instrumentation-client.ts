import {
  captureRouterTransitionStart,
  init,
  replayIntegration,
} from '@sentry/nextjs';

const TRACES_SAMPLE_RATE_DEV = 1.0;
const TRACES_SAMPLE_RATE_PROD = 0.1;
const REPLAYS_SESSION_SAMPLE_RATE = 0.1;
const REPLAYS_ON_ERROR_SAMPLE_RATE = 1.0;

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    sendDefaultPii: false,

    tracesSampleRate:
      process.env.NODE_ENV === 'development'
        ? TRACES_SAMPLE_RATE_DEV
        : TRACES_SAMPLE_RATE_PROD,

    integrations: [
      replayIntegration({
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: true,
      }),
    ],

    replaysSessionSampleRate: REPLAYS_SESSION_SAMPLE_RATE,
    replaysOnErrorSampleRate: REPLAYS_ON_ERROR_SAMPLE_RATE,

    enableLogs: true,
  });
}

export const onRouterTransitionStart = captureRouterTransitionStart;
