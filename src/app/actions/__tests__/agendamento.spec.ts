import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { criarAgendamentoMultiplo } from '../agendamento';
import { prisma } from '@/lib/prisma';
import { verificarSessaoCliente, verificarSessaoFuncionario } from '@/app/actions/auth';
import type { Prisma, Cliente, Servico, Expediente, Agendamento, RateLimit } from '@prisma/client';

// Tipagem auxiliar para mocks complexos do Prisma
type FuncionarioWithServicos = Prisma.FuncionarioGetPayload<{
  include: { servicos: true }
}>;

// ── Tipagem do Mock ──────────────────────────────────────────────────────────
interface MockModel {
  findUnique: ReturnType<typeof vi.fn>;
  findFirst: ReturnType<typeof vi.fn>;
  findMany: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
}

interface MockPrisma {
  $transaction: ReturnType<typeof vi.fn>;
  cliente: MockModel;
  funcionario: MockModel;
  servico: MockModel;
  expediente: MockModel;
  agendamento: MockModel;
  rateLimit: MockModel;
  [key: string]: unknown;
}

// ── Simulação do Prisma (Type-Safe) ──────────────────────────────────────────
vi.mock('@/lib/prisma', () => {
  const createMockModel = (): MockModel => ({
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  });

  const mockPrisma: MockPrisma = {
    $transaction: vi.fn(),
    cliente: createMockModel(),
    funcionario: createMockModel(),
    servico: createMockModel(),
    expediente: createMockModel(),
    agendamento: createMockModel(),
    rateLimit: createMockModel(),
  };

  mockPrisma.$transaction.mockImplementation(
    (cb: unknown) =>
      typeof cb === 'function' ? cb(mockPrisma) : Promise.all(cb as Promise<unknown>[])
  );

  return { prisma: mockPrisma };
});

vi.mock('@/app/actions/auth', () => ({
  verificarSessaoCliente: vi.fn(),
  verificarSessaoFuncionario: vi.fn(),
}));

vi.mock('@/lib/whatsapp', () => ({
  verificarNumeroExisteNoWhatsApp: vi.fn().mockResolvedValue(true),
  enviarMensagemWhatsApp: vi.fn().mockResolvedValue(true),
}));

describe('Orquestração de Agendamentos', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-29T10:00:00Z'));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('Deve bloquear a criação se houver choque de horários na transação', async () => {
    // 1. Setup de Sessão
    vi.mocked(verificarSessaoCliente).mockResolvedValue({
      logado: true,
      id: 'cliente-id',
      nome: 'Teste',
    });
    vi.mocked(verificarSessaoFuncionario).mockResolvedValue({ logado: false });

    // 2. Rate Limit
    const mockRateLimit: RateLimit = {
      identificador: 'cliente-id',
      count: 0,
      windowStart: new Date(),
      blockedUntil: null,
    };
    vi.mocked(prisma.rateLimit.upsert).mockResolvedValue(mockRateLimit);
    vi.mocked(prisma.rateLimit.update).mockResolvedValue({ ...mockRateLimit, count: 1 });

    // 3. Profissional com Relacionamentos
    vi.mocked(prisma.funcionario.findUnique).mockResolvedValue({
      id: 'func-id',
      nome: 'Profissional Teste',
      servicos: [{ id: 'serv1' }],
    } as FuncionarioWithServicos);

    // 4. Mocks de Entidade (unknown bridge em vez de any)
    vi.mocked(prisma.cliente.findUnique).mockResolvedValue({
      id: 'cliente-id',
      nome: 'Teste',
      telefone: '11999999999',
    } as unknown as Cliente);

    vi.mocked(prisma.servico.findMany).mockResolvedValue([
      { id: 'serv1', nome: 'Corte', preco: 50, tempoMinutos: 30 },
    ] as unknown as Servico[]);

    vi.mocked(prisma.expediente.findUnique).mockResolvedValue({
      ativo: true,
      horaInicio: '08:00',
      horaFim: '18:00',
    } as unknown as Expediente);

    // 5. Simulação do Conflito
    vi.mocked(prisma.agendamento.findFirst).mockResolvedValue({
      id: 'conflito-existente',
    } as unknown as Agendamento);

    const dataAgendamento = new Date();
    dataAgendamento.setDate(dataAgendamento.getDate() + 1);
    dataAgendamento.setHours(12, 0, 0, 0);

    // 6. Execução
    const resultado = await criarAgendamentoMultiplo(
      'cliente-id',
      'func-id',
      dataAgendamento,
      ['serv1']
    );

    // 7. Asserções
    // 7. Asserções
    expect(resultado.sucesso).toBe(false);
    expect('erro' in resultado && resultado.erro).toMatch(/choque de horários/i);
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});