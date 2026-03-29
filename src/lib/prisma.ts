import { PrismaClient, Prisma } from '@prisma/client';

// ── 1. Extensão de Tipo Global ───────────────────────────────────────────────
declare global {
    var prisma: PrismaClient | undefined;
}

// ── 2. Configuração de Telemetria ───────────────────────────────────────────
// Tipamos explicitamente como Prisma.PrismaClientOptions para satisfazer o construtor.
// Removemos o 'as const' dos arrays internos, pois o tipo LogLevel já é restrito.
const prismaOptions: Prisma.PrismaClientOptions =
    process.env.NODE_ENV === 'development'
        ? { log: ['query', 'error', 'warn'] }
        : { log: ['error'] };

// ── 3. Inicialização do Singleton ────────────────────────────────────────────
// O cast 'as any' ou 'as Prisma.PrismaClientOptions' não é mais necessário aqui
export const prisma = global.prisma || new PrismaClient(prismaOptions);

if (process.env.NODE_ENV !== 'production') {
    global.prisma = prisma;
}