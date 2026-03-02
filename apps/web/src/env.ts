import { z } from 'zod';
import type { ZodSafeParseResult } from 'zod';
import type { util } from 'zod/v4/core';

// WARN: when adding env variables here
// ⚠️ don't forget to also put them in turbo.json

const serverSchema = z.object({
  DATABASE_URL: z.string(),
  BETTER_AUTH_SECRET: z.string(),
  SENTRY_DSN: z.string().url().optional(),

  // AI Provider Keys
  OPENAI_API_KEY: z.string().optional(),
  MISTRAL_API_KEY: z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  FIRECRAWL_API_KEY: z.string().optional(),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REFRESH_TOKEN: z.string().optional(),
});

const clientSchema = z.object({
  NEXT_PUBLIC_VERCEL_URL: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
});

const sharedSchema = z.object({
  NODE_ENV: z.enum(['development', 'production']).default('development'),
});

const processEnv = {
  // clientSchema keys
  NEXT_PUBLIC_VERCEL_URL: process.env.NEXT_PUBLIC_VERCEL_URL,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN || undefined,

  // serverSchema keys
  DATABASE_URL: process.env.DATABASE_URL,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  SENTRY_DSN: process.env.SENTRY_DSN || undefined,

  // AI Provider Keys
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  MISTRAL_API_KEY: process.env.MISTRAL_API_KEY,
  GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY,

  // Google OAuth
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_REFRESH_TOKEN: process.env.GOOGLE_REFRESH_TOKEN,

  // sharedSchema keys
  NODE_ENV: process.env.NODE_ENV,
};

const mergedSchema = z.object({
  ...serverSchema.shape,
  ...clientSchema.shape,
  ...sharedSchema.shape,
});

const runtimeSchema = z.object({
  ...clientSchema.shape,
  ...sharedSchema.shape,
});

type MergedInput = z.input<typeof mergedSchema>;
type MergedOutput = z.infer<typeof mergedSchema>;
type MergedSafeParseReturn = ZodSafeParseResult<
  util.Extend<MergedInput, MergedOutput>
>;

let env = null as unknown as MergedOutput;

const isServer = typeof window === 'undefined';

const parsed = (
  isServer
    ? mergedSchema.safeParse(processEnv) // on server we can validate all env vars
    : runtimeSchema.safeParse(processEnv)
) as MergedSafeParseReturn; // on client we can only validate the ones that are exposed

if (!parsed.success) {
  console.error(
    '❌ Invalid environment variables:',
    z.treeifyError(parsed.error),
  );

  throw new Error('Invalid environment variables');
}

env = parsed.data;

export { env as ENV };
