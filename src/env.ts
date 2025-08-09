import { z } from 'zod/v4';
import type { ZodSafeParseResult } from 'zod/v4';
import type { util } from 'zod/v4/core';

// WARN: when adding env variables here
// ⚠️ don't forget to also put them in turbo.json

const serverSchema = z.object({
  VERCEL: z.string().optional(),
  CI: z.string().optional(),
  VERCEL_ENV: z.enum(['development', 'preview', 'production']).optional(),
  VERCEL_URL: z.string().optional(),
  VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),
  VERCEL_BRANCH_URL: z.string().optional(),
  VERCEL_REGION: z.string().optional(),
  VERCEL_DEPLOYMENT_ID: z.string().optional(),
  VERCEL_SKEW_PROTECTION_ENABLED: z.string().optional(),
  VERCEL_AUTOMATION_BYPASS_SECRET: z.string().optional(),
  VERCEL_GIT_PROVIDER: z.string().optional(),
  VERCEL_GIT_REPO_SLUG: z.string().optional(),
  VERCEL_GIT_REPO_OWNER: z.string().optional(),
  VERCEL_GIT_REPO_ID: z.string().optional(),
  VERCEL_GIT_COMMIT_REF: z.string().optional(),
  VERCEL_GIT_COMMIT_SHA: z.string().optional(),
  VERCEL_GIT_COMMIT_MESSAGE: z.string().optional(),
  VERCEL_GIT_COMMIT_AUTHOR_LOGIN: z.string().optional(),
  VERCEL_GIT_COMMIT_AUTHOR_NAME: z.string().optional(),
  VERCEL_GIT_PREVIOUS_SHA: z.string().optional(),
  VERCEL_GIT_PULL_REQUEST_ID: z.string().optional(),
});

const clientSchema = z.object({
  NEXT_PUBLIC_VERCEL_URL: z.string().optional(),
});

const sharedSchema = z.object({
  NODE_ENV: z.enum(['development', 'production']).default('development'),
});

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

/* eslint-disable-next-line import/no-mutable-exports */
let ENV = null as unknown as MergedOutput;

const isServer = typeof window === 'undefined';

const parsed = (
  isServer
    ? mergedSchema.safeParse(process.env) // on server we can validate all env vars
    : runtimeSchema.safeParse(process.env)
) as MergedSafeParseReturn; // on client we can only validate the ones that are exposed

if (!parsed.success) {
  console.error(
    '❌ Invalid environment variables:',
    z.treeifyError(parsed.error),
  );

  throw new Error('Invalid environment variables');
}

ENV = parsed.data;

export { ENV };
