import { describe, it, expect, vi, beforeEach } from 'vitest'
import { reabrirComanda, obterResumoFinanceiro } from '../financeiro'
import { prisma } from '@/lib/prisma'
import { verificarSessaoFuncionario } from '@/app/actions/auth'
import { Prisma, StatusAgendamento } from '@prisma/client'
import type { Funcionario } from '@prisma/client'

// ── Tipagem Estrita para os Mocks ─────────────────────────────────────────────
// AgendamentoEstornoMock usa StatusAgendamento em vez dos campos legados concluido/canceladoEm
type AgendamentoEstornoMock = {
    id: string
    status: StatusAgendamento
    valorBruto: Prisma.Decimal
    taxas: Prisma.Decimal
    custoInsumos: Prisma.Decimal
    custoRevenda: Prisma.Decimal
    valorComissao: Prisma.Decimal
    comissaoSnap: Prisma.Decimal
    comissaoLiberada: boolean
    valorPago: Prisma.Decimal
    valorPendente: Prisma.Decimal
    lembreteEnviado: boolean
    clienteId: string
    funcionarioId: string
    dataHoraInicio: Date
    dataHoraFim: Date
    cliente: { nome: string }
    servicos: Array<{
        servico: { insumos: Array<{ produtoId: string; quantidadeUsada: number }> }
    }>
    produtos: Array<{
        produtoId: string
        quantidade: number
        produto: { tamanhoUnidade: number } | null
    }>
}

type SessaoAdminMock = {
    logado: true
    id: string
    role: 'ADMIN'
    nome: string
    podeGerenciarClientes: boolean
    podeVerFinanceiroGlobal: boolean
    podeGerenciarEstoque: boolean
    podeAgendar: boolean
    podeCancelar: boolean
}

type SessaoProfissionalMock = {
    logado: true
    id: string
    role: 'PROFISSIONAL'
    nome: string
    podeGerenciarClientes: boolean
    podeVerFinanceiroGlobal: boolean
    podeGerenciarEstoque: boolean
    podeAgendar: boolean
    podeCancelar: boolean
}

type SessaoRecepcionistaMock = {
    logado: true
    id: string
    role: 'RECEPCIONISTA'
    nome: string
    podeGerenciarClientes: boolean
    podeVerFinanceiroGlobal: boolean
    podeGerenciarEstoque: boolean
    podeAgendar: boolean
    podeCancelar: boolean
}

// ── Mocking dependencies ──────────────────────────────────────────────────────
vi.mock('@/lib/prisma', () => ({
    prisma: {
        agendamento: {
            findUnique: vi.fn(),
            update: vi.fn(),
            aggregate: vi.fn(),
            groupBy: vi.fn(),
            findMany: vi.fn(),
        },
        pagamentoComanda: {
            deleteMany: vi.fn(),
            groupBy: vi.fn(),
        },
        dividaCliente: {
            deleteMany: vi.fn(),
        },
        produto: {
            update: vi.fn(),
        },
        notificacao: {
            create: vi.fn(),
        },
        funcionario: {
            findMany: vi.fn(),
        },
        $transaction: vi.fn((input) => {
            if (typeof input === 'function') return input(prisma)
            return Promise.all(input)
        }),
    },
}))

vi.mock('@/app/actions/auth', () => ({
    verificarSessaoFuncionario: vi.fn(),
}))

