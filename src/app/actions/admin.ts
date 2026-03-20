'use server'

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

// Passo 2: Ação para Atualizar Permissões da Equipe
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

// Passo 3: Ação de Anonimização (Direito ao Esquecimento - LGPD)
export async function anonimizarClienteLGPD(clienteId: string) {
    try {
        // Geramos hashes irreversíveis para destruir a ligação com a pessoa natural
        const hashNome = `Anonimizado_${randomUUID().substring(0, 8)}`;
        // Usamos um prefixo '0000' para garantir que não pareça um número real
        const hashTelefone = `0000_${randomUUID().substring(0, 8)}`;

        const clienteAnonimizado = await prisma.cliente.update({
            where: { id: clienteId },
            data: {
                nome: hashNome,
                telefone: hashTelefone,
                anonimizado: true,
            },
        });

        return {
            sucesso: true,
            mensagem: 'Cliente anonimizado com sucesso. Histórico financeiro preservado para a Curva ABC.'
        };
    } catch (error) {
        console.error('Erro na anonimização LGPD:', error);
        return { sucesso: false, erro: 'Falha ao processar a exclusão e anonimização dos dados.' };
    }
}