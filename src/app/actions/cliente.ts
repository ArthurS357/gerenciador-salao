'use server'

import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verificarSessaoCliente, verificarSessaoFuncionario } from '@/app/actions/auth'
import { ActionResult } from '@/types/domain'
import { schemaCliente } from '@/lib/schemas'
import { revalidatePath } from 'next/cache'

// ── TIPAGENS ─────────────────────────────────────────────────────────────────

export type HistoricoAgendamentoItem = {
    id: string
    dataHoraInicio: Date
    valorBruto: number
    concluido: boolean
    funcionario: { nome: string }
    servicos: { servico: { nome: string } }[]
    produtos: { produto: { nome: string } }[]
    avaliacao?: { id: string; nota: number } | null
}

export type HistoricoClienteData = {
    cliente: { nome: string; telefone: string; email: string | null; cpf: string | null; anonimizado: boolean }
    totalGasto: number
    agendamentos: HistoricoAgendamentoItem[]
}

export type ClienteResumo = {
    id: string
    nome: string
    telefone: string
    email: string | null
    cpf: string | null
    anonimizado: boolean
    temDividaPendente: boolean
    _count: { agendamentos: number }
}

export type ClienteDados = {
    id: string
    nome: string
    telefone: string
    email: string | null
    cpf: string | null
    anonimizado: boolean
}

type DadosCliente = {
    nome: string
    telefone: string
    email?: string | null
    cpf?: string | null
    dataNascimento?: Date | string | null
}

// Interface exigida pela nova UI de listagem do painel Administrativo
export interface ClienteAdminView {
    id: string
    nome: string
    telefone: string
    email: string | null
    createdAt: Date
    temDividaPendente: boolean
}

// ── AUXILIARES DE SEGURANÇA (Guards Funcionais com RBAC) ─────────────────────

async function checarPermissaoAdmin(): Promise<string | null> {
    const sessao = await verificarSessaoFuncionario()
    if (!sessao.logado || sessao.role !== 'ADMIN') {
        return 'Acesso negado. Requer privilégios de administrador.'
    }
    return null
}

async function checarPermissaoGestao(): Promise<string | null> {
    const sessao = await verificarSessaoFuncionario()
    if (!sessao.logado || (sessao.role !== 'ADMIN' && sessao.role !== 'RECEPCIONISTA')) {
        return 'Acesso negado. Requer privilégios de gestão.'
    }
    return null
}

async function checarPermissaoDonoOuAdmin(clienteIdAlvo: string): Promise<string | null> {
    const sessaoCli = await verificarSessaoCliente()
    const sessaoFunc = await verificarSessaoFuncionario()

    const isDono = sessaoCli.logado && sessaoCli.id === clienteIdAlvo
    const isAdmin = sessaoFunc.logado && sessaoFunc.role === 'ADMIN'

    // Recepcionista NÃO pode excluir contas. Apenas ADMIN ou o próprio cliente.
    if (!isDono && !isAdmin) {
        return 'Acesso negado. Você só pode excluir os seus próprios dados.'
    }
    return null
}

async function checarPermissaoDonoOuGestao(clienteIdAlvo: string): Promise<string | null> {
    const sessaoCli = await verificarSessaoCliente()
    const sessaoFunc = await verificarSessaoFuncionario()

    const isDono = sessaoCli.logado && sessaoCli.id === clienteIdAlvo
    const isGestao = sessaoFunc.logado && (sessaoFunc.role === 'ADMIN' || sessaoFunc.role === 'RECEPCIONISTA')

    if (!isDono && !isGestao) {
        return 'Acesso negado. Você só pode visualizar ou alterar os seus próprios dados.'
    }
    return null
}

// ── CRIAR CLIENTE (Admin e Recepcionista) ────────────────────────────────────

