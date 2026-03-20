'use server'

import { prisma } from '@/lib/prisma'; // ✅ só isso, sem redeclarar abaixo

export async function obterResumoFinanceiro() {
    try {
        // Busca apenas agendamentos já concluídos (pagos)
        const agendamentos = await prisma.agendamento.findMany({
            where: { concluido: true },
            include: {
                funcionario: true,
                produtos: { include: { produto: true } },
                servicos: true
            }
        });

        let faturamentoBruto = 0;
        let custoProdutos = 0;
        let totalComissoes = 0;

        agendamentos.forEach(ag => {
            faturamentoBruto += ag.valorBruto;

            // 1. Calcula o custo real dos produtos retirados do estoque
            ag.produtos.forEach(item => {
                custoProdutos += (item.produto.precoCusto * item.quantidade);
            });

            // 2. Calcula a comissão do profissional apenas sobre os serviços prestados
            const valorServicos = ag.servicos.reduce((acc, s) => acc + (s.precoCobrado || 0), 0);
            totalComissoes += valorServicos * (ag.funcionario.comissao / 100);
        });

        const lucroLiquido = faturamentoBruto - custoProdutos - totalComissoes;

        // Busca a equipe para gerenciar as porcentagens de comissão
        const equipe = await prisma.funcionario.findMany({
            where: { role: 'PROFISSIONAL', ativo: true },
            select: { id: true, nome: true, comissao: true, podeVerComissao: true }
        });

        return {
            sucesso: true,
            faturamentoBruto,
            custoProdutos,
            totalComissoes,
            lucroLiquido,
            equipe
        };
    } catch (error) {
        console.error('Erro no módulo financeiro:', error);
        return { sucesso: false, erro: 'Falha ao processar dados financeiros.' };
    }
}

export async function atualizarComissaoFuncionario(id: string, comissao: number, podeVerComissao: boolean) {
    try {
        await prisma.funcionario.update({
            where: { id },
            data: { comissao, podeVerComissao }
        });
        return { sucesso: true };
    } catch (error) {
        return { sucesso: false, erro: 'Erro ao atualizar configurações do profissional.' };
    }
}

export async function calcularFechamentoComanda(
    agendamentoId: string,
    taxaAdquirentePercentual: number = 3, // 3% de taxa da maquininha por padrão
    custoInsumos: number
) {
    try {
        // Passo 1 e 3: Buscar o agendamento e os dados de comissão do funcionário
        const agendamento = await prisma.agendamento.findUnique({
            where: { id: agendamentoId },
            include: { funcionario: true }
        });

        if (!agendamento) throw new Error('Agendamento não encontrado no banco de dados.');

        const valorBruto = agendamento.valorBruto;
        const comissaoPercentual = agendamento.funcionario.comissao;

        // Passo 4: Executar as equações do escudo financeiro
        const valorTaxaCartao = valorBruto * (taxaAdquirentePercentual / 100);
        const deducoesTotais = valorTaxaCartao + custoInsumos;

        // Base real sobre a qual a comissão será calculada
        const baseLiquida = valorBruto - deducoesTotais;

        // Fatiamento dos lucros
        const valorRepasseProfissional = baseLiquida * (comissaoPercentual / 100);
        const lucroRetidoSalao = baseLiquida - valorRepasseProfissional;

        // Passo 5: Persistir a conclusão e as taxas no banco via Prisma
        await prisma.agendamento.update({
            where: { id: agendamentoId },
            data: {
                taxas: deducoesTotais,
                concluido: true,
            }
        });

        // Retorna o espelho financeiro exato para a interface (Torre de Controle)
        return {
            sucesso: true,
            financeiro: {
                bruto: valorBruto,
                deducoes: deducoesTotais,
                baseReal: baseLiquida,
                comissao: valorRepasseProfissional,
                lucroSalao: lucroRetidoSalao
            }
        };

    } catch (error) {
        console.error('Erro crítico no processamento financeiro:', error);
        return { sucesso: false, erro: 'Falha ao processar o fechamento da comanda.' };
    }
}