import { init } from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  init({
    tracesSampleRate: 1,
    enableLogs: true,
    dsn,
  });
}