export async function criarCliente(dados: DadosCliente): Promise<ActionResult<{ cliente: ClienteDados }>> {
    const erroAuth = await checarPermissaoGestao()
    if (erroAuth) return { sucesso: false, erro: erroAuth }

    const telefoneLimpo = dados.telefone.replace(/\D/g, '')

    const validacao = schemaCliente.safeParse({ ...dados, telefone: telefoneLimpo })
    if (!validacao.success) {
        return { sucesso: false, erro: validacao.error.issues[0]?.message ?? 'Dados do cliente inválidos.' }
    }

    try {
        const existente = await prisma.cliente.findUnique({ where: { telefone: telefoneLimpo } })
        if (existente) return { sucesso: false, erro: 'Já existe um cliente com este telefone.' }

        if (dados.cpf) {
            const cpfLimpo = dados.cpf.replace(/\D/g, '')
            if (cpfLimpo.length !== 11) return { sucesso: false, erro: 'CPF inválido. Informe os 11 dígitos.' }

            const cpfExistente = await prisma.cliente.findUnique({ where: { cpf: cpfLimpo } })
            if (cpfExistente) return { sucesso: false, erro: 'Já existe um cliente com este CPF.' }
        }

        const cliente = await prisma.cliente.create({
            data: {
                nome: dados.nome.trim(),
                telefone: telefoneLimpo,
                email: dados.email?.trim() || null,
                cpf: dados.cpf ? dados.cpf.replace(/\D/g, '') : null,
                dataNascimento: validacao.data.dataNascimento ?? null,
            },
            select: { id: true, nome: true, telefone: true, email: true, cpf: true, anonimizado: true }
        })
        revalidatePath('/admin/clientes')

        return { sucesso: true, data: { cliente } }
    } catch (error) {
        console.error('[Cliente] Erro ao criar cliente:', error)
        return { sucesso: false, erro: 'Falha técnica ao criar o cliente.' }
    }
}

// ── EDITAR CLIENTE (Híbrido - Dono, Admin ou Recepcionista) ──────────────────

export async function editarCliente(id: string, dados: DadosCliente): Promise<ActionResult> {
    const erroAuth = await checarPermissaoDonoOuGestao(id)
    if (erroAuth) return { sucesso: false, erro: erroAuth }

    const telefoneLimpo = dados.telefone.replace(/\D/g, '')

    const validacao = schemaCliente.safeParse({ ...dados, telefone: telefoneLimpo })
    if (!validacao.success) {
        return { sucesso: false, erro: validacao.error.issues[0]?.message ?? 'Dados de edição inválidos.' }
    }

    try {
        const telefoneExistente = await prisma.cliente.findFirst({
            where: { telefone: telefoneLimpo, NOT: { id } }
        })
        if (telefoneExistente) return { sucesso: false, erro: 'Este telefone já está cadastrado noutra conta.' }

        if (dados.cpf) {
            const cpfLimpo = dados.cpf.replace(/\D/g, '')
            const cpfExistente = await prisma.cliente.findFirst({
                where: { cpf: cpfLimpo, NOT: { id } }
            })
            if (cpfExistente) return { sucesso: false, erro: 'Este CPF já está cadastrado noutra conta.' }
        }

        await prisma.cliente.update({
            where: { id },
            data: {
                nome: dados.nome.trim(),
                telefone: telefoneLimpo,
                email: dados.email?.trim() || null,
                cpf: dados.cpf ? dados.cpf.replace(/\D/g, '') : null,
                dataNascimento: validacao.data.dataNascimento ?? null,
            }
        })
        revalidatePath('/admin/clientes')

        return { sucesso: true }
    } catch (error) {
        console.error(`[Cliente] Erro ao editar cliente ${id}:`, error)
        return { sucesso: false, erro: 'Falha técnica ao atualizar o perfil.' }
    }
}

// ── EXCLUSÃO / LGPD (Dono ou Admin apenas) ───────────────────────────────────

export async function excluirContaCliente(clienteId: string): Promise<ActionResult> {
    const erroAuth = await checarPermissaoDonoOuAdmin(clienteId)
    if (erroAuth) return { sucesso: false, erro: erroAuth }

    try {
        const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } })
        if (!cliente) return { sucesso: false, erro: 'Cliente não encontrado.' }

        await prisma.cliente.update({
            where: { id: clienteId },
            data: {
                nome: 'Cliente Excluído',
                telefone: `EXCLUIDO-${clienteId.substring(0, 8)}`,
                email: null,
                cpf: null,
                anonimizado: true,
                senhaHash: null,
            }
        })

        const sessaoCli = await verificarSessaoCliente()
        if (sessaoCli.logado && sessaoCli.id === clienteId) {
            const cookieStore = await cookies()
            cookieStore.delete('cliente_session')
        }

        revalidatePath('/admin/clientes')
        return { sucesso: true }
    } catch (error) {
        console.error(`[Cliente] Erro ao anonimizar cliente ${clienteId}:`, error)
        return { sucesso: false, erro: 'Falha técnica ao excluir os dados.' }
    }
}

// ── LISTAGEM GLOBAL (Admin e Recepcionista com Paginação Opcional) ───────────

