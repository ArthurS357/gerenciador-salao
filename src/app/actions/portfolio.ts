'use server'

import { prisma } from '@/lib/prisma';

export async function listarPortfolioPublico() {
    try {
        const itens = await prisma.itemPortfolio.findMany({
            where: { ativo: true },
            orderBy: { criadoEm: 'desc' },
            take: 6 // Mostra os 6 trabalhos mais recentes na home
        });
        return { sucesso: true, itens };
    } catch (error) {
        return { sucesso: false, itens: [] };
    }
}

export async function adicionarItemPortfolio(dados: any) {
    try {
        // Aqui no futuro você conectará a SDK do Cloudinary se o upload for via Node.
        // Por enquanto, recebemos a URL direta gerada pelo Widget do Cloudinary no Frontend.
        const item = await prisma.itemPortfolio.create({
            data: {
                titulo: dados.titulo,
                valor: dados.valor ? Number(dados.valor) : null,
                imagemUrl: dados.imagemUrl,
                linkSocial: dados.linkSocial || null,
            }
        });
        return { sucesso: true, item };
    } catch (error) {
        return { sucesso: false, erro: 'Falha ao salvar no portfólio.' };
    }
}