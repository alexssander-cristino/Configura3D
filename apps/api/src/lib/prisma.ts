import { PrismaClient } from '@prisma/client';

// Desenvolvimento local: usa o PostgreSQL do Docker Compose quando DATABASE_URL
// não foi definida. Uma variável configurada pelo usuário sempre tem prioridade.
if (!process.env.DATABASE_URL && process.env.NODE_ENV !== 'production') {
  process.env.DATABASE_URL =
    'postgresql://configura3d:configura3d@localhost:5433/configura3d?schema=public';
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
