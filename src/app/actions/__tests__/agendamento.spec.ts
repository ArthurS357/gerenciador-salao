import { describe, it, expect, vi } from 'vitest';
import { criarAgendamentoMultiplo } from '../agendamento';
import { prisma } from '@/lib/prisma';
import { verificarSessaoCliente, verificarSessaoFuncionario } from '@/app/actions/auth';
// 1. Importar os tipos reais do Prisma
import type { Cliente, Servico, Expediente } from '@prisma/client';

// 2. Simular as dependências de banco de dados
vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn(),
    cliente: { findUnique: vi.fn() },
    servico: { findMany: vi.fn() },
    expediente: { findUnique: vi.fn() },
    agendamento: { findFirst: vi.fn(), create: vi.fn() }
  }
}));

// 3. Simular o módulo de autenticação
vi.mock('@/app/actions/auth', () => ({
  verificarSessaoCliente: vi.fn(),
  verificarSessaoFuncionario: vi.fn()
}));

vi.mock('@/lib/whatsapp', () => ({
  verificarNumeroExisteNoWhatsApp: vi.fn().mockResolvedValue(true),
  enviarMensagemWhatsApp: vi.fn().mockResolvedValue(true)
}));

describe('Orquestração de Agendamentos', () => {
  it('Deve bloquear a criação se houver choque de horários na transação', async () => {
    // 4. Configurar mocks de sessão
    vi.mocked(verificarSessaoCliente).mockResolvedValue({
      logado: true,
      id: 'cliente-id',
      nome: 'Teste'
    });
    vi.mocked(verificarSessaoFuncionario).mockResolvedValue({ logado: false });

    // 5. Configurar os mocks do Prisma usando Tipagem Estrita
    // Usamos "as unknown as Cliente" para evitar ter que preencher todos os 20+ campos do banco no mock,
    // mas o TS aceitará pois estamos referenciando o tipo correto e não "any".
    vi.mocked(prisma.cliente.findUnique).mockResolvedValue({
      nome: 'Teste',
      telefone: '11999999999'
    } as unknown as Cliente);

    vi.mocked(prisma.servico.findMany).mockResolvedValue([
      { id: 'serv1', preco: 50, tempoMinutos: 30 }
    ] as unknown as Servico[]);

    vi.mocked(prisma.expediente.findUnique).mockResolvedValue({
      ativo: true,
      horaInicio: '08:00',
      horaFim: '18:00'
    } as unknown as Expediente);

    // 6. Simular o retorno da transação
    // Note que tipamos o retorno da transação para bater com o esperado pela Action
    vi.mocked(prisma.$transaction).mockResolvedValue({
      sucesso: false,
      erro: 'Choque de horários. O profissional já tem marcações neste intervalo de tempo.'
    });

    const dataFutura = new Date();
    dataFutura.setDate(dataFutura.getDate() + 1);
    dataFutura.setHours(12, 0, 0, 0);

    // 7. Executar a função
    const resultado = await criarAgendamentoMultiplo(
      'cliente-id',
      'func-id',
      dataFutura,
      ['serv1']
    );

    // 8. Validar a asserção
    expect(resultado.sucesso).toBe(false);
    if (!resultado.sucesso) {
      expect(resultado.erro).toContain('Choque de horários');
    }
  });
});