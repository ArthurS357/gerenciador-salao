"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
    listarServicosAdmin,
    criarServicoAdmin,
    adicionarInsumoFichaTecnica,
    removerInsumoFichaTecnica,
    alternarDestaqueServico
} from "@/app/actions/servico";
import { listarProdutosAdmin } from "@/app/actions/produto";

// 1. Definição de Tipos para substituir 'any'
type Insumo = {
    id: string;
    quantidadeUsada: number;
    produto: {
        id?: string; // CORREÇÃO: Tornado opcional para coincidir com o retorno do backend
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
        const carregarServicos = async () => {
            const res = await listarServicosAdmin();
            if (res.sucesso && res.servicos) {
                setServicos(res.servicos as Servico[]);
                setModalFichaTecnica(prevModal => {
                    if (prevModal) {
                        const atualizado = res.servicos.find((s: Servico) => s.id === prevModal.id);
                        return (atualizado as Servico) || null;
                    }
                    return null;
                });
            }
        };

        const carregarProdutos = async () => {
            const res = await listarProdutosAdmin();
            if (res.sucesso && res.produtos) setProdutos(res.produtos);
        };

        carregarServicos();
        carregarProdutos();
    }, []);

    const recarregarServicosManualmente = async () => {
        const res = await listarServicosAdmin();
        if (res.sucesso && res.servicos) {
            setServicos(res.servicos as Servico[]);
            setModalFichaTecnica(prevModal => {
                if (prevModal) {
                    const atualizado = res.servicos.find((s: Servico) => s.id === prevModal.id);
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

    const imagePlaceholder = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25'%3E%3Crect width='100%25' height='100%25' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' fill='%239ca3af' font-family='sans-serif' font-size='14' font-weight='bold' text-anchor='middle' dy='.3em'%3ESem Foto%3C/text%3E%3C/svg%3E";
    const produtoSelecionado = produtos.find(p => p.id === novoInsumo.produtoId);

    const servicosFiltrados = servicos.filter(s => s.nome.toLowerCase().includes(busca.toLowerCase()));

    return (
        <div className="min-h-screen bg-[#fdfbf7] p-8 font-sans">
            {/* Topo com navegação */}
            <div className="max-w-7xl mx-auto mb-8 px-4 md:px-0">
                <header className="mb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-4 mt-8 md:mt-0 pt-8">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-marrom-medio tracking-tight">Portfólio de Serviços</h1>
                        <p className="text-gray-500 mt-2 text-sm md:text-base">Catálogo, Fichas Técnicas e Custos Internos.</p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center justify-center gap-2 bg-marrom-medio text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-[#3e2b22] transition-colors shadow-sm active:scale-[0.98]"
                    >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                            <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        Novo Serviço
                    </button>
                </header>

                <nav className="flex flex-wrap gap-2 md:gap-3 p-1 md:p-1.5 bg-gray-100/60 backdrop-blur rounded-2xl w-fit">
                    {[
                        { href: '/admin/dashboard', label: 'Equipe' },
                        { href: '/admin/financeiro', label: 'Financeiro' },
                        { href: '/admin/estoque', label: 'Estoque' },
                        { href: '/admin/servicos', label: 'Serviços', ativo: true },
                        { href: '/admin/agendamentos', label: 'Agendamentos' },
                        { href: '/admin/clientes', label: 'Clientes' },
                    ].map(({ href, label, ativo }) => (
                        <Link
                            key={href}
                            href={href}
                            className={
                                ativo
                                    ? 'bg-white text-marrom-medio px-5 py-2 md:py-2.5 rounded-xl shadow-sm font-bold text-[13px] md:text-sm tracking-wide'
                                    : 'text-gray-500 px-5 py-2 md:py-2.5 rounded-xl font-semibold text-[13px] md:text-sm tracking-wide hover:bg-white/50 hover:text-gray-900 transition-all'
                            }
                        >
                            {label}
                        </Link>
                    ))}
                </nav>
            </div>

            <div className="max-w-7xl mx-auto mb-8 px-4 md:px-0 bg-transparent flex items-center justify-between gap-3">
                <div className="relative w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-100">
                    <input
                        type="text"
                        placeholder="Buscar serviço por nome..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 text-sm border-transparent rounded-xl outline-none focus:border-marrom-claro focus:ring-4 focus:ring-marrom-claro/10 transition-all"
                    />
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 md:px-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
                {servicosFiltrados.length === 0 ? (
                    <div className="col-span-full p-16 bg-white rounded-2xl border border-dashed border-gray-200 text-center flex flex-col items-center justify-center">
                        <svg className="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                        <p className="text-gray-500 font-bold text-lg">Nenhum serviço encontrado na pesquisa.</p>
                    </div>
                ) : (
                    servicosFiltrados.map((s) => (
                        <div key={s.id} className="relative bg-white rounded-[20px] shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 group flex flex-col">

                            <button
                                onClick={() => handleToggleDestaque(s.id, s.destaque)}
                                className={`absolute top-3 right-3 z-10 p-2 rounded-full backdrop-blur-md transition-all shadow-sm ${s.destaque ? 'bg-yellow-400 text-white scale-110' : 'bg-white/70 text-gray-500 hover:bg-white hover:scale-110'}`}
                                title={s.destaque ? "Remover Destaque da Galeria" : "Destacar na Galeria"}
                            >
                                <svg width="18" height="18" fill={s.destaque ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                </svg>
                            </button>

                            <div className="relative h-48 w-full bg-gray-100 overflow-hidden">
                                <Image
                                    src={s.imagemUrl || imagePlaceholder}
                                    alt={s.nome}
                                    fill
                                    unoptimized
                                    className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-60"></div>
                                <div className="absolute bottom-3 left-3 text-white">
                                    <span className="font-black text-lg tracking-wide drop-shadow-md">
                                        {s.preco ? `R$ ${s.preco.toFixed(2)}` : "Sob Consulta"}
                                    </span>
                                </div>
                            </div>

                            <div className="p-5 flex flex-col flex-1">
                                <h3 className="text-lg font-bold text-gray-800 leading-tight line-clamp-1 mt-1">{s.nome}</h3>
                                <p className="text-xs text-gray-500 line-clamp-2 mt-1.5 flex-1 min-h-[32px]">
                                    {s.descricao || <span className="italic opacity-50">Sem descrição detalhada.</span>}
                                </p>

                                <div className="mt-4 flex justify-between items-center border-t border-gray-100 pt-4">
                                    {s.tempoMinutos ? (
                                        <div className="flex items-center gap-1.5 text-gray-500">
                                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                                            <span className="text-[11px] font-bold uppercase tracking-widest">{s.tempoMinutos} min</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 text-gray-500">
                                            <span className="text-[11px] font-bold uppercase tracking-widest">Sem Tempo Fixo</span>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => setModalFichaTecnica(s)}
                                        className="py-1.5 px-3 bg-marrom-medio/5 text-marrom-medio hover:bg-marrom-medio hover:text-white border border-marrom-medio/20 text-[11px] font-bold uppercase tracking-widest rounded-lg transition-colors"
                                    >
                                        Ficha Técnica ({s.insumos?.length || 0})
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 z-50 transition-opacity">
                    <div className="bg-white p-8 rounded-[24px] shadow-2xl w-full max-w-lg border border-gray-100 transform transition-transform animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-4">
                            <div>
                                <h2 className="text-2xl font-bold text-marrom-medio tracking-tight">Novo Serviço</h2>
                                <p className="text-sm text-gray-500 mt-1">Crie um novo serviço para sua vitrine.</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition-colors">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleSalvarServico} className="space-y-5">
                            <div>
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Nome do Serviço *</label>
                                <input required type="text" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-4 focus:ring-marrom-claro/10 focus:border-marrom-claro outline-none font-medium text-gray-800 transition-all" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Descrição</label>
                                <textarea className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-4 focus:ring-marrom-claro/10 focus:border-marrom-claro outline-none resize-none font-medium text-gray-800 transition-all" rows={3} value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Preço (R$) *</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-sm">R$</span>
                                        <input required type="number" step="0.01" min="0" className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-4 focus:ring-marrom-claro/10 focus:border-marrom-claro outline-none font-black text-marrom-claro transition-all" value={formData.preco} onChange={(e) => setFormData({ ...formData, preco: e.target.value })} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Tempo (Min) *</label>
                                    <input required type="number" min="1" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-4 focus:ring-marrom-claro/10 focus:border-marrom-claro outline-none font-black text-gray-800 transition-all" value={formData.tempoMinutos} onChange={(e) => setFormData({ ...formData, tempoMinutos: e.target.value })} />
                                </div>
                            </div>
                            <div className="p-5 bg-gray-50 border border-gray-200 rounded-2xl">
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Foto de Vitrine</label>
                                <input type="file" accept="image/*" className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-marrom-claro/10 file:text-marrom-claro hover:file:bg-marrom-claro/20 transition-all cursor-pointer" onChange={(e) => { if (e.target.files?.[0]) setImagemArquivo(e.target.files[0]); }} />
                            </div>
                            <div className="flex justify-end pt-4">
                                <button type="submit" disabled={uploading} className="w-full px-6 py-3.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-colors shadow-lg shadow-black/10 flex items-center justify-center gap-2">
                                    {uploading ? "A Gravar..." : "Lançar no Catálogo"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {modalFichaTecnica && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 backdrop-blur-md">
                    <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-lg border border-gray-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                        <div className="px-8 pt-8 pb-5 border-b border-gray-100 flex justify-between items-start">
                            <div>
                                <p className="text-[10px] font-bold text-marrom-claro uppercase tracking-widest mb-1">Ficha Técnica</p>
                                <h2 className="text-xl font-bold text-gray-800 tracking-tight">{modalFichaTecnica.nome}</h2>
                                <p className="text-sm text-gray-500 mt-1">Configure o consumo de produtos por serviço.</p>
                            </div>
                            <button type="button" onClick={() => setModalFichaTecnica(null)} className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition-colors">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-8 overflow-y-auto flex-1 space-y-6">
                            <form onSubmit={handleSalvarInsumo} className="flex flex-col gap-4 p-5 bg-orange-50/50 border border-orange-100 rounded-2xl">
                                <h4 className="font-bold text-marrom-medio text-sm">Adicionar Insumo</h4>
                                <div className="flex items-end gap-3">
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2">Produto</label>
                                        <select required className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-marrom-claro" value={novoInsumo.produtoId} onChange={e => setNovoInsumo({ ...novoInsumo, produtoId: e.target.value })}>
                                            <option value="">Selecione do estoque...</option>
                                            {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                                        </select>
                                    </div>
                                    <div className="w-24">
                                        <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2">Qtd</label>
                                        <input required type="number" min="1" className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-marrom-claro font-bold" value={novoInsumo.quantidadeUsada} onChange={e => setNovoInsumo({ ...novoInsumo, quantidadeUsada: e.target.value })} />
                                    </div>
                                    <span className="text-[11px] font-bold text-gray-500 mb-3 min-w-[20px] uppercase tracking-widest">{produtoSelecionado ? produtoSelecionado.unidadeMedida : '-'}</span>
                                    <button type="submit" disabled={loadingAcao || !novoInsumo.produtoId} className="bg-marrom-claro text-white h-10 w-10 flex items-center justify-center rounded-xl font-bold hover:bg-[#704620] disabled:opacity-50 text-xl transition-colors">+</button>
                                </div>
                            </form>
                            <div>
                                <h4 className="font-bold text-gray-800 mb-4 border-b pb-3">Insumos Configurados</h4>
                                {(!modalFichaTecnica.insumos || modalFichaTecnica.insumos.length === 0) ? (
                                    <p className="text-sm text-gray-500 italic text-center py-6 bg-gray-50 rounded-2xl">Nenhum custo interno atrelado.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {modalFichaTecnica.insumos.map((insumo: Insumo) => (
                                            <div key={insumo.id} className="flex justify-between items-center p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
                                                <span className="font-bold text-sm text-gray-700">{insumo.produto.nome}</span>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-base font-black text-marrom-claro">{insumo.quantidadeUsada} <span className="text-[10px] text-gray-500 uppercase tracking-widest">{insumo.produto.unidadeMedida}</span></span>
                                                    <button onClick={() => handleRemoverInsumo(insumo.id)} disabled={loadingAcao} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-full transition-colors disabled:opacity-50" title="Remover insumo">
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
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