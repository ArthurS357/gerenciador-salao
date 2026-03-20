'use server'

import { prisma } from '@/lib/prisma';

export async function listarServicosPublicos() {
  try {
    const servicos = await prisma.servico.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' }
    });
    return { sucesso: true, servicos };
  } catch (error) {
    return { sucesso: false, servicos: [] };
  }
}

export async function listarServicosAdmin() {
    try {
        const servicos = await prisma.servico.findMany({
            where: { ativo: true },
            orderBy: { nome: 'asc' }
        });
        return { sucesso: true, servicos };
    } catch (error) {
        return { sucesso: false, servicos: [] };
    }
}

export async function criarServicoAdmin(dados: any) {
    try {
        const servico = await prisma.servico.create({
            data: {
                nome: dados.nome,
                descricao: dados.descricao || null,
                preco: dados.preco ? Number(dados.preco) : null, // Opcional (Sob consulta)
                tempoMinutos: dados.tempoMinutos ? Number(dados.tempoMinutos) : null,
                imagemUrl: dados.imagemUrl || null, // Opcional (URL de foto do portfólio)
            }
        });
        return { sucesso: true, servico };
    } catch (error) {
        return { sucesso: false, erro: 'Falha ao cadastrar o serviço.' };
    }
}