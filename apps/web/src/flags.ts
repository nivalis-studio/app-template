import { flag } from 'flags/next';

/**
 * Feature flags for the Nivalis web application.
 *
 * Each flag uses the Flags SDK's standalone `decide()` pattern — no external
 * flag provider or `FLAGS_SECRET` required.  Values are resolved at request
 * time on the server.
 *
 * Usage in a React Server Component or Route Handler:
 * ```ts
 * import { showNewDashboard } from '@/flags';
 *
 * export default async function Page() {
 *   const enabled = await showNewDashboard();
 *   // …
 * }
 * ```
 */

/** Toggle the redesigned dashboard UI behind an environment variable. */
export const showNewDashboard = flag<boolean>({
  key: 'show-new-dashboard',
  decide() {
    return process.env.ENABLE_NEW_DASHBOARD === 'true';
  },
  defaultValue: false,
  description: 'Show the redesigned dashboard UI',
  options: [
    { value: false, label: 'Legacy' },
    { value: true, label: 'New' },
  ],
});

/** Enable the AI chat widget. On by default. */
export const enableAiChat = flag<boolean>({
  key: 'enable-ai-chat',
  decide() {
    return true;
  },
  defaultValue: true,
  description: 'Enable the AI chat widget',
  options: [
    { value: false, label: 'Disabled' },
    { value: true, label: 'Enabled' },
  ],
});
