import type { PrismaConfig } from 'prisma';

export default {
  schema: 'src/prisma/schema',
  migrations: { path: 'src/prisma/migrations' },
  views: { path: 'src/prisma/views' },
  typedSql: { path: 'src/prisma/queries' },
} satisfies PrismaConfig;
