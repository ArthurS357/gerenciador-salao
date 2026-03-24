'use server'

import { prisma } from '@/lib/prisma'
import { hash } from 'bcrypt'
import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import type { Funcionario } from '@/types/domain'

// ── Tipagens explícitas ────────────────────────────────────────────────────────

type DadosCriarFuncionario = {
    nome: string
    email: string
    cpf?: string
    telefone?: string
    especialidade?: string
    descricao?: string
    comissao?: number
    podeAgendar?: boolean
    podeVerHistorico?: boolean
    podeCancelar?: boolean
    servicosIds?: string[]
}

type DadosEditarFuncionario = {
    nome?: string
    email?: string
    cpf?: string
    telefone?: string
    especialidade?: string
    descricao?: string
    comissao?: number
    podeAgendar?: boolean
    podeVerHistorico?: boolean
    servicosIds?: string[]
}

type ActionOk<T> = { sucesso: true } & T
type ActionErr = { sucesso: false; erro: string }
type ActionResult<T = object> = ActionOk<T> | ActionErr

// ── 1. SETUP: Cria o primeiro admin via .env ──────────────────────────────────

export async function gerarAdminInicial(): Promise<ActionResult<{ mensagem: string }>> {
    try {
        const adminExistente = await prisma.funcionario.findFirst({ where: { role: 'ADMIN' } })
        if (adminExistente) return { sucesso: false, erro: 'Administrador já configurado no banco.' }

        const emailAdmin = process.env.ADMIN_EMAIL
        const senhaAdmin = process.env.ADMIN_PASSWORD

        if (!emailAdmin || !senhaAdmin) {
            return {
                sucesso: false,
                erro: 'Variáveis ADMIN_EMAIL e ADMIN_PASSWORD não encontradas no arquivo .env.',
            }
        }

        const senhaHash = await hash(senhaAdmin, 10)

        await prisma.funcionario.create({
            data: {
                nome: 'Administrador Master',
                email: emailAdmin,
                senhaHash,
                role: 'ADMIN',
            },
        })

        return { sucesso: true, mensagem: `Admin gerado. Faça login com ${emailAdmin}` }
    } catch (error) {
        console.error('Erro ao gerar admin:', error)
        return { sucesso: false, erro: 'Falha técnica ao criar a conta master.' }
    }
}

// ── 2. CRIAÇÃO E EDIÇÃO ─────────────────────────────────────────────────────────

export async function criarFuncionario(
    dados: DadosCriarFuncionario
): Promise<ActionResult<{ funcionario: Funcionario }>> {
    try {
        const senhaHash = await hash('Mudar@123', 10)

        const novoFuncionario = await prisma.funcionario.create({
            data: {
                nome: dados.nome,
                email: dados.email,
                senhaHash,
                role: 'PROFISSIONAL',
                cpf: dados.cpf ?? null,
                telefone: dados.telefone ?? null,
                especialidade: dados.especialidade ?? null,
                descricao: dados.descricao ?? null,
                comissao: Number(dados.comissao) || 40.0,
                podeAgendar: dados.podeAgendar ?? false,
                podeVerHistorico: dados.podeVerHistorico ?? false,
                podeCancelar: dados.podeCancelar ?? false,
                servicos: dados.servicosIds && dados.servicosIds.length > 0
                    ? { connect: dados.servicosIds.map(id => ({ id })) }
                    : undefined,
            },
        })

        return { sucesso: true, funcionario: novoFuncionario as Funcionario }
    } catch (error) {
        console.error('Erro ao criar funcionário:', error)
        return { sucesso: false, erro: 'Falha ao criar. Verifique se o e-mail ou CPF já estão em uso.' }
    }
}

export async function editarFuncionarioCompleto(
    id: string,
    dados: DadosEditarFuncionario
): Promise<ActionResult<{ funcionario: Funcionario }>> {
    try {
        const { servicosIds, ...restoDosDados } = dados;

        const atualizado = await prisma.funcionario.update({
            where: { id },
            data: {
                ...restoDosDados,
                ...(servicosIds && {
                    servicos: {
                        set: servicosIds.map(id => ({ id }))
                    }
                })
            },
        })

        return { sucesso: true, funcionario: atualizado as Funcionario }
    } catch (error) {
        console.error('Erro ao editar funcionário:', error)
        return { sucesso: false, erro: 'Falha ao atualizar os dados do profissional no banco.' }
    }
}

// ── 3. PERMISSÕES E EXCLUSÕES ────────────────────────────────────────────────

export async function atualizarFuncionarioCompleto(
    id: string,
    dados: { comissao: number, podeVerComissao: boolean, podeAgendar: boolean, podeVerHistorico: boolean, podeCancelar: boolean }
): Promise<ActionResult> {
    try {
        await prisma.funcionario.update({
            where: { id },
            data: dados
        })
        revalidatePath('/admin/dashboard')
        return { sucesso: true }
    } catch (error) {
        return { sucesso: false, erro: 'Falha ao atualizar permissões do funcionário.' }
    }
}

