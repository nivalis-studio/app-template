import { PrismaNeon } from '@prisma/adapter-neon';
import { ENV } from '@/env';
import { PrismaClient } from '@/prisma/client/client';

const connectionString = ENV.DATABASE_URL;
const adapter = new PrismaNeon({ connectionString });

const prismaClientSingleton = () => new PrismaClient({ adapter });

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export * from '@/prisma/client/client';
