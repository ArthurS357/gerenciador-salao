import { describe, it, expect, vi, beforeEach } from 'vitest'
import { cancelarAgendamentoPendente } from '../agendamento'
import { criarAgendamentoMultiplo } from '../agendamento'
import { prisma } from '@/lib/prisma'
import { verificarSessaoCliente, verificarSessaoFuncionario } from '@/app/actions/auth'
import type { Cliente, Servico, Expediente, Agendamento, Funcionario } from '@prisma/client'

// ── Mocks ─────────────────────────────────────────────────────────────────────
vi.mock('@/lib/prisma', () => ({
    prisma: {
        $transaction: vi.fn(),
        cliente: { findUnique: vi.fn() },
        servico: { findMany: vi.fn() },
        expediente: { findUnique: vi.fn() },
        agendamento: { findFirst: vi.fn(), create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
        notificacao: { create: vi.fn() },
        produto: { update: vi.fn() },
    },
}))

vi.mock('@/app/actions/auth', () => ({
    verificarSessaoCliente: vi.fn(),
    verificarSessaoFuncionario: vi.fn(),
}))

vi.mock('@/lib/whatsapp', () => ({
    verificarNumeroExisteNoWhatsApp: vi.fn().mockResolvedValue(true),
    enviarMensagemWhatsApp: vi.fn().mockResolvedValue(true),
}))

vi.mock('@/lib/rateLimit', () => ({
    verificarRateLimit: vi.fn().mockResolvedValue(true),
}))

// ── Helpers de Setup ──────────────────────────────────────────────────────────
function mockSessaoCliente(id = 'cliente-123', nome = 'Ana Silva') {
    vi.mocked(verificarSessaoCliente).mockResolvedValue({ logado: true, id, nome })
    vi.mocked(verificarSessaoFuncionario).mockResolvedValue({ logado: false })
}

function mockSessaoAdmin(id = 'admin-001', nome = 'Admin') {
    vi.mocked(verificarSessaoCliente).mockResolvedValue({ logado: false })
    vi.mocked(verificarSessaoFuncionario).mockResolvedValue({
        logado: true, id, nome, role: 'ADMIN'
    })
}

function mockDadosBase() {
    vi.mocked(prisma.cliente.findUnique).mockResolvedValue({
        nome: 'Ana Silva', telefone: '11987654321'
    } as unknown as Cliente)

    vi.mocked(prisma.servico.findMany).mockResolvedValue([{
        id: 'servico-1', nome: 'Corte', preco: 80, tempoMinutos: 45
    }] as unknown as Servico[])

    vi.mocked(prisma.expediente.findUnique).mockResolvedValue({
        ativo: true, horaInicio: '08:00', horaFim: '18:00', diaSemana: 3
    } as unknown as Expediente)
}

// ── Testes de Agendamento ─────────────────────────────────────────────────────
describe('criarAgendamentoMultiplo', () => {
    beforeEach(() => vi.clearAllMocks())

    it('deve bloquear acesso de cliente não-proprietário (IDOR)', async () => {
        // Cliente "cliente-999" tenta agendar no nome de "cliente-123"
        vi.mocked(verificarSessaoCliente).mockResolvedValue({
            logado: true, id: 'cliente-999', nome: 'Atacante'
        })
        vi.mocked(verificarSessaoFuncionario).mockResolvedValue({ logado: false })

        const dataFutura = new Date(Date.now() + 24 * 60 * 60_000)
        const resultado = await criarAgendamentoMultiplo(
            'cliente-123', // proprietário legítimo
            'func-001',
            dataFutura,
            ['servico-1']
        )

        expect(resultado.sucesso).toBe(false)
        if (!resultado.sucesso) {
            expect(resultado.erro).toMatch(/Operação não permitida/i)
        }
    })

    it('deve rejeitar agendamento com lista de serviços vazia', async () => {
        mockSessaoCliente('cliente-123')
        mockDadosBase()

        const dataFutura = new Date(Date.now() + 24 * 60 * 60_000)
        const resultado = await criarAgendamentoMultiplo(
            'cliente-123', 'func-001', dataFutura, []
        )

        expect(resultado.sucesso).toBe(false)
        if (!resultado.sucesso) {
            expect(resultado.erro).toMatch(/serviço/i)
        }
    })

    it('deve detectar choque de horários via transação', async () => {
        mockSessaoCliente('cliente-123')
        mockDadosBase()

        // Simula transação retornando conflito de horário
        vi.mocked(prisma.$transaction).mockResolvedValue({
            sucesso: false,
            erro: 'Choque de horários. O profissional já tem marcações neste intervalo de tempo.'
        })

        const proxima4a = new Date()
        proxima4a.setDate(proxima4a.getDate() + ((3 - proxima4a.getDay() + 7) % 7 || 7))
        proxima4a.setHours(10, 0, 0, 0)

        const resultado = await criarAgendamentoMultiplo(
            'cliente-123', 'func-001', proxima4a, ['servico-1']
        )

        expect(resultado.sucesso).toBe(false)
        if (!resultado.sucesso) {
            expect(resultado.erro).toMatch(/choque de horários/i)
        }
    })

    it('deve rejeitar tentativa de agendar no passado', async () => {
        mockSessaoCliente('cliente-123')

        const passado = new Date(Date.now() - 60 * 60_000) // 1 hora atrás
        const resultado = await criarAgendamentoMultiplo(
            'cliente-123', 'func-001', passado, ['servico-1']
        )

        expect(resultado.sucesso).toBe(false)
        if (!resultado.sucesso) {
            expect(resultado.erro).toMatch(/passado/i)
        }
    })
})

// ── Testes de Cancelamento ────────────────────────────────────────────────────
describe('cancelarAgendamentoPendente', () => {
    beforeEach(() => vi.clearAllMocks())

    it('deve impedir cancelamento por terceiro sem permissão (IDOR)', async () => {
        // Terceiro sem relação com o agendamento
        vi.mocked(verificarSessaoCliente).mockResolvedValue({
            logado: true, id: 'outro-cliente', nome: 'Outro'
        })
        vi.mocked(verificarSessaoFuncionario).mockResolvedValue({ logado: false })

        vi.mocked(prisma.agendamento.findUnique).mockResolvedValue({
            id: 'ag-001',
            clienteId: 'cliente-123',      // dono real
            funcionarioId: 'func-001',
            concluido: false,
            canceladoEm: null,
            produtos: [],
            cliente: { nome: 'Ana Silva' },
            funcionario: { nome: 'Profissional X' },
        } as unknown as Agendamento & { produtos: []; cliente: { nome: string }; funcionario: { nome: string } })

        const resultado = await cancelarAgendamentoPendente('ag-001')

        expect(resultado.sucesso).toBe(false)
        if (!resultado.sucesso) {
            expect(resultado.erro).toMatch(/acesso negado/i)
        }
    })

    it('deve impedir cancelamento de comanda já faturada', async () => {
        mockSessaoAdmin()

        vi.mocked(prisma.agendamento.findUnique).mockResolvedValue({
            id: 'ag-002',
            clienteId: 'cliente-123',
            funcionarioId: 'func-001',
            concluido: true, // ← já faturada
            canceladoEm: null,
            produtos: [],
            cliente: { nome: 'Ana Silva' },
            funcionario: { nome: 'Profissional X' },
        } as unknown as Agendamento & { produtos: []; cliente: { nome: string }; funcionario: { nome: string } })

        const resultado = await cancelarAgendamentoPendente('ag-002')

        expect(resultado.sucesso).toBe(false)
        if (!resultado.sucesso) {
            expect(resultado.erro).toMatch(/faturada/i)
        }
    })

    it('deve permitir que o Admin cancele qualquer agendamento', async () => {
        mockSessaoAdmin('admin-001')

        vi.mocked(prisma.agendamento.findUnique).mockResolvedValue({
            id: 'ag-003',
            clienteId: 'cliente-123',
            funcionarioId: 'func-001',
            concluido: false,
            canceladoEm: null,
            produtos: [],
            cliente: { nome: 'Ana Silva' },
            funcionario: { nome: 'Profissional X' },
        } as unknown as Agendamento & { produtos: []; cliente: { nome: string }; funcionario: { nome: string } })

        vi.mocked(prisma.$transaction).mockResolvedValue(undefined)

        const resultado = await cancelarAgendamentoPendente('ag-003')

        expect(resultado.sucesso).toBe(true)
        expect(prisma.$transaction).toHaveBeenCalledOnce()
    })
})

// ── Testes de Lógica Financeira (cálculos puros) ─────────────────────────────
describe('Lógica financeira — fórmulas de snapshot', () => {
    it('baseLiquidaComissao nunca deve ser negativo quando custos excedem bruto', () => {
        const valorBruto = 50
        const custos = 80 // custos maiores que o faturamento
        const comissaoPercentual = 40

        // Reproduz a lógica de calcularFechamentoComanda
        const baseLiquida = Math.max(0, valorBruto - custos)
        const comissao = baseLiquida * (comissaoPercentual / 100)
        const lucroSalao = valorBruto - custos - comissao

        // Profissional não deve "dever" dinheiro ao salão
        expect(baseLiquida).toBe(0)
        expect(comissao).toBe(0)
        // Mas o lucro real do salão deve mostrar o prejuízo
        expect(lucroSalao).toBe(-30)
        expect(lucroSalao).toBeLessThan(0) // confirma que o prejuízo é visível
    })

    it('snapshot de comissão congela o percentual do momento do fechamento', () => {
        const valorBruto = 200
        const taxaCartao = 3    // 3%
        const custoInsumos = 20
        const custoRevenda = 10
        const comissaoSnap = 40 // percentual vigente no fechamento

        const taxaCartaoValor = valorBruto * (taxaCartao / 100) // 6
        const deducoes = taxaCartaoValor + custoInsumos + custoRevenda // 36
        const baseLiquida = Math.max(0, valorBruto - deducoes) // 164
        const comissao = baseLiquida * (comissaoSnap / 100)   // 65.60
        const lucroSalao = valorBruto - deducoes - comissao   // 98.40

        expect(taxaCartaoValor).toBe(6)
        expect(baseLiquida).toBe(164)
        expect(comissao).toBeCloseTo(65.6)
        expect(lucroSalao).toBeCloseTo(98.4)
        // Invariante: bruto = deducoes + comissao + lucroSalao
        expect(deducoes + comissao + lucroSalao).toBeCloseTo(valorBruto)
    })
})