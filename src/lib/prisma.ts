import { PrismaClient } from '@prisma/client';
import { createClient } from '@libsql/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';

// 1. Criamos a conexão com o banco local usando o @libsql/client
const libsql = createClient({
    url: process.env.DATABASE_URL || 'file:./dev.db',
});

// 2. Acoplamos a conexão ao Adaptador Oficial do Prisma
const adapter = new PrismaLibSQL(libsql);

// 3. Declaramos um tipo global para evitar que o TypeScript reclame no Next.js
const globalForPrisma = global as unknown as { prisma: PrismaClient };

// 4. Instanciamos o PrismaClient, obrigatoriamente passando o adapter no Prisma 7+
export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({ adapter });

// 5. Garantimos que a conexão seja reaproveitada durante o Hot Reload
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;