describe('Módulo Financeiro — Regras de Negócio', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('reabrirComanda', () => {
        it('deve zerar todos os campos de snapshot ao reabrir uma comanda', async () => {
            vi.mocked(verificarSessaoFuncionario).mockResolvedValue({
                logado: true,
                id: 'admin-id',
                role: 'ADMIN',
                nome: 'Diretor Teste',
                podeGerenciarClientes: true,
                podeVerFinanceiroGlobal: true,
                podeGerenciarEstoque: true,
            } as SessaoAdminMock)

            vi.mocked(prisma.agendamento.findUnique).mockResolvedValue({
                id: 'ag-1',
                status: StatusAgendamento.FINALIZADO,
                valorBruto: new Prisma.Decimal('100.00'),
                taxas: new Prisma.Decimal('0.00'),
                custoInsumos: new Prisma.Decimal('0.00'),
                custoRevenda: new Prisma.Decimal('0.00'),
                valorComissao: new Prisma.Decimal('0.00'),
                comissaoSnap: new Prisma.Decimal('40.00'),
                comissaoLiberada: true,
                valorPago: new Prisma.Decimal('100.00'),
                valorPendente: new Prisma.Decimal('0.00'),
                lembreteEnviado: false,
                clienteId: 'cliente-1',
                funcionarioId: 'func-1',
                dataHoraInicio: new Date(),
                dataHoraFim: new Date(),
                cliente: { nome: 'Maria' },
                servicos: [],
                produtos: [],
            } as unknown as AgendamentoEstornoMock)

            const resultado = await reabrirComanda('ag-1', 'Erro de digitação')

            expect(resultado.sucesso).toBe(true)

            expect(prisma.agendamento.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 'ag-1' },
                    data: expect.objectContaining({
                        status: StatusAgendamento.EM_ATENDIMENTO,
                        taxas: 0,
                        custoInsumos: 0,
                        custoRevenda: 0,
                        valorComissao: 0,
                        comissaoSnap: 0,
                    }),
                })
            )
        })

        it('deve restaurar estoque dos insumos e produtos ao reabrir', async () => {
            vi.mocked(verificarSessaoFuncionario).mockResolvedValue({
                logado: true,
                id: 'admin-id',
                role: 'ADMIN',
                nome: 'Diretor Teste',
                podeGerenciarClientes: true,
                podeVerFinanceiroGlobal: true,
                podeGerenciarEstoque: true,
            } as SessaoAdminMock)

            vi.mocked(prisma.agendamento.findUnique).mockResolvedValue({
                id: 'ag-2',
                status: StatusAgendamento.FINALIZADO,
                valorBruto: new Prisma.Decimal('200.00'),
                taxas: new Prisma.Decimal('0.00'),
                custoInsumos: new Prisma.Decimal('0.00'),
                custoRevenda: new Prisma.Decimal('0.00'),
                valorComissao: new Prisma.Decimal('0.00'),
                comissaoSnap: new Prisma.Decimal('40.00'),
                comissaoLiberada: true,
                valorPago: new Prisma.Decimal('200.00'),
                valorPendente: new Prisma.Decimal('0.00'),
                lembreteEnviado: false,
                clienteId: 'cliente-2',
                funcionarioId: 'func-1',
                dataHoraInicio: new Date(),
                dataHoraFim: new Date(),
                cliente: { nome: 'João' },
                servicos: [
                    { servico: { insumos: [{ produtoId: 'prod-1', quantidadeUsada: 5 }] } },
                ],
                produtos: [
                    { produtoId: 'prod-2', quantidade: 2, produto: { tamanhoUnidade: 100 } },
                ],
            } as unknown as AgendamentoEstornoMock)

            const resultado = await reabrirComanda('ag-2', 'Correção de serviço')

            expect(resultado.sucesso).toBe(true)

            // prod-1: insumo de serviço → devolver 5 unidades
            expect(prisma.produto.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 'prod-1' },
                    data: { estoque: { increment: 5 } },
                })
            )

            // prod-2: produto revendido → devolver 2 * 100 = 200 unidades
            expect(prisma.produto.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 'prod-2' },
                    data: { estoque: { increment: 200 } },
                })
            )
        })

        it('deve bloquear reabertura por usuários não-administradores', async () => {
            vi.mocked(verificarSessaoFuncionario).mockResolvedValue({
                logado: true,
                id: 'prof-1',
                role: 'PROFISSIONAL',
                nome: 'Profissional Teste',
                podeGerenciarClientes: false,
                podeVerFinanceiroGlobal: false,
                podeGerenciarEstoque: false,
            } as SessaoProfissionalMock)

            const resultado = await reabrirComanda('ag-1', 'Tentativa não autorizada')

            expect(resultado.sucesso).toBe(false)
            if (!resultado.sucesso) {
                expect(resultado.erro).toContain('Acesso negado')
            }
        })
    })

    describe('obterResumoFinanceiro', () => {
        it('deve bloquear acesso com erro (403 equivalente) se o profissional logado nao tiver a flag podeVerFinanceiroGlobal', async () => {
            vi.mocked(verificarSessaoFuncionario).mockResolvedValue({
                logado: true,
                id: 'prof-2',
                role: 'RECEPCIONISTA',
                nome: 'Recepção Teste',
                podeGerenciarClientes: false,
                podeVerFinanceiroGlobal: false,
                podeGerenciarEstoque: false,
            } as SessaoRecepcionistaMock)

            const resultado = await obterResumoFinanceiro()

            expect(resultado.sucesso).toBe(false)
            if (!resultado.sucesso) {
                expect(resultado.erro).toContain('Acesso negado. Relatórios restritos à gestão.')
            }
        })

        it('deve permitir acesso se a sessao for valida e tiver a flag podeVerFinanceiroGlobal', async () => {
            vi.mocked(verificarSessaoFuncionario).mockResolvedValue({
                logado: true,
                id: 'admin-1',
                role: 'ADMIN',
                nome: 'Admin Teste',
                podeGerenciarClientes: true,
                podeVerFinanceiroGlobal: true,
                podeGerenciarEstoque: true,
            } as SessaoAdminMock)

            // Aggregate: apenas campos do schema atual (sem valorDinheiro/Cartao/Pix)
            vi.mocked(prisma.agendamento.aggregate).mockResolvedValue({
                _sum: {
                    valorBruto: new Prisma.Decimal('0'),
                    taxas: new Prisma.Decimal('0'),
                    custoInsumos: new Prisma.Decimal('0'),
                    custoRevenda: new Prisma.Decimal('0'),
                    valorComissao: new Prisma.Decimal('0'),
                    valorPago: new Prisma.Decimal('0'),
                    valorPendente: new Prisma.Decimal('0'),
                }
            } as never)

            // GroupBy de comissões por profissional
            vi.mocked(prisma.agendamento.groupBy).mockResolvedValue([] as never[])

            // Histórico de agendamentos
            vi.mocked(prisma.agendamento.findMany).mockResolvedValue([])

            // Equipe de profissionais
            vi.mocked(prisma.funcionario.findMany).mockResolvedValue([] as Funcionario[])

            // Agregação de métodos de pagamento via PagamentoComanda (Single Source of Truth)
            vi.mocked(prisma.pagamentoComanda.groupBy).mockResolvedValue([
                { metodo: 'PIX', _sum: { valor: new Prisma.Decimal('100.00') } },
                { metodo: 'CARTAO_CREDITO', _sum: { valor: new Prisma.Decimal('50.00') } },
            ] as never[])

            const resultado = await obterResumoFinanceiro()
            expect(resultado.sucesso).toBe(true)
        })
    })
})
