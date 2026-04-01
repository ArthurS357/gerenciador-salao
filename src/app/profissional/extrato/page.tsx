'use client'

import { useEffect, useState } from 'react'
import { getExtratoProfissional } from '@/app/actions/profissional'
import { Loader2, DollarSign, ChevronLeft } from 'lucide-react'
import Link from 'next/link'

type ItemExtrato = {
    id: string
    servico: string
    data: Date
    bruto: number
    insumos: number
    comissaoLiquida: number
    taxa: number
}

export default function ExtratoProfissionalPage() {
    const [extrato, setExtrato] = useState<ItemExtrato[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [erro, setErro] = useState<string | null>(null)

    useEffect(() => {
        async function carregar() {
            const res = await getExtratoProfissional()
            if (!res.sucesso) {
                setErro(res.erro)
            } else if (res.data) {
                setExtrato(res.data.extrato)
                setTotal(res.data.totalReceber)
            }
            setLoading(false)
        }
        void carregar()
    }, [])

    const mesAtual = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date())

    return (
        <div className="min-h-screen bg-background font-sans">
            <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-6">

                {/* Navegação de volta */}
                <Link
                    href="/profissional/dashboard"
                    className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Voltar ao Dashboard
                </Link>

                {/* Cabeçalho */}
                <div>
                    <h1 className="text-3xl font-black text-foreground">Meu Extrato</h1>
                    <p className="text-muted-foreground text-sm mt-1 capitalize">
                        Ganhos de {mesAtual} · Base = Valor Bruto − Insumos
                    </p>
                </div>

                {/* Estado de Carregamento */}
                {loading && (
                    <div className="flex justify-center p-20">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                )}

                {/* Estado de Erro */}
                {!loading && erro && (
                    <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive font-bold text-sm">
                        {erro}
                    </div>
                )}

                {/* Conteúdo */}
                {!loading && !erro && (
                    <>
                        {/* Card Total a Receber */}
                        <div className="bg-primary/10 border border-primary/20 p-6 rounded-2xl flex items-center justify-between">
                            <div>
                                <h2 className="text-xs font-bold text-primary uppercase tracking-widest">
                                    Total a Receber — {mesAtual}
                                </h2>
                                <p className="text-4xl font-black text-foreground mt-2">
                                    R${' '}
                                    {total.toLocaleString('pt-BR', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })}
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                    {extrato.length} atendimento{extrato.length !== 1 ? 's' : ''} faturado{extrato.length !== 1 ? 's' : ''}
                                </p>
                            </div>
                            <div className="p-4 bg-primary text-primary-foreground rounded-full shadow-lg shadow-primary/20">
                                <DollarSign className="w-8 h-8" />
                            </div>
                        </div>

                        {/* Fórmula de Transparência */}
                        <div className="bg-muted/40 border border-border rounded-xl p-4 text-xs text-muted-foreground space-y-1">
                            <p className="font-bold text-foreground text-sm">Como é calculado?</p>
                            <p>① <strong>Base</strong> = Valor Bruto do Serviço − Custo dos Insumos</p>
                            <p>② <strong>Comissão Líquida</strong> = Base × Taxa de Comissão (%)</p>
                            <p className="text-[10px] pt-1 border-t border-border">
                                A taxa é congelada no momento do fechamento da comanda — alterações futuras não afetam o histórico.
                            </p>
                        </div>

                        {/* Tabela de Atendimentos */}
                        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-muted/50 text-muted-foreground font-bold uppercase text-[10px] tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4">Data e Serviço</th>
                                            <th className="px-6 py-4 text-right">Valor Bruto</th>
                                            <th className="px-6 py-4 text-right">Custo Insumos</th>
                                            <th className="px-6 py-4 text-right">Comissão Líquida</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {extrato.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="text-center py-12 text-muted-foreground">
                                                    <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                                    <p className="font-bold">Nenhum atendimento faturado este mês.</p>
                                                    <p className="text-xs mt-1">Os registos aparecerão aqui quando as comandas forem fechadas.</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            extrato.map(item => (
                                                <tr
                                                    key={item.id}
                                                    className="hover:bg-muted/30 transition-colors"
                                                >
                                                    <td className="px-6 py-4">
                                                        <p className="font-bold text-foreground">{item.servico}</p>
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            {new Intl.DateTimeFormat('pt-BR', {
                                                                dateStyle: 'short',
                                                                timeStyle: 'short',
                                                            }).format(new Date(item.data))}
                                                        </p>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-medium text-foreground">
                                                        R$ {item.bruto.toFixed(2).replace('.', ',')}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-medium text-red-500">
                                                        {item.insumos > 0
                                                            ? `− R$ ${item.insumos.toFixed(2).replace('.', ',')}`
                                                            : <span className="text-muted-foreground">—</span>
                                                        }
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className="font-black text-green-600">
                                                            R$ {item.comissaoLiquida.toFixed(2).replace('.', ',')}
                                                        </span>
                                                        <span className="block text-[10px] font-normal text-muted-foreground mt-0.5">
                                                            {item.taxa}% sobre a base
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>

                                    {/* Rodapé com Total */}
                                    {extrato.length > 0 && (
                                        <tfoot className="bg-muted/30 border-t-2 border-border">
                                            <tr>
                                                <td className="px-6 py-4 font-black text-foreground text-sm" colSpan={3}>
                                                    Total do Mês
                                                </td>
                                                <td className="px-6 py-4 text-right font-black text-green-600 text-lg">
                                                    R$ {total.toFixed(2).replace('.', ',')}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
