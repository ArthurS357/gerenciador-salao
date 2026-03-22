"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { listarServicosAdmin, criarServicoAdmin } from "@/app/actions/servico";

export default function PainelServicosPage() {
    const [servicos, setServicos] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [imagemArquivo, setImagemArquivo] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    const [formData, setFormData] = useState({
        nome: "",
        descricao: "",
        preco: "",
        tempoMinutos: "",
        imagemUrl: "",
    });

    useEffect(() => {
        carregarServicos();
    }, []);

    const carregarServicos = async () => {
        const res = await listarServicosAdmin();
        if (res.sucesso) setServicos(res.servicos);
    };

    const handleSalvarServico = async (e: React.FormEvent) => {
        e.preventDefault();
        setUploading(true);

        let urlFinal = "";

        // Upload da imagem (se existir)
        if (imagemArquivo) {
            const data = new FormData();
            data.append("file", imagemArquivo);

            const resUpload = await fetch("/api/upload", {
                method: "POST",
                body: data,
            });

            const uploadResult = await resUpload.json();

            if (uploadResult.sucesso) {
                urlFinal = uploadResult.url;
            } else {
                alert("Erro ao subir a imagem.");
                setUploading(false);
                return;
            }
        }

        const res = await criarServicoAdmin({
            ...formData,
            imagemUrl: urlFinal,
        });

        if (res.sucesso) {
            setIsModalOpen(false);
            setImagemArquivo(null);

            // Reset do formulário
            setFormData({
                nome: "",
                descricao: "",
                preco: "",
                tempoMinutos: "",
                imagemUrl: "",
            });

            carregarServicos();
        } else {
            alert(res.erro);
        }

        setUploading(false);
    };

    // Placeholder seguro caso não tenha foto
    const imagePlaceholder = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25'%3E%3Crect width='100%25' height='100%25' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' fill='%239ca3af' font-family='sans-serif' font-size='14' font-weight='bold' text-anchor='middle' dy='.3em'%3ESem Foto%3C/text%3E%3C/svg%3E";

    return (
        <div className="min-h-screen bg-[#fdfbf7] p-8 font-sans">
            <header className="mb-6 border-b-2 border-[#5C4033] pb-4 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-[#5C4033]">
                        Portfólio de Serviços
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Catálogo da Vitrine (Visível para Clientes)
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-[#8B5A2B] text-white px-4 py-2 rounded font-bold hover:bg-[#704620] shadow-sm transition-colors"
                >
                    + Novo Serviço
                </button>
            </header>

            {/* Navegação Horizontal Uniforme do Admin */}
            <nav className="flex flex-wrap gap-3 mb-8">
                {[
                    { href: '/admin/dashboard', label: 'Equipa (Atual)' },
                    { href: '/admin/financeiro', label: 'Financeiro' },
                    { href: '/admin/estoque', label: 'Estoque de Produtos' },
                    { href: '/admin/servicos', label: 'Portfólio / Serviços', ativo: true },
                    { href: '/admin/agendamentos', label: 'Agendamentos Globais' },
                    { href: '/admin/clientes', label: 'Base de Clientes' },
                ].map(({ href, label, ativo }) => (
                    <Link
                        key={href}
                        href={href}
                        className={
                            ativo
                                ? 'bg-[#5C4033] text-white px-5 py-2 rounded shadow font-bold text-sm'
                                : 'bg-white text-[#5C4033] border border-[#e5d9c5] px-5 py-2 rounded shadow-sm font-bold text-sm hover:border-[#8B5A2B] hover:bg-orange-50 transition-colors'
                        }
                    >
                        {label}
                    </Link>
                ))}
            </nav>

            {/* Grid de Serviços */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {servicos.length === 0 ? (
                    <div className="col-span-full p-12 bg-white rounded-lg border border-dashed border-[#e5d9c5] text-center">
                        <p className="text-gray-500 font-medium">Nenhum serviço cadastrado.</p>
                        <button onClick={() => setIsModalOpen(true)} className="mt-4 text-[#8B5A2B] font-bold hover:underline">
                            Clique aqui para criar o primeiro.
                        </button>
                    </div>
                ) : (
                    servicos.map((s) => (
                        <div
                            key={s.id}
                            className="bg-white rounded-xl shadow-sm border border-[#e5d9c5] overflow-hidden hover:shadow-md transition-shadow group flex flex-col"
                        >
                            <div className="relative h-48 w-full bg-gray-100 overflow-hidden">
                                <img
                                    src={s.imagemUrl || imagePlaceholder}
                                    alt={s.nome}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                            </div>

                            <div className="p-5 flex flex-col flex-1">
                                <h3 className="text-lg font-bold text-gray-800 leading-tight">
                                    {s.nome}
                                </h3>
                                <p className="text-sm text-gray-500 line-clamp-2 mt-2 flex-1">
                                    {s.descricao || <span className="italic opacity-50">Sem descrição.</span>}
                                </p>

                                <div className="mt-5 flex justify-between items-center border-t border-gray-100 pt-4">
                                    <span className="font-black text-[#5C4033] text-lg">
                                        {s.preco ? `R$ ${s.preco.toFixed(2)}` : "Sob Consulta"}
                                    </span>
                                    {s.tempoMinutos && (
                                        <span className="text-xs bg-orange-50 border border-orange-100 text-[#8B5A2B] px-2.5 py-1 rounded font-bold uppercase tracking-wider">
                                            ⏱ {s.tempoMinutos} min
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal de Criação */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-lg border-t-4 border-[#5C4033] transform transition-transform">
                        <h2 className="text-2xl font-bold text-[#5C4033] mb-6">
                            Cadastrar Novo Serviço
                        </h2>

                        <form onSubmit={handleSalvarServico} className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Nome do Serviço *</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Ex: Corte Degrade"
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#8B5A2B]/20 focus:border-[#8B5A2B] outline-none transition-all"
                                    value={formData.nome}
                                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Descrição</label>
                                <textarea
                                    placeholder="Detalhes sobre como é feito o serviço..."
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#8B5A2B]/20 focus:border-[#8B5A2B] outline-none transition-all resize-none"
                                    rows={3}
                                    value={formData.descricao}
                                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Preço (R$) *</label>
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#8B5A2B]/20 focus:border-[#8B5A2B] outline-none transition-all"
                                        value={formData.preco}
                                        onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Tempo (Min) *</label>
                                    <input
                                        required
                                        type="number"
                                        min="1"
                                        placeholder="Ex: 45"
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#8B5A2B]/20 focus:border-[#8B5A2B] outline-none transition-all"
                                        value={formData.tempoMinutos}
                                        onChange={(e) => setFormData({ ...formData, tempoMinutos: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Foto de Vitrine (Opcional)
                                </label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-[#8B5A2B]/10 file:text-[#8B5A2B] hover:file:bg-[#8B5A2B]/20 transition-all cursor-pointer"
                                    onChange={(e) => {
                                        if (e.target.files?.[0]) {
                                            setImagemArquivo(e.target.files[0]);
                                        }
                                    }}
                                />

                                {imagemArquivo && (
                                    <div className="mt-4 relative rounded-lg overflow-hidden border border-gray-300">
                                        <img
                                            src={URL.createObjectURL(imagemArquivo)}
                                            alt="Preview"
                                            className="h-32 w-full object-cover"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    disabled={uploading}
                                    className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploading}
                                    className="px-6 py-2.5 bg-[#5C4033] text-white font-bold rounded-lg hover:bg-[#3e2b22] shadow-md transition-all disabled:opacity-70 flex items-center gap-2"
                                >
                                    {uploading ? (
                                        <>
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                            A Salvar...
                                        </>
                                    ) : (
                                        "Gravar no Catálogo"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}