'use client'

import { useState, useEffect } from 'react';
import {
    gerarAdminInicial,
    criarFuncionario,
    inativarFuncionario
} from '@/app/actions/admin';

type FormData = {
    nome: string;
    email: string;
    cpf: string;
    telefone: string;
    especialidade: string;
    comissao: number;
};

const FORM_INICIAL: FormData = {
    nome: '', email: '', cpf: '', telefone: '', especialidade: '', comissao: 40
};

export default function TorreControleDashboard() {
    const [mensagem, setMensagem] = useState({ texto: '', tipo: '' });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [formData, setFormData] = useState<FormData>(FORM_INICIAL);

    useEffect(() => setMounted(true), []);

    const set = (campo: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setFormData(prev => ({ ...prev, [campo]: campo === 'comissao' ? Number(e.target.value) : e.target.value }));

    const handleGerarAdmin = async () => {
        const res = await gerarAdminInicial();
        setMensagem({ texto: res.mensagem ?? res.erro ?? '', tipo: res.sucesso ? 'sucesso' : 'erro' });
    };

    const handleCadastrarEquipe = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMensagem({ texto: 'Cadastrando profissional...', tipo: 'info' });

        const res = await criarFuncionario(formData);

        if (res.sucesso) {
            setMensagem({ texto: 'Profissional cadastrado! Senha temporária: Mudar@123', tipo: 'sucesso' });
            setIsModalOpen(false);
            setFormData(FORM_INICIAL);
        } else {
            setMensagem({ texto: res.erro || 'Erro ao cadastrar.', tipo: 'erro' });
        }
        setLoading(false);
    };

    const fecharModal = () => {
        setIsModalOpen(false);
        setFormData(FORM_INICIAL);
    };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');

                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

                :root {
                    --bg:             #0e0a08;
                    --superficie:     #150d09;
                    --borda:          rgba(197,168,124,0.12);
                    --borda-hover:    rgba(197,168,124,0.28);
                    --caramelo:       #c5a87c;
                    --caramelo-dim:   rgba(197,168,124,0.5);
                    --marrom:         #5C4033;
                    --marrom-claro:   #8B5A2B;
                    --texto:          rgba(255,255,255,0.82);
                    --texto-suave:    rgba(255,255,255,0.38);
                    --texto-mudo:     rgba(255,255,255,0.18);
                    --sucesso:        rgba(52,199,89,0.12);
                    --sucesso-borda:  rgba(52,199,89,0.3);
                    --sucesso-texto:  #6fcf97;
                    --erro:           rgba(235,87,87,0.1);
                    --erro-borda:     rgba(235,87,87,0.28);
                    --erro-texto:     #f08080;
                    --info:           rgba(197,168,124,0.08);
                    --info-borda:     rgba(197,168,124,0.2);
                }

                body {
                    font-family: 'DM Sans', sans-serif;
                    background: var(--bg);
                    color: var(--texto);
                    min-height: 100svh;
                }

                /* ── LAYOUT ── */
                .dashboard {
                    min-height: 100svh;
                    display: grid;
                    grid-template-rows: auto 1fr;
                }

                /* ── TOPO ── */
                .topo {
                    padding: 2rem 3rem;
                    border-bottom: 1px solid var(--borda);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 1.5rem;
                    flex-wrap: wrap;
                    background: rgba(21,13,9,0.7);
                    backdrop-filter: blur(12px);
                    position: sticky;
                    top: 0;
                    z-index: 10;
                    opacity: 0;
                    transform: translateY(-6px);
                    transition: opacity 0.5s ease, transform 0.5s ease;
                }

                .topo.visivel { opacity: 1; transform: translateY(0); }

                @media (max-width: 768px) { .topo { padding: 1.25rem 1.5rem; } }

                .topo-esquerda { display: flex; flex-direction: column; gap: 0.2rem; }

                .topo-breadcrumb {
                    font-size: 0.65rem;
                    font-weight: 500;
                    letter-spacing: 0.22em;
                    text-transform: uppercase;
                    color: var(--caramelo-dim);
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .topo-titulo {
                    font-family: 'Cormorant Garamond', serif;
                    font-size: 1.6rem;
                    font-weight: 600;
                    color: white;
                    line-height: 1;
                    letter-spacing: 0.01em;
                }

                .topo-acoes { display: flex; align-items: center; gap: 0.75rem; }

                .btn-debug {
                    padding: 0.55rem 1rem;
                    background: transparent;
                    border: 1px dashed rgba(255,255,255,0.12);
                    border-radius: 3px;
                    font-family: 'DM Mono', monospace;
                    font-size: 0.65rem;
                    color: rgba(255,255,255,0.28);
                    cursor: pointer;
                    transition: all 0.2s;
                    letter-spacing: 0.05em;
                }

                .btn-debug:hover {
                    border-color: rgba(255,255,255,0.25);
                    color: rgba(255,255,255,0.5);
                }

                .btn-primario {
                    padding: 0.65rem 1.5rem;
                    background: var(--caramelo);
                    color: #1a0e08;
                    border: none;
                    border-radius: 3px;
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.72rem;
                    font-weight: 600;
                    letter-spacing: 0.15em;
                    text-transform: uppercase;
                    cursor: pointer;
                    transition: background 0.2s, transform 0.1s;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .btn-primario:hover { background: #d4b896; }
                .btn-primario:active { transform: scale(0.98); }

                /* ── CORPO ── */
                .corpo {
                    padding: 2.5rem 3rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1.75rem;
                }

                @media (max-width: 768px) { .corpo { padding: 1.5rem; } }

                /* ── FEEDBACK ── */
                .feedback {
                    padding: 0.9rem 1.25rem;
                    border-radius: 3px;
                    font-size: 0.82rem;
                    font-weight: 400;
                    display: flex;
                    align-items: center;
                    gap: 0.6rem;
                    animation: fadeSlide 0.3s ease;
                }

                .feedback-sucesso { background: var(--sucesso); border: 1px solid var(--sucesso-borda); color: var(--sucesso-texto); }
                .feedback-erro    { background: var(--erro);    border: 1px solid var(--erro-borda);    color: var(--erro-texto); }
                .feedback-info    { background: var(--info);    border: 1px solid var(--info-borda);    color: var(--caramelo); }

                @keyframes fadeSlide {
                    from { opacity: 0; transform: translateY(-6px); }
                    to   { opacity: 1; transform: translateY(0); }
                }

                /* ── STATS ── */
                .stats-grade {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                    gap: 1px;
                    background: var(--borda);
                    border: 1px solid var(--borda);
                    border-radius: 4px;
                    overflow: hidden;
                }

                .stat-card {
                    background: var(--superficie);
                    padding: 1.5rem 1.75rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.35rem;
                    transition: background 0.2s;
                }

                .stat-card:hover { background: rgba(255,255,255,0.02); }

                .stat-label {
                    font-size: 0.65rem;
                    font-weight: 500;
                    letter-spacing: 0.18em;
                    text-transform: uppercase;
                    color: var(--texto-mudo);
                }

                .stat-valor {
                    font-family: 'Cormorant Garamond', serif;
                    font-size: 2rem;
                    font-weight: 300;
                    color: var(--caramelo);
                    line-height: 1;
                }

                .stat-sub {
                    font-size: 0.72rem;
                    color: var(--texto-suave);
                    font-weight: 300;
                }

                /* ── TABELA ── */
                .tabela-wrapper {
                    background: var(--superficie);
                    border: 1px solid var(--borda);
                    border-radius: 4px;
                    overflow: hidden;
                }

                .tabela-cabecalho {
                    padding: 1.25rem 1.75rem;
                    border-bottom: 1px solid var(--borda);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 1rem;
                }

                .tabela-titulo {
                    font-size: 0.7rem;
                    font-weight: 500;
                    letter-spacing: 0.2em;
                    text-transform: uppercase;
                    color: var(--caramelo-dim);
                }

                .tabela-badge {
                    font-family: 'DM Mono', monospace;
                    font-size: 0.65rem;
                    padding: 0.25rem 0.6rem;
                    background: rgba(197,168,124,0.08);
                    border: 1px solid var(--borda);
                    border-radius: 999px;
                    color: var(--texto-suave);
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                }

                thead tr {
                    background: rgba(255,255,255,0.02);
                    border-bottom: 1px solid var(--borda);
                }

                th {
                    padding: 0.85rem 1.75rem;
                    font-size: 0.65rem;
                    font-weight: 500;
                    letter-spacing: 0.18em;
                    text-transform: uppercase;
                    color: var(--texto-mudo);
                    text-align: left;
                }

                th:last-child { text-align: right; }

                tbody tr {
                    border-bottom: 1px solid rgba(197,168,124,0.06);
                    transition: background 0.15s;
                }

                tbody tr:last-child { border-bottom: none; }
                tbody tr:hover { background: rgba(255,255,255,0.015); }

                td {
                    padding: 1.1rem 1.75rem;
                    font-size: 0.85rem;
                    font-weight: 300;
                    color: var(--texto);
                }

                td:last-child { text-align: right; }

                .td-nome {
                    font-weight: 500;
                    color: white;
                }

                .td-especialidade {
                    font-size: 0.75rem;
                    color: var(--texto-suave);
                    font-style: italic;
                    font-family: 'Cormorant Garamond', serif;
                }

                .td-comissao {
                    font-family: 'DM Mono', monospace;
                    font-size: 0.8rem;
                    color: var(--caramelo);
                }

                .tabela-vazia {
                    padding: 4rem 2rem;
                    text-align: center;
                    color: var(--texto-mudo);
                }

                .tabela-vazia p {
                    font-size: 0.82rem;
                    font-weight: 300;
                    margin-top: 0.5rem;
                    color: var(--texto-suave);
                }

                .vazia-icone {
                    font-family: 'Cormorant Garamond', serif;
                    font-size: 2rem;
                    color: rgba(197,168,124,0.2);
                    margin-bottom: 0.75rem;
                }

                .btn-acao {
                    padding: 0.4rem 0.9rem;
                    background: transparent;
                    border: 1px solid var(--borda);
                    border-radius: 2px;
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.68rem;
                    font-weight: 500;
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                    color: var(--texto-suave);
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .btn-acao:hover {
                    border-color: var(--erro-borda);
                    color: var(--erro-texto);
                }

                /* ── MODAL ── */
                .overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.75);
                    backdrop-filter: blur(4px);
                    -webkit-backdrop-filter: blur(4px);
                    z-index: 50;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 1.5rem;
                    animation: fadeIn 0.2s ease;
                }

                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

                .modal {
                    background: #1a0f0a;
                    border: 1px solid rgba(197,168,124,0.18);
                    border-radius: 6px;
                    width: 100%;
                    max-width: 560px;
                    max-height: 90svh;
                    overflow-y: auto;
                    animation: slideUp 0.25s ease;
                }

                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(16px); }
                    to   { opacity: 1; transform: translateY(0); }
                }

                .modal-topo {
                    padding: 1.75rem 2rem 1.25rem;
                    border-bottom: 1px solid var(--borda);
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 1rem;
                }

                .modal-titulo {
                    font-family: 'Cormorant Garamond', serif;
                    font-size: 1.4rem;
                    font-weight: 400;
                    color: white;
                    line-height: 1.2;
                }

                .modal-subtitulo {
                    font-size: 0.75rem;
                    color: var(--texto-suave);
                    font-weight: 300;
                    margin-top: 0.2rem;
                }

                .btn-fechar {
                    background: none;
                    border: none;
                    color: var(--texto-mudo);
                    cursor: pointer;
                    font-size: 1.2rem;
                    line-height: 1;
                    padding: 0.2rem;
                    transition: color 0.2s;
                    flex-shrink: 0;
                }

                .btn-fechar:hover { color: var(--texto); }

                .modal-corpo { padding: 1.75rem 2rem; }

                .form-secao {
                    font-size: 0.62rem;
                    font-weight: 600;
                    letter-spacing: 0.22em;
                    text-transform: uppercase;
                    color: var(--caramelo-dim);
                    margin-bottom: 1rem;
                    padding-bottom: 0.6rem;
                    border-bottom: 1px solid var(--borda);
                }

                .form-grade {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                }

                @media (max-width: 500px) { .form-grade { grid-template-columns: 1fr; } }

                .campo { display: flex; flex-direction: column; gap: 0.45rem; }
                .campo.span2 { grid-column: span 2; }
                @media (max-width: 500px) { .campo.span2 { grid-column: span 1; } }

                .campo label {
                    font-size: 0.65rem;
                    font-weight: 500;
                    letter-spacing: 0.16em;
                    text-transform: uppercase;
                    color: rgba(197,168,124,0.65);
                }

                .campo input {
                    padding: 0.75rem 0.9rem;
                    background: rgba(255,255,255,0.04);
                    border: 1px solid rgba(197,168,124,0.15);
                    border-radius: 3px;
                    color: rgba(255,255,255,0.85);
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.875rem;
                    font-weight: 300;
                    outline: none;
                    transition: border-color 0.2s, background 0.2s;
                }

                .campo input::placeholder { color: rgba(255,255,255,0.2); }

                .campo input:focus {
                    border-color: rgba(197,168,124,0.45);
                    background: rgba(255,255,255,0.06);
                }

                .campo-dica {
                    font-size: 0.68rem;
                    color: var(--texto-mudo);
                    font-weight: 300;
                }

                .modal-rodape {
                    padding: 1.25rem 2rem 1.75rem;
                    display: flex;
                    justify-content: flex-end;
                    gap: 0.75rem;
                    border-top: 1px solid var(--borda);
                }

                .btn-cancelar {
                    padding: 0.65rem 1.25rem;
                    background: transparent;
                    border: 1px solid var(--borda);
                    border-radius: 3px;
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.72rem;
                    font-weight: 400;
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                    color: var(--texto-suave);
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .btn-cancelar:hover {
                    border-color: var(--borda-hover);
                    color: var(--texto);
                }

                .loader-dot {
                    width: 4px; height: 4px;
                    border-radius: 50%;
                    background: currentColor;
                    animation: bounce 1.1s ease-in-out infinite;
                    display: inline-block;
                }
                .loader-dot:nth-child(2) { animation-delay: 0.15s; }
                .loader-dot:nth-child(3) { animation-delay: 0.3s; }

                @keyframes bounce {
                    0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
                    40%           { transform: translateY(-4px); opacity: 1; }
                }
            `}</style>

            <div className="dashboard">

                {/* ── TOPO ── */}
                <header className={`topo ${mounted ? 'visivel' : ''}`}>
                    <div className="topo-esquerda">
                        <span className="topo-breadcrumb">
                            LmLu Mattielo
                            <span style={{ opacity: 0.3 }}>›</span>
                            Admin
                        </span>
                        <h1 className="topo-titulo">Torre de Controle</h1>
                    </div>

                    <div className="topo-acoes">
                        <button onClick={handleGerarAdmin} className="btn-debug">
                            ⚙ setup inicial
                        </button>
                        <button onClick={() => setIsModalOpen(true)} className="btn-primario">
                            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                                <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                            </svg>
                            Novo Profissional
                        </button>
                    </div>
                </header>

                <main className="corpo">

                    {/* Feedback */}
                    {mensagem.texto && (
                        <div className={`feedback ${mensagem.tipo === 'sucesso' ? 'feedback-sucesso' :
                                mensagem.tipo === 'erro' ? 'feedback-erro' :
                                    'feedback-info'
                            }`}>
                            {mensagem.tipo === 'sucesso' && '✓ '}
                            {mensagem.tipo === 'erro' && '✕ '}
                            {mensagem.texto}
                        </div>
                    )}

                    {/* Stats */}
                    <div className="stats-grade">
                        {[
                            { label: 'Profissionais', valor: '—', sub: 'ativos no sistema' },
                            { label: 'Agendamentos', valor: '—', sub: 'este mês' },
                            { label: 'Comissão média', valor: '—', sub: 'sobre receita líquida' },
                            { label: 'Clientes', valor: '—', sub: 'cadastrados' },
                        ].map(s => (
                            <div key={s.label} className="stat-card">
                                <span className="stat-label">{s.label}</span>
                                <span className="stat-valor">{s.valor}</span>
                                <span className="stat-sub">{s.sub}</span>
                            </div>
                        ))}
                    </div>

                    {/* Tabela */}
                    <div className="tabela-wrapper">
                        <div className="tabela-cabecalho">
                            <span className="tabela-titulo">Equipe Cadastrada</span>
                            <span className="tabela-badge">0 registros</span>
                        </div>

                        <table>
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>Especialidade</th>
                                    <th>Comissão</th>
                                    <th>Status</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td colSpan={5}>
                                        <div className="tabela-vazia">
                                            <div className="vazia-icone">✦</div>
                                            <p>Nenhum profissional cadastrado.</p>
                                            <p style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)' }}>
                                                Use o botão "Novo Profissional" para compor a equipe.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                </main>
            </div>

            {/* ── MODAL ── */}
            {isModalOpen && (
                <div className="overlay" onClick={e => e.target === e.currentTarget && fecharModal()}>
                    <div className="modal">
                        <div className="modal-topo">
                            <div>
                                <div className="modal-titulo">Cadastrar Profissional</div>
                                <div className="modal-subtitulo">Senha temporária <code style={{ fontFamily: 'DM Mono', color: 'rgba(197,168,124,0.7)' }}>Mudar@123</code> será atribuída automaticamente</div>
                            </div>
                            <button className="btn-fechar" onClick={fecharModal} aria-label="Fechar">✕</button>
                        </div>

                        <form onSubmit={handleCadastrarEquipe}>
                            <div className="modal-corpo">

                                <div className="form-secao">Identificação</div>
                                <div className="form-grade">
                                    <div className="campo">
                                        <label>Nome Completo</label>
                                        <input
                                            required type="text"
                                            placeholder="Ex: Ana Paula Souza"
                                            value={formData.nome}
                                            onChange={set('nome')}
                                        />
                                    </div>
                                    <div className="campo">
                                        <label>CPF</label>
                                        <input
                                            required type="text"
                                            placeholder="000.000.000-00"
                                            value={formData.cpf}
                                            onChange={set('cpf')}
                                        />
                                    </div>
                                    <div className="campo">
                                        <label>E-mail Corporativo</label>
                                        <input
                                            required type="email"
                                            placeholder="nome@lmlumattielo.com.br"
                                            value={formData.email}
                                            onChange={set('email')}
                                        />
                                    </div>
                                    <div className="campo">
                                        <label>Telefone</label>
                                        <input
                                            type="tel"
                                            placeholder="(11) 90000-0000"
                                            value={formData.telefone}
                                            onChange={set('telefone')}
                                        />
                                    </div>
                                </div>

                                <div className="form-secao">Função e Remuneração</div>
                                <div className="form-grade">
                                    <div className="campo">
                                        <label>Especialidade</label>
                                        <input
                                            type="text"
                                            placeholder="Ex: Colorimetria"
                                            value={formData.especialidade}
                                            onChange={set('especialidade')}
                                        />
                                    </div>
                                    <div className="campo">
                                        <label>Comissão (%)</label>
                                        <input
                                            required type="number" min="0" max="100"
                                            value={formData.comissao}
                                            onChange={set('comissao')}
                                        />
                                        <span className="campo-dica">Aplicada sobre a base líquida após taxas</span>
                                    </div>
                                </div>

                            </div>

                            <div className="modal-rodape">
                                <button type="button" className="btn-cancelar" onClick={fecharModal}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-primario" disabled={loading}>
                                    {loading ? (
                                        <>
                                            <span className="loader-dot" />
                                            <span className="loader-dot" />
                                            <span className="loader-dot" />
                                        </>
                                    ) : 'Salvar Cadastro'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}