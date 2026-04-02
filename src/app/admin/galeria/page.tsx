'use client'

import { useState, useEffect, useCallback } from 'react'
import AdminHeader from '@/components/admin/AdminHeader'
import { MetricCard } from '@/components/admin/metric-card'
import { Image as ImageIcon, Plus, Trash2, Loader2, X, ExternalLink, Share2, Upload } from 'lucide-react'
import {
    listarPortfolioAdmin,
    criarItemPortfolio,
    excluirItemPortfolio,
    type ItemPortfolioDb,
} from '@/app/actions/portfolio'

// ── Tipos ─────────────────────────────────────────────────────────────────────
type ItemGaleria = ItemPortfolioDb

type FormCriar = {
    titulo: string
    descricao: string
    valor: string
    linkInstagram: string
    imagens: string[] // até 4 URLs
}

const FORM_INICIAL: FormCriar = {
    titulo: '',
    descricao: '',
    valor: '',
    linkInstagram: '',
    imagens: [''],
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function GaleriaAdminPage() {
    const [itens, setItens] = useState<ItemGaleria[]>([])
    const [carregando, setCarregando] = useState(true)
    const [modalAberto, setModalAberto] = useState(false)
    const [form, setForm] = useState<FormCriar>(FORM_INICIAL)
    const [salvando, setSalvando] = useState(false)
    const [mensagem, setMensagem] = useState<{ texto: string; tipo: 'sucesso' | 'erro' } | null>(null)
    const [uploadingImage, setUploadingImage] = useState<Record<number, boolean>>({})

    const carregarItens = useCallback(async () => {
        try {
            const res = await listarPortfolioAdmin()
            if (res.sucesso && res.data) {
                setItens(res.data.itens)
            }
        } catch (e) {
            console.error('[Galeria] Erro ao carregar:', e)
        } finally {
            setCarregando(false)
        }
    }, [])

    useEffect(() => { void carregarItens() }, [carregarItens])

    const handleSalvar = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (salvando) return

        const imagensFiltradas = form.imagens.filter(url => url.trim() !== '')
        if (imagensFiltradas.length === 0) {
            setMensagem({ texto: 'Adicione pelo menos 1 imagem.', tipo: 'erro' })
            return
        }

        setSalvando(true)
        try {
            const res = await criarItemPortfolio({
                titulo: form.titulo,
                descricao: form.descricao || null,
                valor: form.valor ? Number(form.valor) : null,
                imagensJson: JSON.stringify(imagensFiltradas),
                linkInstagram: form.linkInstagram || null,
            })

            if (res.sucesso) {
                setMensagem({ texto: 'Item adicionado à galeria!', tipo: 'sucesso' })
                setModalAberto(false)
                setForm(FORM_INICIAL)
                void carregarItens()
            } else {
                setMensagem({ texto: res.erro, tipo: 'erro' })
            }
        } catch {
            setMensagem({ texto: 'Falha de conexão.', tipo: 'erro' })
        } finally {
            setSalvando(false)
            setTimeout(() => setMensagem(null), 4000)
        }
    }

    const handleRemover = async (id: string) => {
        const ok = confirm('Remover este item da galeria?')
        if (!ok) return
        try {
            const res = await excluirItemPortfolio(id)
            if (res.sucesso) {
                void carregarItens()
            } else {
                setMensagem({ texto: res.erro, tipo: 'erro' })
            }
        } catch {
            setMensagem({ texto: 'Erro ao remover.', tipo: 'erro' })
        }
    }

    const adicionarCampoImagem = () => {
        if (form.imagens.length < 4) {
            setForm(f => ({ ...f, imagens: [...f.imagens, ''] }))
        }
    }

    const atualizarImagem = (index: number, valor: string) => {
        setForm(f => {
            const novas = [...f.imagens]
            novas[index] = valor
            return { ...f, imagens: novas }
        })
    }

    const removerCampoImagem = (index: number) => {
        setForm(f => ({ ...f, imagens: f.imagens.filter((_, i) => i !== index) }))
    }

    const handleUploadArquivo = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
            setMensagem({ texto: 'A imagem deve ser JPG, PNG ou WebP e ter até 5MB.', tipo: 'erro' })
            return
        }

        setUploadingImage(prev => ({ ...prev, [index]: true }))

        const formData = new FormData()
        formData.append('file', file)

        try {
            const response = await fetch('/api/upload', { method: 'POST', body: formData })
            const data = await response.json() as { url?: string; error?: string }

            if (response.ok && data.url) {
                atualizarImagem(index, data.url)
            } else {
                throw new Error(data.error ?? 'Erro no upload')
            }
        } catch {
            setMensagem({ texto: 'Falha ao processar o upload no Cloudinary.', tipo: 'erro' })
        } finally {
            setUploadingImage(prev => ({ ...prev, [index]: false }))
            // Limpa o input para permitir reenvio do mesmo arquivo
            e.target.value = ''
        }
    }

    const itensAtivos = itens.filter(i => i.ativo).length

    return (
        <div className="min-h-screen bg-background font-sans">
            <AdminHeader
                titulo="Galeria de Portfólio"
                subtitulo="Showcase dos trabalhos realizados no salão com links para o Instagram."
                abaAtiva="Galeria"
                botaoAcao={
                    <button
                        onClick={() => setModalAberto(true)}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors shadow-sm active:scale-[0.98]"
                    >
                        <Plus className="w-4 h-4" /> Adicionar Trabalho
                    </button>
                }
            />

            <div className="max-w-7xl mx-auto px-4 md:px-8 pb-12 space-y-6">

                {mensagem && (
                    <div className={`flex items-center gap-3 p-4 rounded-xl text-sm font-bold shadow-sm border animate-in fade-in ${mensagem.tipo === 'sucesso' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
                        <span>{mensagem.tipo === 'sucesso' ? '✓' : '✕'}</span>
                        {mensagem.texto}
                        <button onClick={() => setMensagem(null)} className="ml-auto opacity-50 hover:opacity-100"><X className="w-4 h-4" /></button>
                    </div>
                )}

                {/* Métricas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <MetricCard
                        label={<span className="flex items-center gap-2"><ImageIcon className="w-4 h-4 text-blue-500" /> Total na Galeria</span>}
                        value={itensAtivos.toString()}
                        subText="trabalhos publicados"
                        loading={carregando}
                    />
                    <MetricCard
                        label={<span className="flex items-center gap-2"><Share2 className="w-4 h-4 text-pink-500" /> Com Link Instagram</span>}
                        value={itens.filter(i => i.linkInstagram).length.toString()}
                        subText="posts ligados ao Instagram"
                        loading={carregando}
                    />
                    <MetricCard
                        label={<span className="flex items-center gap-2"><ImageIcon className="w-4 h-4 text-purple-500" /> Total de Fotos</span>}
                        value={itens.reduce((acc, i) => {
                            try { return acc + (JSON.parse(i.imagensJson) as string[]).length } catch { return acc + 1 }
                        }, 0).toString()}
                        subText="imagens no portfólio"
                        loading={carregando}
                    />
                </div>

                {/* Grid de Portfólio */}
                {carregando ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : itens.length === 0 ? (
                    <div className="text-center py-20 space-y-3">
                        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto">
                            <ImageIcon className="w-10 h-10 text-muted-foreground" />
                        </div>
                        <p className="font-bold text-foreground text-lg">Galeria vazia</p>
                        <p className="text-muted-foreground text-sm">Adicione o primeiro trabalho clicando em &ldquo;Adicionar Trabalho&rdquo;.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {itens.map(item => {
                            let imagens: string[] = []
                            try { imagens = JSON.parse(item.imagensJson) as string[] } catch { imagens = [item.imagensJson] }

                            return (
                                <div key={item.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                                    {/* Galeria de imagens */}
                                    <div className="relative aspect-video bg-muted overflow-hidden">
                                        {imagens[0] ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={imagens[0]}
                                                alt={item.titulo}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                                <ImageIcon className="w-12 h-12 opacity-30" />
                                            </div>
                                        )}

                                        {/* Badge de quantidade de fotos */}
                                        {imagens.length > 1 && (
                                            <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                                                +{imagens.length - 1} fotos
                                            </span>
                                        )}

                                        {/* Botão remover (visível no hover) */}
                                        <button
                                            onClick={() => void handleRemover(item.id)}
                                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                                            title="Remover da galeria"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    {/* Informações */}
                                    <div className="p-4 space-y-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <h3 className="font-bold text-foreground text-sm leading-tight">{item.titulo}</h3>
                                            {item.valor && (
                                                <span className="text-xs font-black text-primary whitespace-nowrap">
                                                    R$ {item.valor.toFixed(2).replace('.', ',')}
                                                </span>
                                            )}
                                        </div>

                                        {item.descricao && (
                                            <p className="text-xs text-muted-foreground line-clamp-2">{item.descricao}</p>
                                        )}

                                        {item.linkInstagram && (
                                            <a
                                                href={item.linkInstagram}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 text-xs font-bold text-pink-600 hover:text-pink-700 transition-colors"
                                            >
                                                <Share2 className="w-3.5 h-3.5" />
                                                Ver no Instagram
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        )}

                                        {/* Miniaturas extras */}
                                        {imagens.length > 1 && (
                                            <div className="flex gap-1.5 pt-1">
                                                {imagens.slice(1).map((img, i) => (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        key={i}
                                                        src={img}
                                                        alt={`Foto ${i + 2}`}
                                                        className="w-10 h-10 object-cover rounded-lg border border-border"
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Modal: Adicionar Trabalho */}
            {modalAberto && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg border-t-4 border-t-primary animate-in zoom-in-95 duration-200 overflow-hidden max-h-[95vh] flex flex-col">
                        <div className="px-6 py-5 border-b border-border flex justify-between items-start bg-muted/30">
                            <div>
                                <h2 className="text-xl font-bold text-foreground">Novo Trabalho</h2>
                                <p className="text-xs text-muted-foreground mt-1">Adicione até 4 fotos e o link do Instagram.</p>
                            </div>
                            <button onClick={() => { setModalAberto(false); setForm(FORM_INICIAL) }} className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form id="form-galeria" onSubmit={(e) => void handleSalvar(e)} className="overflow-y-auto p-6 space-y-5">
                            {/* Título */}
                            <div>
                                <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Título *</label>
                                <input
                                    required disabled={salvando}
                                    type="text" placeholder="Ex: Coloração Total — Tom Café"
                                    value={form.titulo}
                                    onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                                    className="w-full border border-border bg-card rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-medium text-foreground"
                                />
                            </div>

                            {/* Descrição */}
                            <div>
                                <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Descrição (Opcional)</label>
                                <input
                                    disabled={salvando}
                                    type="text" placeholder="Técnica utilizada, resultado esperado..."
                                    value={form.descricao}
                                    onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                                    className="w-full border border-border bg-card rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-medium text-foreground"
                                />
                            </div>

                            {/* Valor e Instagram */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Valor (R$)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground text-sm">R$</span>
                                        <input
                                            disabled={salvando} type="number" step="0.01" min="0"
                                            placeholder="0.00"
                                            value={form.valor}
                                            onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                                            className="w-full border border-border bg-card rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-bold text-foreground"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                                        <span className="flex items-center gap-1"><Share2 className="w-3 h-3 text-pink-500" /> Instagram</span>
                                    </label>
                                    <input
                                        disabled={salvando} type="url"
                                        placeholder="https://instagram.com/p/..."
                                        value={form.linkInstagram}
                                        onChange={e => setForm(f => ({ ...f, linkInstagram: e.target.value }))}
                                        className="w-full border border-border bg-card rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-medium text-foreground"
                                    />
                                </div>
                            </div>

                            {/* URLs das Imagens */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                                        Fotos (URLs) * — até 4
                                    </label>
                                    {form.imagens.length < 4 && (
                                        <button
                                            type="button" onClick={adicionarCampoImagem}
                                            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                                        >
                                            <Plus className="w-3 h-3" /> Adicionar foto
                                        </button>
                                    )}
                                </div>

                                {form.imagens.map((url, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <span className="text-xs font-black text-muted-foreground w-5 text-center">{idx + 1}</span>
                                        <input
                                            required={idx === 0}
                                            disabled={salvando || !!uploadingImage[idx]} type="url"
                                            placeholder={idx === 0 ? 'URL principal (obrigatório)' : 'URL adicional (opcional)'}
                                            value={url}
                                            onChange={e => atualizarImagem(idx, e.target.value)}
                                            className="flex-1 border border-border bg-card rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-medium text-foreground"
                                        />
                                        <input
                                            type="file"
                                            id={`file-upload-${idx}`}
                                            className="hidden"
                                            accept="image/jpeg,image/png,image/webp"
                                            onChange={(e) => void handleUploadArquivo(e, idx)}
                                        />
                                        <label
                                            htmlFor={`file-upload-${idx}`}
                                            className="cursor-pointer p-2.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors flex items-center justify-center"
                                            title="Fazer upload de arquivo"
                                        >
                                            {uploadingImage[idx] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                        </label>
                                        {idx > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => removerCampoImagem(idx)}
                                                className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </form>

                        <div className="px-6 py-4 bg-muted/30 border-t border-border flex gap-3">
                            <button
                                type="button"
                                onClick={() => { setModalAberto(false); setForm(FORM_INICIAL) }}
                                className="flex-1 py-2.5 text-muted-foreground font-bold rounded-xl hover:bg-muted text-sm transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit" form="form-galeria" disabled={salvando}
                                className="flex-1 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 disabled:opacity-60 text-sm transition-colors flex justify-center items-center gap-2"
                            >
                                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Publicar na Galeria'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
