'use client'

import { useState, useEffect } from 'react'
import { listarAniversariantesMes, type AniversarianteItem } from '@/app/actions/aniversariantes'
import { Gift, Download, ChevronLeft, ChevronRight, Loader2, Phone, Calendar } from 'lucide-react'

// ── Constantes ────────────────────────────────────────────────────────────────

const NOMES_MESES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

// ── Utilitários ───────────────────────────────────────────────────────────────

function formatarTelefone(tel: string): string {
    const d = tel.replace(/\D/g, '')
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
    return tel
}

function calcularIdade(dataNascimento: Date): number {
    const hoje = new Date()
    let idade = hoje.getFullYear() - new Date(dataNascimento).getFullYear()
    const mês = hoje.getMonth() - new Date(dataNascimento).getMonth()
    if (mês < 0 || (mês === 0 && hoje.getDate() < new Date(dataNascimento).getDate())) {
        idade--
    }
    return idade
}

// ── Componente de Exportação PDF ──────────────────────────────────────────────

function BotaoExportarPDF({
    clientes,
    mes,
}: {
    clientes: AniversarianteItem[]
    mes: number
}) {
    const [gerando, setGerando] = useState(false)

    const exportar = async () => {
        if (clientes.length === 0) return
        setGerando(true)

        try {
            // Importação dinâmica para não incluir jspdf no bundle inicial
            const jsPDFModule = await import('jspdf')
            const autoTableModule = await import('jspdf-autotable')
            const jsPDF = jsPDFModule.default
            const autoTable = autoTableModule.default

            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
            const nomeMes = NOMES_MESES[mes - 1]

            // ── Cabeçalho ──────────────────────────────────────────────────
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(18)
            doc.setTextColor(40, 40, 40)
            doc.text('Aniversariantes do Mês', 14, 20)

            doc.setFont('helvetica', 'normal')
            doc.setFontSize(11)
            doc.setTextColor(100, 100, 100)
            doc.text(`${nomeMes} — ${clientes.length} cliente(s)`, 14, 28)

            doc.setFontSize(9)
            doc.text(
                `Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
                14, 34
            )

            // ── Linha separadora ───────────────────────────────────────────
            doc.setDrawColor(220, 220, 220)
            doc.line(14, 37, 196, 37)

            // ── Tabela de aniversariantes ──────────────────────────────────
            autoTable(doc, {
                startY: 42,
                head: [['Dia', 'Nome', 'Telefone', 'Idade', 'Atendimentos']],
                body: clientes.map(c => [
                    String(c.dia).padStart(2, '0'),
                    c.nome,
                    formatarTelefone(c.telefone),
                    `${calcularIdade(c.dataNascimento)} anos`,
                    String(c.totalAtendimentos),
                ]),
                headStyles: {
                    fillColor: [55, 48, 107],
                    textColor: 255,
                    fontStyle: 'bold',
                    fontSize: 9,
                },
                bodyStyles: {
                    fontSize: 9,
                    textColor: [40, 40, 40],
                },
                alternateRowStyles: {
                    fillColor: [248, 247, 255],
                },
                columnStyles: {
                    0: { cellWidth: 12, halign: 'center' },
                    1: { cellWidth: 70 },
                    2: { cellWidth: 42 },
                    3: { cellWidth: 22, halign: 'center' },
                    4: { cellWidth: 28, halign: 'center' },
                },
                margin: { left: 14, right: 14 },
            })

            // ── Rodapé ──────────────────────────────────────────────────────
            const totalPaginas = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages()
            for (let i = 1; i <= totalPaginas; i++) {
                doc.setPage(i)
                doc.setFontSize(8)
                doc.setTextColor(150)
                doc.text(
                    `Página ${i} de ${totalPaginas}`,
                    doc.internal.pageSize.getWidth() / 2,
                    doc.internal.pageSize.getHeight() - 10,
                    { align: 'center' }
                )
            }

            doc.save(`aniversariantes-${nomeMes.toLowerCase()}.pdf`)
        } catch (err) {
            console.error('[PDF] Erro ao gerar PDF de aniversariantes:', err)
        } finally {
            setGerando(false)
        }
    }

    return (
        <button
            onClick={exportar}
            disabled={gerando || clientes.length === 0}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
            {gerando
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Download className="w-3.5 h-3.5" />
            }
            {gerando ? 'Gerando...' : 'Exportar PDF'}
        </button>
    )
}

// ── Widget Principal ──────────────────────────────────────────────────────────

export function AniversariantesWidget() {
    const mesAtual = new Date().getMonth() + 1
    const [mes, setMes] = useState(mesAtual)
    const [clientes, setClientes] = useState<AniversarianteItem[]>([])
    const [carregando, setCarregando] = useState(true)
    const [erro, setErro] = useState<string | null>(null)

    const navMes = (delta: number) => {
        // Aproveita o Automatic Batching para disparar uma única renderização de UI (loading + novo mês)
        setCarregando(true)
        setErro(null)
        setMes(m => {
            const novo = m + delta
            if (novo < 1) return 12
            if (novo > 12) return 1
            return novo
        })
    }

    useEffect(() => {
        let ignore = false

        async function sincronizar() {
            // O estado de 'carregando' e 'erro' já deve estar correto via navMes ou inicialização,
            // mas mantemos o fetch e o cleanup contra Race Conditions.
            const res = await listarAniversariantesMes(mes)

            if (!ignore) {
                if (res.sucesso && 'data' in res) {
                    // Deserializa Date (Server Actions serializam Date como string)
                    const lista = res.data.clientes.map(c => ({
                        ...c,
                        dataNascimento: new Date(c.dataNascimento),
                    }))
                    setClientes(lista)
                } else if (!res.sucesso) {
                    setErro('erro' in res ? res.erro : 'Erro desconhecido.')
                }
                setCarregando(false)
            }
        }

        sincronizar()
        return () => { ignore = true }
    }, [mes])

    return (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">Aniversariantes</span>
                    {!carregando && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                            {clientes.length}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <BotaoExportarPDF clientes={clientes} mes={mes} />
                    {/* Navegação de mês */}
                    <div className="flex items-center gap-1 ml-1">
                        <button
                            onClick={() => navMes(-1)}
                            className="p-1 rounded hover:bg-accent transition-colors"
                            aria-label="Mês anterior"
                        >
                            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <span className="text-xs font-medium text-foreground min-w-[68px] text-center">
                            {NOMES_MESES[mes - 1]}
                        </span>
                        <button
                            onClick={() => navMes(1)}
                            className="p-1 rounded hover:bg-accent transition-colors"
                            aria-label="Próximo mês"
                        >
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Corpo */}
            <div className="max-h-72 overflow-y-auto">
                {carregando && (
                    <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Carregando...</span>
                    </div>
                )}

                {!carregando && erro && (
                    <p className="text-sm text-destructive text-center py-6 px-4">{erro}</p>
                )}

                {!carregando && !erro && clientes.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
                        <Calendar className="w-8 h-8 opacity-30" />
                        <p className="text-sm">Nenhum aniversariante em {NOMES_MESES[mes - 1]}.</p>
                    </div>
                )}

                {!carregando && !erro && clientes.length > 0 && (
                    <ul className="divide-y divide-border">
                        {clientes.map(c => (
                            <li key={c.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors">
                                {/* Dia destaque */}
                                <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold
                                    ${c.dia === new Date().getDate() && mes === mesAtual
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-primary/10 text-primary'
                                    }`}
                                >
                                    {String(c.dia).padStart(2, '0')}
                                </div>

                                {/* Dados do cliente */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">
                                        {c.nome}
                                        {c.dia === new Date().getDate() && mes === mesAtual && (
                                            <span className="ml-1.5 text-xs text-primary">🎂 hoje!</span>
                                        )}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-xs text-muted-foreground">
                                            {calcularIdade(c.dataNascimento)} anos
                                        </span>
                                        {c.totalAtendimentos > 0 && (
                                            <span className="text-xs text-muted-foreground">
                                                · {c.totalAtendimentos} atendimento{c.totalAtendimentos !== 1 ? 's' : ''}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Telefone */}
                                <a
                                    href={`https://wa.me/55${c.telefone.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-shrink-0 p-1.5 rounded-md hover:bg-green-500/10 text-muted-foreground hover:text-green-600 transition-colors"
                                    title={`WhatsApp: ${formatarTelefone(c.telefone)}`}
                                >
                                    <Phone className="w-3.5 h-3.5" />
                                </a>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}
