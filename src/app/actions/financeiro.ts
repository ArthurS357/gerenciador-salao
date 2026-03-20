'use server'

import { prisma } from '@/lib/prisma'; // ✅ só isso, sem redeclarar abaixo

// ❌ remova esta linha:
// const prisma = new PrismaClient();

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