'use client'

import type { FinanceiroResumo } from '@/types/domain'

interface BotaoExportarPDFProps {
    dados: FinanceiroResumo | null
    periodoAtual: string
    isLoadingMetrics: boolean
}

export default function BotaoExportarPDF({ dados, periodoAtual, isLoadingMetrics }: BotaoExportarPDFProps) {

    const botoesFiltro = [
        { valor: 'hoje', label: 'Hoje' },
        { valor: 'semana', label: 'Últimos 7 Dias' },
        { valor: 'mes', label: 'Mês Atual' },
        { valor: 'tudo', label: 'Todo o Histórico' },
    ]
    const getNomePeriodo = () => botoesFiltro.find(b => b.valor === periodoAtual)?.label || periodoAtual

    const exportarParaPDF = async () => {
        if (!dados) return

        try {
            // Importações dinâmicas executadas apenas quando o utilizador clica (previne erro no build)
            const { jsPDF } = await import('jspdf')
            const autoTable = (await import('jspdf-autotable')).default

            const doc = new jsPDF()

            doc.setFontSize(20)
            doc.text('Relatório Financeiro do Salão', 14, 22)

            doc.setFontSize(11)
            doc.setTextColor(100)
            doc.text(`Período de Análise: ${getNomePeriodo()}`, 14, 30)
            doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 14, 36)

            autoTable(doc, {
                startY: 45,
                head: [['Métrica Financeira', 'Valor (R$)']],
                body: [
                    ['Faturamento Bruto', dados.faturamentoBruto.toFixed(2)],
                    ['Custos (Insumos + Revenda)', dados.custoProdutos.toFixed(2)],
                    ['Comissões Pagas', dados.totalComissoes.toFixed(2)],
                    ['Lucro Líquido (Real)', dados.lucroLiquido.toFixed(2)],
                ],
                theme: 'grid',
                headStyles: { fillColor: [92, 64, 51] },
                styles: { fontSize: 10 }
            })

            // CORREÇÃO: Conversão segura (cast) para aceder à propriedade do autotable sem usar 'any'
            const docWithAutoTable = doc as unknown as { lastAutoTable: { finalY: number } }

            autoTable(doc, {
                startY: docWithAutoTable.lastAutoTable.finalY + 15,
                head: [['Profissional', 'Comissão (%)', 'Acesso Visível']],
                body: dados.equipe.map(p => [p.nome, `${p.comissao}%`, p.podeVerComissao ? 'Sim' : 'Não']),
                theme: 'striped',
                headStyles: { fillColor: [139, 90, 43] },
                styles: { fontSize: 10 }
            })

            doc.save(`Relatorio_Financeiro_${periodoAtual}.pdf`)
        } catch (error) {
            console.error("Erro ao gerar PDF:", error)
            alert("Ocorreu um erro ao gerar o PDF. Por favor, tente novamente.")
        }
    }

    return (
        <button
            onClick={exportarParaPDF}
            disabled={isLoadingMetrics || !dados}
            className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors disabled:opacity-50 text-sm shadow-sm"
        >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
            </svg>
            PDF
        </button>
    )
}