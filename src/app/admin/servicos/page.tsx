"use client";

import { useState, useEffect } from "react";
import {
    listarServicosAdmin,
    criarServicoAdmin,
    adicionarInsumoFichaTecnica,
    removerInsumoFichaTecnica,
    alternarDestaqueServico
} from "@/app/actions/servico";
import { listarProdutosAdmin } from "@/app/actions/produto";
import AdminHeader from "@/components/admin/AdminHeader";
import { ServicoRow } from "@/components/admin/servico-row";
import { Loader2, Search, X } from "lucide-react";

// 1. Definição de Tipos
type Insumo = {
    id: string;
    quantidadeUsada: number;
    produto: {
        id?: string;
        nome: string;
        unidadeMedida: string;
    };
};

type Servico = {
    id: string;
    nome: string;
    descricao: string | null;
    preco: number | null;
    tempoMinutos: number | null;
    imagemUrl: string | null;
    destaque: boolean;
    insumos: Insumo[];
};

type Produto = {
    id: string;
    nome: string;
    unidadeMedida: string;
};

export default function PainelServicosPage() {
    const [servicos, setServicos] = useState<Servico[]>([]);
    const [produtos, setProdutos] = useState<Produto[]>([]);
    const [busca, setBusca] = useState("");
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalFichaTecnica, setModalFichaTecnica] = useState<Servico | null>(null);

    const [imagemArquivo, setImagemArquivo] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [loadingAcao, setLoadingAcao] = useState(false);

    const [formData, setFormData] = useState({
        nome: "", descricao: "", preco: "", tempoMinutos: "", imagemUrl: "",
    });

    const [novoInsumo, setNovoInsumo] = useState({ produtoId: "", quantidadeUsada: "" });

    useEffect(() => {
        const carregarTudo = async () => {
            setLoading(true);
            const [resServicos, resProdutos] = await Promise.all([
                listarServicosAdmin(),
                listarProdutosAdmin()
            ]);

            if (resServicos.sucesso && resServicos.servicos) {
                setServicos(resServicos.servicos as Servico[]);
            }
            if (resProdutos.sucesso && resProdutos.produtos) {
                setProdutos(resProdutos.produtos);
            }
            setLoading(false);
        };
        carregarTudo();
    }, []);

    const recarregarServicosManualmente = async () => {
        const res = await listarServicosAdmin();
        if (res.sucesso && res.servicos) {
            setServicos(res.servicos as Servico[]);
            setModalFichaTecnica(prevModal => {
                if (prevModal) {
                    const atualizado = res.servicos?.find((s: Servico) => s.id === prevModal.id);
                    return (atualizado as Servico) || null;
                }
                return null;
            });
        }
    };

    const handleSalvarServico = async (e: React.FormEvent) => {
        e.preventDefault();
        setUploading(true);

        let urlFinal = "";
        if (imagemArquivo) {
            const data = new FormData();
            data.append("file", imagemArquivo);

            try {
                const resUpload = await fetch("/api/upload", { method: "POST", body: data });
                const uploadResult = await resUpload.json();

                if (uploadResult.url) {
                    urlFinal = uploadResult.url;
                } else {
                    alert("Erro ao subir a imagem.");
                    setUploading(false);
                    return;
                }
            } catch (error) {
                console.error(error);
                alert("Erro técnico no upload.");
                setUploading(false);
                return;
            }
        }

        const res = await criarServicoAdmin({ ...formData, imagemUrl: urlFinal });

        if (res.sucesso) {
            setIsModalOpen(false);
            setImagemArquivo(null);
            setFormData({ nome: "", descricao: "", preco: "", tempoMinutos: "", imagemUrl: "" });
            recarregarServicosManualmente();
        } else {
            alert(res.erro);
        }
        setUploading(false);
    };

    const handleSalvarInsumo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!modalFichaTecnica || !novoInsumo.produtoId) return;
        setLoadingAcao(true);

        const res = await adicionarInsumoFichaTecnica(modalFichaTecnica.id, novoInsumo.produtoId, Number(novoInsumo.quantidadeUsada));

        if (res.sucesso) {
            setNovoInsumo({ produtoId: "", quantidadeUsada: "" });
            recarregarServicosManualmente();
        } else alert(res.erro);

        setLoadingAcao(false);
    };

    const handleRemoverInsumo = async (idInsumo: string) => {
        setLoadingAcao(true);
        const res = await removerInsumoFichaTecnica(idInsumo);
        if (res.sucesso) recarregarServicosManualmente();
        else alert(res.erro);
        setLoadingAcao(false);
    };

    const handleToggleDestaque = async (id: string, destaqueAtual: boolean) => {
        const res = await alternarDestaqueServico(id, !destaqueAtual);
        if (res.sucesso) recarregarServicosManualmente();
        else alert(res.erro);
    };

    const produtoSelecionado = produtos.find(p => p.id === novoInsumo.produtoId);
    const servicosFiltrados = servicos.filter(s => s.nome.toLowerCase().includes(busca.toLowerCase()));

    return (
        <div className="min-h-screen bg-background font-sans">
            <AdminHeader
                titulo="Portfólio de Serviços"
                subtitulo="Catálogo, Fichas Técnicas e Custos Internos (Insumos)."
                abaAtiva="Serviços"
                botaoAcao={
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors shadow-sm active:scale-[0.98]"
                    >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                            <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        Novo Serviço
                    </button>
                }
            />

            <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-6 pb-12 mt-6">

                {/* Campo de Pesquisa Premium */}
                <div className="relative bg-white rounded-xl shadow-sm border border-border p-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Buscar serviço por nome..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-transparent text-sm outline-none focus:ring-0 transition-all text-foreground"
                    />
                </div>

                {/* Tabela de Serviços (Progressive Disclosure) */}
                <section className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
                    <div className="hidden border-b border-border bg-muted/50 px-4 py-3 sm:flex sm:px-6">
                        <span className="w-10"></span> {/* Espaço do Ícone */}
                        <span className="ml-4 flex-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Serviço & Tempo</span>
                        <span className="mr-8 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Valor de Venda</span>
                        <span className="w-5"></span> {/* Espaço do Chevron */}
                    </div>

                    {loading ? (
                        <div className="p-12 text-center text-muted-foreground font-bold tracking-wider uppercase text-sm flex flex-col items-center justify-center gap-3">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            A carregar catálogo...
                        </div>
                    ) : servicosFiltrados.length === 0 ? (
                        <div className="p-12 text-center text-muted-foreground text-sm">
                            Nenhum serviço encontrado. Tente ajustar a busca.
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {servicosFiltrados.map((servico) => (
                                <ServicoRow
                                    key={servico.id}
                                    servico={servico}
                                    onEditar={(id) => alert(`Lógica de editar ID ${id} (Em breve)`)}
                                    onAlternarDestaque={(id, atual) => handleToggleDestaque(id, atual)}
                                    onAdicionarInsumo={() => setModalFichaTecnica(servico)} // Reaproveitando seu modal atual
                                    onRemoverInsumo={(idInsumo) => handleRemoverInsumo(idInsumo)}
                                />
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {/* ── MODAL: NOVO SERVIÇO ── */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity">
                    <div className="bg-card p-8 rounded-2xl shadow-2xl w-full max-w-lg border-t-4 border-t-primary animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-start mb-6 border-b border-border pb-4">
                            <div>
                                <h2 className="text-2xl font-bold text-foreground tracking-tight">Novo Serviço</h2>
                                <p className="text-sm text-muted-foreground mt-1">Crie um novo serviço para sua vitrine.</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSalvarServico} className="space-y-5">
                            <div>
                                <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Nome do Serviço *</label>
                                <input required type="text" className="w-full border border-border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Descrição</label>
                                <textarea className="w-full border border-border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none transition-all" rows={3} value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Preço (R$) *</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-muted-foreground text-sm">R$</span>
                                        <input required type="number" step="0.01" min="0" className="w-full pl-10 pr-4 py-3 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none font-black text-primary transition-all" value={formData.preco} onChange={(e) => setFormData({ ...formData, preco: e.target.value })} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Tempo (Min) *</label>
                                    <input required type="number" min="1" className="w-full px-4 py-3 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none font-black transition-all" value={formData.tempoMinutos} onChange={(e) => setFormData({ ...formData, tempoMinutos: e.target.value })} />
                                </div>
                            </div>
                            <div className="p-4 bg-muted/30 border border-border rounded-xl">
                                <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Foto de Vitrine</label>
                                <input type="file" accept="image/*" className="w-full text-sm text-muted-foreground file:mr-4 file:py-2.5 file:px-5 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-all cursor-pointer" onChange={(e) => { if (e.target.files?.[0]) setImagemArquivo(e.target.files[0]); }} />
                            </div>
                            <div className="flex justify-end pt-4 gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-3 text-muted-foreground font-bold hover:bg-muted rounded-lg transition-colors text-sm">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={uploading} className="px-6 py-3 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50">
                                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                    {uploading ? "A Gravar..." : "Lançar no Catálogo"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── MODAL: FICHA TÉCNICA (INSUMOS) ── */}
            {modalFichaTecnica && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg border-t-4 border-t-primary overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                        <div className="px-6 md:px-8 py-6 border-b border-border flex justify-between items-start bg-muted/30">
                            <div>
                                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Ficha Técnica</p>
                                <h2 className="text-xl font-bold text-foreground tracking-tight">{modalFichaTecnica.nome}</h2>
                            </div>
                            <button type="button" onClick={() => setModalFichaTecnica(null)} className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-6">
                            <form onSubmit={handleSalvarInsumo} className="flex flex-col gap-4 p-5 bg-secondary/50 border border-secondary rounded-xl">
                                <h4 className="font-bold text-foreground text-sm">Adicionar Produto</h4>
                                <div className="flex items-end gap-3 flex-wrap sm:flex-nowrap">
                                    <div className="flex-1 w-full sm:w-auto">
                                        <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Produto do Estoque</label>
                                        <select required className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20" value={novoInsumo.produtoId} onChange={e => setNovoInsumo({ ...novoInsumo, produtoId: e.target.value })}>
                                            <option value="">Selecione...</option>
                                            {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                                        </select>
                                    </div>
                                    <div className="w-24">
                                        <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Qtd</label>
                                        <input required type="number" min="1" className="w-full border border-border bg-card rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-bold" value={novoInsumo.quantidadeUsada} onChange={e => setNovoInsumo({ ...novoInsumo, quantidadeUsada: e.target.value })} />
                                    </div>
                                    <div className="flex items-center gap-2 mb-1 w-full sm:w-auto justify-end sm:justify-start">
                                        <span className="text-[10px] font-bold text-muted-foreground min-w-[20px] uppercase tracking-widest text-center">
                                            {produtoSelecionado ? produtoSelecionado.unidadeMedida : '-'}
                                        </span>
                                        <button type="submit" disabled={loadingAcao || !novoInsumo.produtoId} className="bg-primary text-primary-foreground h-10 w-10 flex items-center justify-center rounded-lg font-bold hover:bg-primary/90 disabled:opacity-50 text-xl transition-colors">
                                            {loadingAcao ? <Loader2 className="w-4 h-4 animate-spin" /> : "+"}
                                        </button>
                                    </div>
                                </div>
                            </form>

                            <div>
                                <h4 className="font-bold text-foreground mb-4 border-b border-border pb-2 text-sm uppercase tracking-widest">Custo Interno Configurado</h4>
                                {(!modalFichaTecnica.insumos || modalFichaTecnica.insumos.length === 0) ? (
                                    <p className="text-sm text-muted-foreground italic text-center py-6 bg-muted/30 rounded-xl border border-border/50 shadow-sm">
                                        Sem insumos atrelados. O serviço é apenas mão de obra?
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        {modalFichaTecnica.insumos.map((insumo: Insumo) => (
                                            <div key={insumo.id} className="flex justify-between items-center p-4 bg-card border border-border rounded-xl shadow-sm hover:border-primary/30 transition-colors">
                                                <span className="font-bold text-sm text-foreground">{insumo.produto.nome}</span>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-base font-black text-primary">
                                                        {insumo.quantidadeUsada} <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{insumo.produto.unidadeMedida}</span>
                                                    </span>
                                                    <button onClick={() => handleRemoverInsumo(insumo.id)} disabled={loadingAcao} className="text-destructive hover:bg-destructive/10 p-2 rounded-lg transition-colors disabled:opacity-50" title="Remover insumo">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}