export async function listarTodosClientes(
    pagina: number = 1,
    limite: number = 50
): Promise<ActionResult<{ clientes: ClienteResumo[]; total: number }>> {
    const erroAuth = await checarPermissaoGestao()
    if (erroAuth) return { sucesso: false, erro: erroAuth }

    const skip = (pagina - 1) * limite

    try {
        const [clientesRaw, total] = await Promise.all([
            prisma.cliente.findMany({
                orderBy: { nome: 'asc' },
                skip,
                take: limite,
                select: {
                    id: true, nome: true, telefone: true, email: true, cpf: true, anonimizado: true,
                    _count: { select: { agendamentos: true } },
                    dividas: {
                        where: { status: { in: ['PENDENTE', 'PARCIAL'] } },
                        select: { id: true },
                        take: 1,
                    }
                }
            }),
            prisma.cliente.count()
        ])

        // Mapeia o campo de dívidas para um boolean limpo e remove o array bruto
        const clientes: ClienteResumo[] = clientesRaw.map(({ dividas, ...c }) => ({
            ...c,
            temDividaPendente: dividas.length > 0,
        }))

        return { sucesso: true, data: { clientes, total } }
    } catch (error) {
        console.error('[Cliente] Erro ao listar todos os clientes:', error)
        return { sucesso: false, erro: 'Falha ao listar clientes.' }
    }
}

// ── LISTAGEM PARA A NOVA UI DE CLIENTES (Admin e Recepcionista) ──────────────

export async function listarClientesAdmin(): Promise<ActionResult<{ clientes: ClienteAdminView[] }>> {
    const erroAuth = await checarPermissaoGestao()
    if (erroAuth) return { sucesso: false, erro: erroAuth }

    try {
        const clientes = await prisma.cliente.findMany({
            select: {
                id: true,
                nome: true,
                telefone: true,
                email: true,
                createdAt: true,
                dividas: {
                    where: { status: { in: ['PENDENTE', 'PARCIAL'] } },
                    select: { id: true },
                    take: 1
                }
            },
            orderBy: { nome: 'asc' }
        })

        const formatados: ClienteAdminView[] = clientes.map(c => ({
            id: c.id,
            nome: c.nome,
            telefone: c.telefone,
            email: c.email,
            createdAt: c.createdAt,
            temDividaPendente: c.dividas.length > 0 // Flag booleana reativa baseada no array
        }))

        return { sucesso: true, data: { clientes: formatados } }
    } catch (error) {
        console.error('[Cliente] Erro ao listar clientes admin:', error)
        return { sucesso: false, erro: 'Falha ao carregar lista de clientes.' }
    }
}

// ── HISTÓRICO INDIVIDUAL (Dono, Admin ou Recepcionista) ──────────────────────

export async function obterHistoricoCliente(clienteId: string): Promise<ActionResult<{ dados: HistoricoClienteData }>> {
    const erroAuth = await checarPermissaoDonoOuGestao(clienteId)
    if (erroAuth) return { sucesso: false, erro: erroAuth }

    try {
        const cliente = await prisma.cliente.findUnique({
            where: { id: clienteId },
            select: { nome: true, telefone: true, email: true, cpf: true, anonimizado: true }
        })

        if (!cliente) return { sucesso: false, erro: 'Cliente não encontrado.' }

        const agendamentos = await prisma.agendamento.findMany({
            where: { clienteId },
            orderBy: { dataHoraInicio: 'desc' },
            select: {
                id: true, dataHoraInicio: true, valorBruto: true, concluido: true,
                funcionario: { select: { nome: true } },
                servicos: { select: { servico: { select: { nome: true } } } },
                produtos: { select: { produto: { select: { nome: true } } } },
                avaliacao: { select: { id: true, nota: true } }
            }
        })

        const totalGasto = agendamentos
            .filter(ag => ag.concluido)
            .reduce((acc, ag) => acc + ag.valorBruto, 0)

        return {
            sucesso: true,
            data: {
                dados: {
                    cliente,
                    totalGasto,
                    agendamentos
                }
            }
        }
    } catch (error) {
        console.error(`[Cliente] Erro ao obter histórico do cliente ${clienteId}:`, error)
        return { sucesso: false, erro: 'Falha técnica ao carregar o histórico.' }
    }
}

export async function anonimizarClienteLGPD(id: string): Promise<ActionResult> {
    return excluirContaCliente(id);
}

export async function excluirClientePermanente(id: string): Promise<ActionResult> {
    const erroAuth = await checarPermissaoAdmin()
    if (erroAuth) return { sucesso: false, erro: erroAuth }

    try {
        await prisma.cliente.delete({ where: { id } })
        revalidatePath('/admin/clientes')
        return { sucesso: true }
    } catch (error) {
        console.error(`[Cliente] Erro ao excluir permanentemente o cliente ${id}:`, error)
        return { sucesso: false, erro: 'Não é possível excluir clientes com histórico financeiro atrelado. Utilize a anonimização.' }
    }
}