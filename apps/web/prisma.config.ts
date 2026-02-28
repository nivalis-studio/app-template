import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'src/prisma/schema',
  migrations: { path: 'src/prisma/migrations' },
  views: { path: 'src/prisma/views' },
  typedSql: { path: 'src/prisma/queries' },
  datasource: { url: './database.sqlite' },
});
