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

// ── 2. CRIAÇÃO ────────────────────────────────────────────────────────────────

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
            },
        })

        return { sucesso: true, funcionario: novoFuncionario as Funcionario }
    } catch (error) {
        console.error('Erro ao criar funcionário:', error)
        return { sucesso: false, erro: 'Falha ao criar. Verifique se o e-mail ou CPF já estão em uso.' }
    }
}

// ── 3. EDIÇÃO ─────────────────────────────────────────────────────────────────

export async function editarFuncionarioCompleto(
    id: string,
    dados: DadosEditarFuncionario
): Promise<ActionResult<{ funcionario: Funcionario }>> {
    try {
        const atualizado = await prisma.funcionario.update({
            where: { id },
            data: dados,
        })

        return { sucesso: true, funcionario: atualizado as Funcionario }
    } catch (error) {
        console.error('Erro ao editar funcionário:', error)
        return { sucesso: false, erro: 'Falha ao atualizar os dados do profissional no banco.' }
    }
}

// ── 4. PERMISSÕES E ATUALIZAÇÃO COMPLETA ──────────────────────────────────────

export async function atualizarPermissoesFuncionario(
    funcionarioId: string,
    dados: { comissao?: number; podeAgendar?: boolean; podeVerHistorico?: boolean }
): Promise<ActionResult<{ funcionario: Funcionario }>> {
    try {
        const funcionarioAtualizado = await prisma.funcionario.update({
            where: { id: funcionarioId },
            data: dados,
        })

        return { sucesso: true, funcionario: funcionarioAtualizado as Funcionario }
    } catch (error) {
        console.error('Erro ao atualizar permissões do funcionário:', error)
        return { sucesso: false, erro: 'Falha ao atualizar permissões no banco de dados.' }
    }
}

export async function atualizarFuncionarioCompleto(
    id: string,
    dados: { comissao: number, podeVerComissao: boolean, podeAgendar: boolean, podeVerHistorico: boolean }
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

// ── 5. EXCLUSÃO FÍSICA E LÓGICA ───────────────────────────────────────────────

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
        // Proteção: não exclui se tiver agendamentos (para não quebrar histórico financeiro)
        const temAgendamentos = await prisma.agendamento.findFirst({ where: { funcionarioId: id } })

        if (temAgendamentos) {
            return { sucesso: false, erro: 'Não é possível excluir um funcionário que já possui agendamentos no histórico. Utilize a inativação.' }
        }

        await prisma.funcionario.delete({ where: { id } })
        revalidatePath('/admin/dashboard')
        return { sucesso: true }
    } catch (error) {
        return { sucesso: false, erro: 'Falha ao excluir o funcionário permanentemente.' }
    }
}

export async function excluirClientePermanente(id: string): Promise<ActionResult> {
    try {
        // Proteção: não exclui se tiver agendamentos (para não quebrar histórico financeiro)
        const temAgendamentos = await prisma.agendamento.findFirst({ where: { clienteId: id } })

        if (temAgendamentos) {
            return { sucesso: false, erro: 'O cliente possui histórico financeiro. Utilize a anonimização (LGPD) ou inative-o.' }
        }

        await prisma.cliente.delete({ where: { id } })
        revalidatePath('/admin/clientes')
        return { sucesso: true }
    } catch (error) {
        return { sucesso: false, erro: 'Falha ao excluir o cliente permanentemente.' }
    }
}

// ── 6. LGPD: Anonimização irreversível ───────────────────────────────────────

export async function anonimizarClienteLGPD(
    clienteId: string
): Promise<ActionResult<{ mensagem: string }>> {
    try {
        const hashNome = `Anonimizado_${randomUUID().substring(0, 8)}`
        const hashTelefone = `0000_${randomUUID().substring(0, 8)}`

        await prisma.cliente.update({
            where: { id: clienteId },
            data: { nome: hashNome, telefone: hashTelefone, anonimizado: true },
        })

        return {
            sucesso: true,
            mensagem: 'Cliente anonimizado com sucesso. Histórico financeiro preservado para a Curva ABC.',
        }
    } catch (error) {
        console.error('Erro na anonimização LGPD:', error)
        return { sucesso: false, erro: 'Falha ao processar a exclusão e anonimização dos dados.' }
    }
}

// ── 7. LISTAGEM DE EQUIPA ─────────────────────────────────────────────────────

export async function listarEquipaAdmin(): Promise<ActionResult<{ equipa: Funcionario[] }>> {
    try {
        const equipa = await prisma.funcionario.findMany({
            where: { role: 'PROFISSIONAL', ativo: true },
            orderBy: { nome: 'asc' },
        })
        return { sucesso: true, equipa: equipa as Funcionario[] }
    } catch (error) {
        console.error('Erro ao listar equipa:', error)
        return { sucesso: false, erro: 'Falha ao carregar a equipa.' }
    }
}