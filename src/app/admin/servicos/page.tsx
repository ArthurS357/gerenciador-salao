"use client";

import { useState, useEffect } from "react";
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

    return (
        <div className="min-h-screen bg-[#fdfbf7] p-8 font-sans">
            <header className="mb-8 border-b-2 border-[#5C4033] pb-4 flex justify-between items-center">
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
                    className="bg-[#8B5A2B] text-white px-4 py-2 rounded font-bold hover:bg-[#704620]"
                >
                    + Novo Serviço
                </button>
            </header>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {servicos.length === 0 ? (
                    <p className="text-gray-500 col-span-3">
                        Nenhum serviço cadastrado.
                    </p>
                ) : (
                    servicos.map((s) => (
                        <div
                            key={s.id}
                            className="bg-white rounded-lg shadow border border-[#e5d9c5] overflow-hidden"
                        >
                            <div
                                className="h-40 bg-gray-200 w-full bg-cover bg-center"
                                style={{
                                    backgroundImage: `url(${s.imagemUrl ||
                                        "https://via.placeholder.com/400x200?text=Sem+Foto"
                                        })`,
                                }}
                            />
                            <div className="p-4">
                                <h3 className="text-xl font-bold text-gray-800">
                                    {s.nome}
                                </h3>
                                <p className="text-sm text-gray-500 line-clamp-2 mt-1 min-h-[40px]">
                                    {s.descricao}
                                </p>
                                <div className="mt-4 flex justify-between items-center border-t pt-3">
                                    <span className="font-bold text-[#5C4033]">
                                        {s.preco
                                            ? `R$ ${s.preco.toFixed(2)}`
                                            : "Sob Consulta"}
                                    </span>
                                    {s.tempoMinutos && (
                                        <span className="text-xs bg-[#e5d9c5] text-[#5C4033] px-2 py-1 rounded-full font-bold">
                                            ⏱ {s.tempoMinutos} min
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg border-t-4 border-[#5C4033]">
                        <h2 className="text-2xl font-bold text-[#5C4033] mb-6">
                            Cadastrar Serviço
                        </h2>

                        <form onSubmit={handleSalvarServico} className="space-y-4">
                            <input
                                required
                                type="text"
                                placeholder="Nome do Serviço"
                                className="w-full border rounded px-3 py-2"
                                value={formData.nome}
                                onChange={(e) =>
                                    setFormData({ ...formData, nome: e.target.value })
                                }
                            />

                            <textarea
                                placeholder="Descrição"
                                className="w-full border rounded px-3 py-2"
                                rows={3}
                                value={formData.descricao}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        descricao: e.target.value,
                                    })
                                }
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder="Preço"
                                    className="border rounded px-3 py-2"
                                    value={formData.preco}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            preco: e.target.value,
                                        })
                                    }
                                />

                                <input
                                    type="number"
                                    placeholder="Tempo (min)"
                                    className="border rounded px-3 py-2"
                                    value={formData.tempoMinutos}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            tempoMinutos: e.target.value,
                                        })
                                    }
                                />
                            </div>

                            {/* Upload de imagem */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Foto do Serviço
                                </label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="w-full border rounded px-3 py-2 bg-gray-50"
                                    onChange={(e) => {
                                        if (e.target.files?.[0]) {
                                            setImagemArquivo(e.target.files[0]);
                                        }
                                    }}
                                />

                                {/* Preview */}
                                {imagemArquivo && (
                                    <img
                                        src={URL.createObjectURL(imagemArquivo)}
                                        alt="Preview"
                                        className="mt-3 h-32 w-full object-cover rounded"
                                    />
                                )}
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    disabled={uploading}
                                    className="px-4 py-2 bg-[#5C4033] text-white font-bold rounded hover:bg-[#3e2b22] disabled:opacity-50"
                                >
                                    {uploading ? "Enviando..." : "Salvar no Portfólio"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}