"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image"; // Correção: Importar next/image
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
        id: string;
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

    // 2. Correção: Funções movidas para dentro do useEffect para resolver erro de declaração e dependências
    useEffect(() => {
        const carregarServicos = async () => {
            const res = await listarServicosAdmin();
            if (res.sucesso && res.servicos) {
                setServicos(res.servicos);
                // Verifica se o modal está aberto e atualiza os dados dele em tempo real
                setModalFichaTecnica(prevModal => {
                    if (prevModal) {
                        const atualizado = res.servicos.find((s: Servico) => s.id === prevModal.id);
                        return atualizado || null;
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
    }, []); // Array vazio é correto aqui pois as funções estão definidas dentro

    // Função exposta para ser chamada manualmente (ex: após salvar)
    const recarregarServicosManualmente = async () => {
        const res = await listarServicosAdmin();
        if (res.sucesso && res.servicos) {
            setServicos(res.servicos);
            setModalFichaTecnica(prevModal => {
                if (prevModal) {
                    const atualizado = res.servicos.find((s: Servico) => s.id === prevModal.id);
                    return atualizado || null;
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

                if (uploadResult.url) { // Ajuste para 'url' que é mais comum, verifique sua API
                    urlFinal = uploadResult.url;
                } else {
                    alert("Erro ao subir a imagem.");
                    setUploading(false);
                    return;
                }
            } catch (error) { // Removido warning de variável não usada
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

    // Ficha Técnica
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

    // Alternar Destaque
    const handleToggleDestaque = async (id: string, destaqueAtual: boolean) => {
        const res = await alternarDestaqueServico(id, !destaqueAtual);
        if (res.sucesso) recarregarServicosManualmente();
        else alert(res.erro);
    };

    const imagePlaceholder = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25'%3E%3Crect width='100%25' height='100%25' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' fill='%239ca3af' font-family='sans-serif' font-size='14' font-weight='bold' text-anchor='middle' dy='.3em'%3ESem Foto%3C/text%3E%3C/svg%3E";
    const produtoSelecionado = produtos.find(p => p.id === novoInsumo.produtoId);

    // Filtro da Busca
    const servicosFiltrados = servicos.filter(s => s.nome.toLowerCase().includes(busca.toLowerCase()));

    return (
        <div className="min-h-screen bg-[#fdfbf7] p-8 font-sans">
            <header className="mb-6 border-b-2 border-[#5C4033] pb-4 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-[#5C4033]">Portfólio de Serviços</h1>
                    <p className="text-gray-500 mt-1">Catálogo e Fichas Técnicas (Custos Internos)</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-[#8B5A2B] text-white px-4 py-2 rounded font-bold hover:bg-[#704620] shadow-sm transition-colors"
                >
                    + Novo Serviço
                </button>
            </header>

            <nav className="flex flex-wrap gap-3 mb-8">
                <Link href='/admin/dashboard' className="bg-white text-[#5C4033] border border-[#e5d9c5] px-5 py-2 rounded shadow-sm font-bold text-sm hover:border-[#8B5A2B]">Equipa (Atual)</Link>
                <Link href='/admin/financeiro' className="bg-white text-[#5C4033] border border-[#e5d9c5] px-5 py-2 rounded shadow-sm font-bold text-sm hover:border-[#8B5A2B]">Financeiro</Link>
                <Link href='/admin/estoque' className="bg-white text-[#5C4033] border border-[#e5d9c5] px-5 py-2 rounded shadow-sm font-bold text-sm hover:border-[#8B5A2B]">Estoque</Link>
                <Link href='/admin/servicos' className="bg-[#5C4033] text-white px-5 py-2 rounded shadow font-bold text-sm">Portfólio / Serviços</Link>
                <Link href='/admin/agendamentos' className="bg-white text-[#5C4033] border border-[#e5d9c5] px-5 py-2 rounded shadow-sm font-bold text-sm hover:border-[#8B5A2B]">Agendamentos Globais</Link>
                <Link href='/admin/clientes' className="bg-white text-[#5C4033] border border-[#e5d9c5] px-5 py-2 rounded shadow-sm font-bold text-sm hover:border-[#8B5A2B]">Base de Clientes</Link>
            </nav>

            {/* Barra de Busca */}
            <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-[#e5d9c5]">
                <input
                    type="text"
                    placeholder="Buscar serviço por nome..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded outline-none focus:border-[#8B5A2B]"
                />
            </div>

            {/* Grid de Serviços */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {servicosFiltrados.length === 0 ? (
                    <div className="col-span-full p-12 bg-white rounded-lg border border-dashed border-[#e5d9c5] text-center">
                        <p className="text-gray-500 font-medium">Nenhum serviço encontrado.</p>
                    </div>
                ) : (
                    servicosFiltrados.map((s) => (
                        <div key={s.id} className="bg-white rounded-xl shadow-sm border border-[#e5d9c5] overflow-hidden hover:shadow-md transition-shadow group flex flex-col relative">

                            {/* Botão de Estrela */}
                            <button
                                onClick={() => handleToggleDestaque(s.id, s.destaque)}
                                className={`absolute top-2 right-2 z-10 p-1.5 rounded-full backdrop-blur-md transition-colors shadow-sm ${s.destaque ? 'bg-yellow-400 text-white' : 'bg-white/70 text-gray-500 hover:bg-white'}`}
                                title={s.destaque ? "Remover Destaque da Galeria" : "Destacar na Galeria"}
                            >
                                <svg width="16" height="16" fill={s.destaque ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                </svg>
                            </button>

                            {/* 3. Correção: next/image com layout fill */}
                            <div className="relative h-32 w-full bg-gray-100 overflow-hidden">
                                <Image
                                    src={s.imagemUrl || imagePlaceholder}
                                    alt={s.nome}
                                    fill
                                    unoptimized // Necessário para URLs externas ou data URIs sem config de domínios
                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                            </div>

                            <div className="p-4 flex flex-col flex-1">
                                <h3 className="text-base font-bold text-gray-800 leading-tight line-clamp-1">{s.nome}</h3>
                                <p className="text-[11px] text-gray-500 line-clamp-2 mt-1 flex-1">
                                    {s.descricao || <span className="italic opacity-50">Sem descrição.</span>}
                                </p>

                                <div className="mt-3 flex justify-between items-center border-t border-gray-100 pt-3">
                                    <span className="font-black text-[#5C4033] text-sm">
                                        {s.preco ? `R$ ${s.preco.toFixed(2)}` : "Sob Consulta"}
                                    </span>
                                    {s.tempoMinutos && (
                                        <span className="text-[10px] bg-orange-50 border border-orange-100 text-[#8B5A2B] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                                            ⏱ {s.tempoMinutos} min
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => setModalFichaTecnica(s)}
                                    className="mt-3 w-full py-1.5 bg-gray-50 text-gray-700 text-xs font-bold border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    Ficha Técnica ({s.insumos?.length || 0})
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* MODAL: Criação de Serviço */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-lg border-t-4 border-[#5C4033] transform transition-transform">
                        <h2 className="text-2xl font-bold text-[#5C4033] mb-6">Cadastrar Novo Serviço</h2>
                        <form onSubmit={handleSalvarServico} className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Nome do Serviço *</label>
                                <input required type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:border-[#8B5A2B] outline-none" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Descrição</label>
                                <textarea className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:border-[#8B5A2B] outline-none resize-none" rows={3} value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Preço (R$) *</label>
                                    <input required type="number" step="0.01" min="0" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:border-[#8B5A2B] outline-none" value={formData.preco} onChange={(e) => setFormData({ ...formData, preco: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Tempo (Min) *</label>
                                    <input required type="number" min="1" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:border-[#8B5A2B] outline-none" value={formData.tempoMinutos} onChange={(e) => setFormData({ ...formData, tempoMinutos: e.target.value })} />
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Foto de Vitrine</label>
                                <input type="file" accept="image/*" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-[#8B5A2B]/10 file:text-[#8B5A2B] hover:file:bg-[#8B5A2B]/20 transition-all cursor-pointer" onChange={(e) => { if (e.target.files?.[0]) setImagemArquivo(e.target.files[0]); }} />
                            </div>
                            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setIsModalOpen(false)} disabled={uploading} className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
                                <button type="submit" disabled={uploading} className="px-6 py-2.5 bg-[#5C4033] text-white font-bold rounded-lg hover:bg-[#3e2b22] transition-all flex items-center gap-2">
                                    {uploading ? "A Salvar..." : "Gravar no Catálogo"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: Ficha Técnica */}
            {modalFichaTecnica && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border-t-4 border-[#8B5A2B] overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-8 pt-8 pb-4 border-b border-gray-100">
                            <p className="text-xs font-semibold text-[#8B5A2B] uppercase tracking-wider mb-1">Ficha Técnica</p>
                            <h2 className="text-xl font-bold text-gray-800">{modalFichaTecnica.nome}</h2>
                            <p className="text-sm text-gray-500 mt-1">Configure os insumos descontados automaticamente do estoque ao realizar este serviço.</p>
                        </div>
                        <div className="p-8 overflow-y-auto flex-1 space-y-6">
                            <form onSubmit={handleSalvarInsumo} className="flex flex-col gap-3 p-4 bg-orange-50/50 border border-orange-100 rounded-xl">
                                <h4 className="font-bold text-[#5C4033] text-sm">Adicionar Insumo</h4>
                                <div className="flex items-end gap-2">
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1">Produto</label>
                                        <select required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#8B5A2B]" value={novoInsumo.produtoId} onChange={e => setNovoInsumo({ ...novoInsumo, produtoId: e.target.value })}>
                                            <option value="">Selecione do estoque...</option>
                                            {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                                        </select>
                                    </div>
                                    <div className="w-24">
                                        <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1">Consumo</label>
                                        <input required type="number" min="1" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#8B5A2B]" value={novoInsumo.quantidadeUsada} onChange={e => setNovoInsumo({ ...novoInsumo, quantidadeUsada: e.target.value })} />
                                    </div>
                                    <span className="text-xs font-bold text-gray-500 mb-2.5 min-w-[20px]">{produtoSelecionado ? produtoSelecionado.unidadeMedida : '-'}</span>
                                    <button type="submit" disabled={loadingAcao || !novoInsumo.produtoId} className="bg-[#8B5A2B] text-white px-4 py-2 rounded-lg font-bold hover:bg-[#704620] disabled:opacity-50 text-sm">+</button>
                                </div>
                            </form>
                            <div>
                                <h4 className="font-bold text-gray-800 mb-3 border-b pb-2">Insumos Configurados</h4>
                                {(!modalFichaTecnica.insumos || modalFichaTecnica.insumos.length === 0) ? (
                                    <p className="text-sm text-gray-500 italic text-center py-4 bg-gray-50 rounded-lg">Nenhum custo interno atrelado.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {/* 4. Correção: Tipagem explícita no map */}
                                        {modalFichaTecnica.insumos.map((insumo: Insumo) => (
                                            <div key={insumo.id} className="flex justify-between items-center p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                                                <span className="font-semibold text-sm text-gray-700">{insumo.produto.nome}</span>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-sm font-black text-[#8B5A2B]">{insumo.quantidadeUsada} <span className="text-xs text-gray-500 font-bold">{insumo.produto.unidadeMedida}</span></span>
                                                    <button onClick={() => handleRemoverInsumo(insumo.id)} disabled={loadingAcao} className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors disabled:opacity-50" title="Remover insumo">✕</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                            <button type="button" onClick={() => setModalFichaTecnica(null)} className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 font-bold hover:bg-gray-100 rounded-lg transition-colors">Fechar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}