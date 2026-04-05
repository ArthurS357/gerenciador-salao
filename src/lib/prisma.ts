import { PrismaClient, Prisma } from '@prisma/client';

// ── Extensão de Tipo Global ──────────────────────────────────────────────────
declare global {
    var prisma: PrismaClient | undefined;
}

// ── Factory ──────────────────────────────────────────────────────────────────
function createPrismaClient(): PrismaClient {
    const logOptions: Prisma.PrismaClientOptions =
        process.env.NODE_ENV === 'production'
            ? { log: ['error'] }
            : { log: ['query', 'error', 'warn'] };

    return new PrismaClient(logOptions);
}

// ── Singleton — evita re-instanciação no Hot Reload do Next.js ────────────────
// Em produção cada Serverless Function tem seu próprio processo,
// então o singleton é irrelevante lá — mas não prejudica.
export const prisma: PrismaClient = globalThis.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
    globalThis.prisma = prisma;
}
