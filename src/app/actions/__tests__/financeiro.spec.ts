import { describe, it, expect, vi, beforeEach } from 'vitest'
import { reabrirComanda } from '../financeiro'
import { prisma } from '@/lib/prisma'
import { verificarSessaoFuncionario } from '@/app/actions/auth'
import type { Agendamento } from '@prisma/client'

// ── Tipagem Estrita para os Mocks ─────────────────────────────────────────────
type AgendamentoEstornoMock = Agendamento & {
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
        pagamentoComanda: {
            deleteMany: vi.fn(),
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
            } as SessaoAdminMock)

            vi.mocked(prisma.agendamento.findUnique).mockResolvedValue({
                id: 'ag-1',
                concluido: true,
                canceladoEm: null,
                valorBruto: 100,
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

        it('deve restaurar estoque dos insumos e produtos ao reabrir', async () => {
            vi.mocked(verificarSessaoFuncionario).mockResolvedValue({
                logado: true,
                id: 'admin-id',
                role: 'ADMIN',
                nome: 'Diretor Teste',
            } as SessaoAdminMock)

            vi.mocked(prisma.agendamento.findUnique).mockResolvedValue({
                id: 'ag-2',
                concluido: true,
                canceladoEm: null,
                valorBruto: 200,
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
            } as SessaoProfissionalMock)

            const resultado = await reabrirComanda('ag-1', 'Tentativa não autorizada')

            expect(resultado.sucesso).toBe(false)
            if (!resultado.sucesso) {
                expect(resultado.erro).toContain('Acesso negado')
            }
        })
    })
})
