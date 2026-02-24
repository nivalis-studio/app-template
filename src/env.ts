import { z } from 'zod';
import type { ZodSafeParseResult } from 'zod';
import type { util } from 'zod/v4/core';

// WARN: when adding env variables here
// ⚠️ don't forget to also put them in turbo.json

const serverSchema = z.object({
  DATABASE_URL: z.string(),
  BETTER_AUTH_SECRET: z.string(),
});

const clientSchema = z.object({
  NEXT_PUBLIC_VERCEL_URL: z.string().optional(),
});

const sharedSchema = z.object({
  NODE_ENV: z.enum(['development', 'production']).default('development'),
});

const processEnv = {
  // clientSchema keys
  NEXT_PUBLIC_VERCEL_URL: process.env.NEXT_PUBLIC_VERCEL_URL,

  // serverSchema keys
  DATABASE_URL: process.env.DATABASE_URL,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,

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
