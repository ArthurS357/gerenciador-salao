'use server'

import { prisma } from '@/lib/prisma';
import { hash } from 'bcrypt';
import { randomUUID } from 'crypto';

// ── Tipagens explícitas (elimina os `any` perigosos) ──────────────────────────

type DadosCriarFuncionario = {
    nome: string;
    email: string;
    cpf?: string;
    telefone?: string;
    especialidade?: string;
    descricao?: string;
    comissao?: number;
    podeAgendar?: boolean;
    podeVerHistorico?: boolean;
};

type DadosEditarFuncionario = {
    nome?: string;
    email?: string;
    cpf?: string;
    telefone?: string;
    especialidade?: string;
    descricao?: string;
    comissao?: number;
    podeAgendar?: boolean;
    podeVerHistorico?: boolean;
};

// 1. SETUP: Função de disparo único para criar o primeiro dono do sistema
export async function gerarAdminInicial() {
    try {
        const adminExistente = await prisma.funcionario.findFirst({ where: { role: 'ADMIN' } });
        if (adminExistente) return { sucesso: false, erro: 'Administrador já configurado no banco.' };

        // Puxa as credenciais diretamente do seu arquivo .env
        const emailAdmin = process.env.ADMIN_EMAIL;
        const senhaAdmin = process.env.ADMIN_PASSWORD;

        // Trava de segurança caso as variáveis não existam
        if (!emailAdmin || !senhaAdmin) {
            return {
                sucesso: false,
                erro: 'Variáveis ADMIN_EMAIL e ADMIN_PASSWORD não encontradas no arquivo .env.'
            };
        }

        const senhaHash = await hash(senhaAdmin, 10);

        await prisma.funcionario.create({
            data: {
                nome: 'Administrador Master',
                email: emailAdmin,
                senhaHash,
                role: 'ADMIN',
            }
        });

        return {
            sucesso: true,
            mensagem: `Admin gerado. Faça login com ${emailAdmin}`
        };
    } catch (error) {
        console.error('Erro ao gerar admin:', error);
        return { sucesso: false, erro: 'Falha técnica ao criar a conta master.' };
    }
}

// ── 2. CRIAÇÃO: Admin cria novo profissional com senha temporária ─────────────

export async function criarFuncionario(dados: DadosCriarFuncionario) {
    try {
        const senhaHash = await hash('Mudar@123', 10);

        const novoFuncionario = await prisma.funcionario.create({
            data: {
                nome: dados.nome,
                email: dados.email,
                senhaHash,
                role: 'PROFISSIONAL',
                cpf: dados.cpf,
                telefone: dados.telefone,
                especialidade: dados.especialidade,
                descricao: dados.descricao,
                comissao: Number(dados.comissao) || 40.0,
                podeAgendar: dados.podeAgendar ?? false,
                podeVerHistorico: dados.podeVerHistorico ?? false,
            },
        });

        return { sucesso: true, funcionario: novoFuncionario };
    } catch (error) {
        console.error('Erro ao criar funcionário:', error);
        return { sucesso: false, erro: 'Falha ao criar. Verifique se o e-mail ou CPF já estão em uso.' };
    }
}

// ── 3. EDIÇÃO: Admin atualiza dados do perfil ─────────────────────────────────
// Tipagem explícita impede sobrescrever senhaHash, id ou role acidentalmente

export async function editarFuncionarioCompleto(id: string, dados: DadosEditarFuncionario) {
    try {
        const atualizado = await prisma.funcionario.update({
            where: { id },
            data: dados,
        });

        return { sucesso: true, funcionario: atualizado };
    } catch (error) {
        console.error('Erro ao editar funcionário:', error);
        return { sucesso: false, erro: 'Falha ao atualizar os dados do profissional no banco.' };
    }
}

// ── 4. PERMISSÕES: Atualiza comissão e acessos do profissional ────────────────

export async function atualizarPermissoesFuncionario(
    funcionarioId: string,
    dados: { comissao?: number; podeAgendar?: boolean; podeVerHistorico?: boolean }
) {
    try {
        const funcionarioAtualizado = await prisma.funcionario.update({
            where: { id: funcionarioId },
            data: dados,
        });

        return { sucesso: true, funcionario: funcionarioAtualizado };
    } catch (error) {
        console.error('Erro ao atualizar permissões do funcionário:', error);
        return { sucesso: false, erro: 'Falha ao atualizar permissões no banco de dados.' };
    }
}

// ── 5. EXCLUSÃO LÓGICA: Inativa sem quebrar histórico financeiro ──────────────

export async function inativarFuncionario(id: string) {
    try {
        await prisma.funcionario.update({
            where: { id },
            data: { ativo: false },
        });

        return { sucesso: true, mensagem: 'Funcionário desligado. Acesso revogado com sucesso.' };
    } catch (error) {
        console.error('Erro ao inativar funcionário:', error);
        return { sucesso: false, erro: 'Falha ao inativar funcionário.' };
    }
} // ✅ CORREÇÃO 1: chave de fechamento que estava faltando

// ── 6. LGPD: Anonimização irreversível (Direito ao Esquecimento) ──────────────

export async function anonimizarClienteLGPD(clienteId: string) {
    try {
        const hashNome = `Anonimizado_${randomUUID().substring(0, 8)}`;
        const hashTelefone = `0000_${randomUUID().substring(0, 8)}`;

        await prisma.cliente.update({
            where: { id: clienteId },
            data: {
                nome: hashNome,
                telefone: hashTelefone,
                anonimizado: true,
            },
        });

        return {
            sucesso: true,
            mensagem: 'Cliente anonimizado com sucesso. Histórico financeiro preservado para a Curva ABC.',
        };
    } catch (error) {
        console.error('Erro na anonimização LGPD:', error);
        return { sucesso: false, erro: 'Falha ao processar a exclusão e anonimização dos dados.' };
    }
}