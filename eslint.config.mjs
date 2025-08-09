import { nivalis } from '@nivalis/eslint-config';

export default nivalis(
  {
    tailwindcss: false,
  },
  {
    ignores: ['src/prisma/client/**'],
  },
);
