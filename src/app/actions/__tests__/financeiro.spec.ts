import { describe, it, expect, vi, beforeEach } from 'vitest'
import { calcularFechamentoComanda, reabrirComanda } from '../financeiro'
import { prisma } from '@/lib/prisma'
import { verificarSessaoFuncionario } from '@/app/actions/auth'
import type { Agendamento } from '@prisma/client'

// ── Tipagem Estrita para os Mocks (Evita o erro "Unexpected any") ────────────
type AgendamentoComissoesMock = Agendamento & {
    funcionario: { comissao: number }
    produtos: Array<{
        quantidade: number
        precoCobrado: number
        produto: { precoCusto: number | null } | null
    }>
}

type AgendamentoClienteMock = Agendamento & {
    cliente: { nome: string }
}

type SessaoAdminMock = {
    logado: true
    id: string
    role: 'ADMIN'
    nome: string
}

type SessaoProfissionalMock = {
    logado: true
    id: string
    role: 'PROFISSIONAL'
    nome: string
}

// ── Mocking dependencies ──────────────────────────────────────────────────────
vi.mock('@/lib/prisma', () => ({
    prisma: {
        agendamento: {
            findUnique: vi.fn(),
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

    describe('calcularFechamentoComanda', () => {
        it('deve garantir que a comissão nunca seja negativa mesmo com prejuízo no salão', async () => {
            // Setup session: Logged as admin
            vi.mocked(verificarSessaoFuncionario).mockResolvedValue({
                logado: true,
                id: 'admin-id',
                role: 'ADMIN',
                nome: 'Diretor Teste',
            } as SessaoAdminMock)

            // Mock agendamento: R$ 100 bruto, 40% comissão, mas R$ 120 de custos totais
            // (Taxa 3% + Insumos fixed + Revenda 0)
            vi.mocked(prisma.agendamento.findUnique).mockResolvedValue({
                id: 'ag-1',
                valorBruto: 100,
                concluido: false,
                funcionario: { comissao: 40 },
                produtos: [], // Sem produtos de revenda para simplificar
            } as unknown as AgendamentoComissoesMock)

            // Executar fechamento com R$ 117 de insumos (Total deduções = 3% de 100 + 117 = 120)
            const resultado = await calcularFechamentoComanda('ag-1', 3, 117)

            expect(resultado.sucesso).toBe(true)
            if (resultado.sucesso) {
                // Base de cálculo = 100 - 120 = -20.
                // Comissão = Math.max(0, -20) * 0.4 = 0
                expect(resultado.financeiro.comissao).toBe(0)
                // Lucro Salão = 100 - 120 - 0 = -20 (Prejuízo real visível)
                expect(resultado.financeiro.lucroSalao).toBe(-20)
                expect(resultado.financeiro.baseReal).toBe(-20)
            }

            // Verifica se o update no banco usou os valores corretos
            expect(prisma.agendamento.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        valorComissao: 0,
                        concluido: true,
                    }),
                })
            )
        })

        it('deve calcular corretamente em cenário de lucro padrão', async () => {
            vi.mocked(verificarSessaoFuncionario).mockResolvedValue({
                logado: true,
                id: 'admin-id',
                role: 'ADMIN',
                nome: 'Diretor Teste',
            } as SessaoAdminMock)

            // R$ 200 bruto, 50% comissão, R$ 20 custos (Taxa 3% de 200 = 6 + 14 insumos)
            vi.mocked(prisma.agendamento.findUnique).mockResolvedValue({
                id: 'ag-2',
                valorBruto: 200,
                concluido: false,
                funcionario: { comissao: 50 },
                produtos: [],
            } as unknown as AgendamentoComissoesMock)

            const resultado = await calcularFechamentoComanda('ag-2', 3, 14)

            expect(resultado.sucesso).toBe(true)
            if (resultado.sucesso) {
                // Deduções = 6 (taxa) + 14 (insumos) = 20
                // Base Líquida = 200 - 20 = 180
                // Comissão = 180 * 0.5 = 90
                // Lucro Salão = 200 - 20 - 90 = 90
                expect(resultado.financeiro.comissao).toBe(90)
                expect(resultado.financeiro.lucroSalao).toBe(90)
            }
        })
    })

    describe('reabrirComanda', () => {
        it('deve zerar todos os campos de snapshot ao reabrir uma comanda', async () => {
            vi.mocked(verificarSessaoFuncionario).mockResolvedValue({
                logado: true,
                id: 'admin-id',
                role: 'ADMIN',
                nome: 'Diretor Teste',
            } as SessaoAdminMock)

            vi.mocked(prisma.agendamento.findUnique).mockResolvedValue({
                id: 'ag-1',
                concluido: true,
                canceladoEm: null,
                valorBruto: 100,
                cliente: { nome: 'Maria' },
            } as unknown as AgendamentoClienteMock)

            const resultado = await reabrirComanda('ag-1', 'Erro de digitação')

            expect(resultado.sucesso).toBe(true)

            // Verifica se o update zerou os campos críticos para não corromper relatórios
            expect(prisma.agendamento.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 'ag-1' },
                    data: expect.objectContaining({
                        concluido: false,
                        taxas: 0,
                        custoInsumos: 0,
                        custoRevenda: 0,
                        valorComissao: 0,
                        comissaoSnap: 0,
                    }),
                })
            )
        })

        it('deve bloquear reabertura por usuários não-administradores', async () => {
            vi.mocked(verificarSessaoFuncionario).mockResolvedValue({
                logado: true,
                id: 'prof-1',
                role: 'PROFISSIONAL',
                nome: 'Profissional Teste',
            } as SessaoProfissionalMock)

            const resultado = await reabrirComanda('ag-1', 'Tentativa não autorizada')

            expect(resultado.sucesso).toBe(false)
            if (!resultado.sucesso) {
                expect(resultado.erro).toContain('Acesso negado')
            }
        })
    })
})