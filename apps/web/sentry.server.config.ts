import { init } from '@sentry/nextjs';

const TRACES_SAMPLE_RATE_DEV = 1.0;
const TRACES_SAMPLE_RATE_PROD = 0.1;

if (process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN) {
  init({
    dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,

    tracesSampleRate:
      process.env.NODE_ENV === 'development'
        ? TRACES_SAMPLE_RATE_DEV
        : TRACES_SAMPLE_RATE_PROD,

    enableLogs: true,
  });
}
