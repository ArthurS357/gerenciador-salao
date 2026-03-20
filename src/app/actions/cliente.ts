'use server'

import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';
import { cookies } from 'next/headers';

export async function excluirMinhaContaLGPD(clienteId: string) {
    try {
        // 1. Gera hashes irreversíveis para destruir a ligação aos dados reais
        const hashNome = `Anonimizado_${randomUUID().substring(0, 8)}`;
        const hashTelefone = `0000_${randomUUID().substring(0, 8)}`;

        // 2. Atualiza o registo no banco de dados (Anonimização)
        await prisma.cliente.update({
            where: { id: clienteId },
            data: {
                nome: hashNome,
                telefone: hashTelefone,
                anonimizado: true,
            },
        });

        // 3. Remove o cookie de sessão para expulsar o utilizador do painel
        (await cookies()).delete('cliente_session');

        return { sucesso: true };
    } catch (error) {
        console.error('Erro na exclusão de conta via LGPD:', error);
        return { sucesso: false, erro: 'Ocorreu uma falha ao processar o seu pedido.' };
    }
}