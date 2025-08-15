// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

import medusa from '@medusajs/ui-preset';
import type { Config } from 'tailwindcss';

const config: Config = {
  presets: [medusa],
  darkMode: 'class',
} satisfies Config;

export default config;
