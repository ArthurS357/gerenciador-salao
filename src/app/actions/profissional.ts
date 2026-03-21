'use server'

import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'chave_secreta_desenvolvimento');

export async function obterDadosPainelProfissional() {
    try {
        // 1. Identifica o profissional logado através do cookie de segurança
        const cookieStore = await cookies();
        const token = cookieStore.get('funcionario_session')?.value;

        if (!token) return { sucesso: false, erro: 'Não autenticado.' };

        const { payload } = await jwtVerify(token, JWT_SECRET);
        const funcionarioId = payload.sub as string;

        const funcionario = await prisma.funcionario.findUnique({
            where: { id: funcionarioId }
        });

        if (!funcionario) return { sucesso: false, erro: 'Profissional não encontrado.' };

        // 2. Define o intervalo de "hoje" (00:00 até 23:59)
        const agora = new Date();
        const inicioDoDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 0, 0, 0);
        const fimDoDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 23, 59, 59);

        // 3. Busca apenas a agenda de HOJE para este profissional
        const agendamentosHoje = await prisma.agendamento.findMany({
            where: {
                funcionarioId,
                dataHoraInicio: { gte: inicioDoDia, lte: fimDoDia }
            },
            orderBy: { dataHoraInicio: 'asc' },
            include: {
                cliente: { select: { nome: true, telefone: true } },
                servicos: { include: { servico: true } }
            }
        });

        // 4. Calcula a comissão acumulada do mês atual (se ele tiver permissão para ver)
        let comissaoMensal = 0;

        if (funcionario.podeVerComissao) {
            const inicioDoMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

            const agendamentosMes = await prisma.agendamento.findMany({
                where: {
                    funcionarioId,
                    concluido: true, // Só recebe comissão do que já foi pago/fechado
                    dataHoraInicio: { gte: inicioDoMes }
                },
                include: { servicos: true }
            });

            agendamentosMes.forEach(ag => {
                const valorServicos = ag.servicos.reduce((acc, s) => acc + (s.precoCobrado || 0), 0);
                comissaoMensal += valorServicos * (funcionario.comissao / 100);
            });
        }

        return {
            sucesso: true,
            profissional: {
                nome: funcionario.nome,
                podeVerComissao: funcionario.podeVerComissao,
                taxaComissao: funcionario.comissao,
                comissaoMensal
            },
            agendamentosHoje
        };
    } catch (error) {
        console.error('Erro ao carregar painel do profissional:', error);
        return { sucesso: false, erro: 'Falha técnica ao carregar o seu painel.' };
    }
}