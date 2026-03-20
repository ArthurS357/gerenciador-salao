import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

// 1. O PrismaLibSql agora recebe as configurações (Config) diretamente
const adapter = new PrismaLibSql({
    url: process.env.DATABASE_URL || 'file:./dev.db',
});

// 2. Declaração global para evitar erros de tipagem no Next.js
const globalForPrisma = global as unknown as { prisma: PrismaClient };

// 3. Exportação da constante 'prisma' (única no arquivo)
export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({ adapter });

// 4. Prevenção de múltiplas conexões no ambiente de desenvolvimento
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;