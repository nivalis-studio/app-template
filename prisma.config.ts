import { config } from 'dotenv';
import type { PrismaConfig } from 'prisma';

config();

export default {
  schema: 'src/prisma/schema',
  migrations: { path: 'src/prisma/migrations' },
  views: { path: 'src/prisma/views' },
  typedSql: { path: 'src/prisma/queries' },
} satisfies PrismaConfig;