export async function inativarFuncionario(id: string): Promise<ActionResult<{ mensagem: string }>> {
    try {
        await prisma.funcionario.update({
            where: { id },
            data: { ativo: false },
        })

        return { sucesso: true, mensagem: 'Funcionário desligado. Acesso revogado com sucesso.' }
    } catch (error) {
        console.error('Erro ao inativar funcionário:', error)
        return { sucesso: false, erro: 'Falha ao inativar funcionário.' }
    }
}

export async function excluirFuncionarioPermanente(id: string): Promise<ActionResult> {
    try {
        const temAgendamentos = await prisma.agendamento.findFirst({ where: { funcionarioId: id } })
        if (temAgendamentos) return { sucesso: false, erro: 'Não é possível excluir um funcionário que já possui agendamentos no histórico. Utilize a inativação.' }

        await prisma.funcionario.delete({ where: { id } })
        revalidatePath('/admin/dashboard')
        return { sucesso: true }
    } catch (error) {
        return { sucesso: false, erro: 'Falha ao excluir o funcionário permanentemente.' }
    }
}

// (As funções de cliente LGPD foram omitidas daqui pois já residem e funcionam bem em actions/cliente.ts)
export async function excluirClientePermanente(id: string): Promise<ActionResult> {
    try {
        const temAgendamentos = await prisma.agendamento.findFirst({ where: { clienteId: id } })
        if (temAgendamentos) return { sucesso: false, erro: 'O cliente possui histórico financeiro. Utilize a anonimização (LGPD) ou inative-o.' }

        await prisma.cliente.delete({ where: { id } })
        revalidatePath('/admin/clientes')
        return { sucesso: true }
    } catch (error) {
        return { sucesso: false, erro: 'Falha ao excluir o cliente permanentemente.' }
    }
}

export async function anonimizarClienteLGPD(clienteId: string): Promise<ActionResult<{ mensagem: string }>> {
    try {
        const hashNome = `Anonimizado_${randomUUID().substring(0, 8)}`
        const hashTelefone = `0000_${randomUUID().substring(0, 8)}`

        await prisma.cliente.update({
            where: { id: clienteId },
            data: { nome: hashNome, telefone: hashTelefone, anonimizado: true },
        })

        return { sucesso: true, mensagem: 'Cliente anonimizado com sucesso.' }
    } catch (error) {
        return { sucesso: false, erro: 'Falha ao processar a anonimização.' }
    }
}

// ── 4. LISTAGEM DE EQUIPA E ESCALAS (NOVO) ───────────────────────────────────

export async function listarEquipaAdmin(): Promise<ActionResult<{ equipa: any[] }>> {
    try {
        const equipa = await prisma.funcionario.findMany({
            where: { role: 'PROFISSIONAL', ativo: true },
            orderBy: { nome: 'asc' },
            include: {
                servicos: { select: { id: true, nome: true } },
                expedientes: { orderBy: { diaSemana: 'asc' } } // <-- AGORA TRAZ A ESCALA
            }
        })

        // Normaliza a escala (garante que tem os 7 dias na interface mesmo se não existir no banco)
        const equipaNormalizada = equipa.map(prof => {
            let expedientes = prof.expedientes;
            if (expedientes.length === 0) {
                const diasPadrao = Array.from({ length: 7 }).map((_, index) => ({
                    diaSemana: index, horaInicio: '09:00', horaFim: '18:00', ativo: false
                }));
                expedientes = diasPadrao as any;
            }
            return { ...prof, expedientes }
        })

        return { sucesso: true, equipa: equipaNormalizada }
    } catch (error) {
        console.error('Erro ao listar equipa:', error)
        return { sucesso: false, erro: 'Falha ao carregar a equipa.' }
    }
}

export async function salvarEscalaFuncionarioAdmin(
    funcionarioId: string,
    expedientes: Array<{ diaSemana: number, horaInicio: string, horaFim: string, ativo: boolean }>
): Promise<ActionResult> {
    try {
        const transacoes = expedientes.map(exp => {
            return prisma.expediente.upsert({
                where: {
                    funcionarioId_diaSemana: {
                        funcionarioId: funcionarioId,
                        diaSemana: exp.diaSemana
                    }
                },
                update: {
                    horaInicio: exp.horaInicio,
                    horaFim: exp.horaFim,
                    ativo: exp.ativo
                },
                create: {
                    funcionarioId: funcionarioId,
                    diaSemana: exp.diaSemana,
                    horaInicio: exp.horaInicio,
                    horaFim: exp.horaFim,
                    ativo: exp.ativo
                }
            })
        })

        await prisma.$transaction(transacoes)
        revalidatePath('/admin/dashboard')

        return { sucesso: true }
    } catch (error) {
        return { sucesso: false, erro: 'Erro ao salvar a escala de trabalho.' }
    }
}