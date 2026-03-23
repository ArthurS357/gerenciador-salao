import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt'; // Certifique-se de ter o bcryptjs instalado (npm install bcryptjs)

export async function GET() {
    try {
        const nome = process.env.ADMIN_NOME;
        const email = process.env.ADMIN_EMAIL;
        const senhaPlana = process.env.ADMIN_SENHA;

        if (!nome || !email || !senhaPlana) {
            return NextResponse.json({ erro: 'Variáveis de ambiente do Admin não configuradas no .env' }, { status: 400 });
        }

        // Verifica se o admin já existe
        const adminExistente = await prisma.funcionario.findUnique({
            where: { email }
        });

        if (adminExistente) {
            return NextResponse.json({ mensagem: 'A conta de Administrador já existe no sistema.' });
        }

        // Gera o hash da senha e cria a conta
        const senhaHash = await bcrypt.hash(senhaPlana, 10);

        await prisma.funcionario.create({
            data: {
                nome,
                email,
                senhaHash,
                role: 'ADMIN', // <-- Define como Administrador Master
                comissao: 0,
                podeVerComissao: true,
                podeAgendar: true,
                podeVerHistorico: true,
                podeCancelar: true,
            }
        });

        return NextResponse.json({ sucesso: true, mensagem: 'Administrador Master criado com sucesso!' });
    } catch (error) {
        console.error('Erro no setup do Admin:', error);
        return NextResponse.json({ erro: 'Falha interna ao criar o Administrador.' }, { status: 500 });
    }
}