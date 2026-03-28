import { describe, it, expect, vi } from 'vitest';
import { criarAgendamentoMultiplo } from '../agendamento';
import { prisma } from '@/lib/prisma';

// 1. Simular as dependências externas
vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn(),
    cliente: { findUnique: vi.fn() },
    servico: { findMany: vi.fn() },
    expediente: { findUnique: vi.fn() }
  }
}));

vi.mock('@/lib/whatsapp', () => ({
  verificarNumeroExisteNoWhatsApp: vi.fn().mockResolvedValue(true),
  enviarMensagemWhatsApp: vi.fn().mockResolvedValue(true)
}));

describe('Orquestração de Agendamentos', () => {
  it('Deve bloquear a criação se houver choque de horários na transação', async () => {
    // 2. Configurar os mocks para simular um cliente e serviços válidos
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.cliente.findUnique).mockResolvedValue({ nome: 'Teste', telefone: '123' } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.servico.findMany).mockResolvedValue([{ id: 'serv1', preco: 50, tempoMinutos: 30 }] as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.expediente.findUnique).mockResolvedValue({ ativo: true, horaInicio: '08:00', horaFim: '18:00' } as any);
    
    // 3. Simular a transação do Prisma rejeitando por conflito
    vi.mocked(prisma.$transaction).mockResolvedValue({
      sucesso: false,
      erro: 'Choque de horários. O profissional já tem marcações neste intervalo de tempo.' // Simulated transation Error Object return
    });

    const dataFutura = new Date();
    dataFutura.setDate(dataFutura.getDate() + 1);
    dataFutura.setHours(12, 0, 0, 0); // Define meio-dia preventivamente para passar no validador de Expediente

    // 4. Executar a função
    const resultado = await criarAgendamentoMultiplo(
      'cliente-id',
      'func-id',
      dataFutura,
      ['serv1']
    );

    // 5. Validar a asserção
    expect(resultado.sucesso).toBe(false);
    if (!resultado.sucesso) {
      expect(resultado.erro).toContain('Choque de horários');
    }
  });
});
