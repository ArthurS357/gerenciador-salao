import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';

// Corrigido: POST garante semântica HTTP correta e impede CSRF via bots/indexadores.
// GET nunca deve realizar mutações de estado (viola RFC 7231 §4.3.1).
export async function POST() {
    try {
        // Bloqueio global: basta existir UM admin para travar o setup.
        // Impede a criação de um segundo Admin Master caso as variáveis de ambiente
        // sejam alteradas ou vazadas em produção.
        const totalAdmins = await prisma.funcionario.count({
            where: { role: 'ADMIN' },
        });

        if (totalAdmins > 0) {
            return NextResponse.json(
                { erro: 'Setup já realizado. Acesso permanentemente negado.' },
                { status: 403 }
            );
        }

        const nome = process.env.ADMIN_NOME;
        const email = process.env.ADMIN_EMAIL;
        const senhaPlana = process.env.ADMIN_PASSWORD;

        if (!nome || !email || !senhaPlana) {
            return NextResponse.json(
                { erro: 'Variáveis de ambiente incompletas: ADMIN_NOME, ADMIN_EMAIL e ADMIN_PASSWORD são obrigatórias.' },
                { status: 400 }
            );
        }

        const senhaHash = await bcrypt.hash(senhaPlana, 12);

        await prisma.funcionario.create({
            data: {
                nome,
                email,
                senhaHash,
                role: 'ADMIN',
                comissao: 0,
                podeVerComissao: true,
                podeAgendar: true,
                podeVerHistorico: true,
                podeCancelar: true,
            },
        });

        return NextResponse.json(
            { sucesso: true, mensagem: 'Administrador Master criado com sucesso.' },
            { status: 201 }
        );
    } catch (error) {
        console.error('Erro no setup do Admin:', error);
        return NextResponse.json(
            { erro: 'Falha interna ao criar o Administrador.' },
            { status: 500 }
        );
    }
}