'use client'

import { useState, useEffect } from 'react';
import { iniciarLoginCliente, confirmarDesafioLogin, registrarNovoCliente } from '@/app/actions/auth-cliente';
import { validarTelefoneBrasileiro } from '@/lib/telefone';

export default function LoginPage() {
    const [telefone, setTelefone] = useState('');
    const [nome, setNome] = useState('');
    const [inputTocado, setInputTocado] = useState(false);

    // Flags do novo fluxo de segurança
    const [fase, setFase] = useState<'TELEFONE' | 'CADASTRO' | 'DESAFIO'>('TELEFONE');
    const [opcoesDesafio, setOpcoesDesafio] = useState<string[]>([]);

    const [erro, setErro] = useState('');
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    const formatarTelefone = (valor: string) => {
        let v = valor.replace(/\D/g, '');
        if (v.length > 11) v = v.slice(0, 11);
        if (v.length > 2) v = v.replace(/^(\d{2})(\d)/g, '($1) $2');
        if (v.length > 7) v = v.replace(/(\d{5})(\d)/, '$1-$2');
        return v;
    };

    const telefoneLimpo = telefone.replace(/\D/g, '');
    const telefoneValido = validarTelefoneBrasileiro(telefoneLimpo);
    const mostrarErroValidacao = inputTocado && !telefoneValido && telefoneLimpo.length >= 10 && fase === 'TELEFONE';

    // ── FASE 1: Verifica o telefone ──────────────────────────────────────────
    const handleVerificarTelefone = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!telefoneValido) {
            setErro('Insira um celular válido (DDD + 9 dígitos).');
            return;
        }

        setLoading(true);
        setErro('');

        try {
            const res = await iniciarLoginCliente(telefone);

            if (!res.sucesso) {
                setErro(res.erro || 'Falha na verificação do número.');
                setLoading(false);
                return;
            }

            if (res.status === 'NOVO_CLIENTE') {
                setFase('CADASTRO');
            } else if (res.status === 'DESAFIO_IDENTIDADE') {
                setOpcoesDesafio(res.opcoes || []);
                setFase('DESAFIO');
            }
        } catch {
            setErro('Falha de comunicação com o servidor.');
        } finally {
            setLoading(false);
        }
    };

    // ── FASE 2A: Cadastro de Novo Usuário ────────────────────────────────────
    const handleCadastro = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErro('');

        try {
            const res = await registrarNovoCliente(telefone, nome);
            if (res.sucesso) {
                window.location.href = '/';
            } else {
                setErro(res.erro || 'Falha ao realizar cadastro.');
            }
        } catch {
            setErro('Falha de comunicação com o servidor.');
        } finally {
            setLoading(false);
        }
    };

    // ── FASE 2B: Resolve o Desafio Antibot ───────────────────────────────────
    const handleEscolherDesafio = async (opcao: string) => {
        setLoading(true);
        setErro('');

        try {
            const res = await confirmarDesafioLogin(telefone, opcao);

            if (res.sucesso) {
                window.location.href = '/';
            } else {
                // Em caso de erro, o token foi destruído no backend. O usuário DEVE voltar à estaca zero.
                setErro(res.erro || 'Identidade não confirmada.');
                setFase('TELEFONE');
                setTelefone('');
            }
        } catch {
            setErro('Falha técnica ao confirmar identidade.');
            setFase('TELEFONE');
        } finally {
            setLoading(false);
        }
    };

    // ── RENDERIZAÇÃO DA UI COM BASE NA FASE ATUAL ────────────────────────────
    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');

                * { box-sizing: border-box; margin: 0; padding: 0; }

                .page {
                    min-height: 100svh;
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    font-family: 'DM Sans', sans-serif;
                    background: #0e0a08;
                }

                @media (max-width: 768px) {
                    .page { grid-template-columns: 1fr; }
                    .panel-esquerdo { display: none; }
                }

                /* ... Estilos do painel esquerdo mantidos ... */
                .panel-esquerdo { position: relative; overflow: hidden; background: #1a0f0a; }
                .panel-esquerdo::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse 80% 60% at 30% 40%, rgba(139, 90, 43, 0.35) 0%, transparent 70%), radial-gradient(ellipse 50% 80% at 70% 70%, rgba(92, 64, 51, 0.2) 0%, transparent 60%); }
                .panel-esquerdo-conteudo { position: relative; z-index: 1; height: 100%; display: flex; flex-direction: column; justify-content: space-between; padding: 3rem; }
                .decorativo-linha { width: 40px; height: 1px; background: rgba(197, 168, 124, 0.5); display: block; margin-bottom: 1.5rem; }
                .citacao { font-family: 'Cormorant Garamond', serif; font-size: 2rem; font-weight: 300; font-style: italic; color: rgba(255, 255, 255, 0.75); line-height: 1.4; max-width: 320px; }
                .citacao em { color: #c5a87c; font-style: normal; }
                .rodape-esquerdo { display: flex; align-items: center; gap: 0.75rem; color: rgba(255,255,255,0.3); font-size: 0.75rem; font-weight: 300; letter-spacing: 0.1em; text-transform: uppercase; }
                .dot { width: 4px; height: 4px; border-radius: 50%; background: rgba(197, 168, 124, 0.4); }

                /* ... Estilos do formulário direito ... */
                .panel-direito { display: flex; align-items: center; justify-content: center; padding: 2rem; background: #f7f3ee; opacity: 0; transform: translateY(12px); transition: opacity 0.6s ease, transform 0.6s ease; }
                .panel-direito.visivel { opacity: 1; transform: translateY(0); }
                .card { width: 100%; max-width: 400px; }
                .logo-area { margin-bottom: 2.5rem; }
                .logo { font-family: 'Cormorant Garamond', serif; font-size: 2rem; font-weight: 600; color: #3a2318; letter-spacing: 0.02em; line-height: 1; }
                .logo span { display: block; font-size: 0.7rem; font-family: 'DM Sans', sans-serif; font-weight: 300; letter-spacing: 0.25em; text-transform: uppercase; color: #8B5A2B; margin-top: 0.35rem; }
                .titulo-form { font-family: 'Cormorant Garamond', serif; font-size: 1.5rem; font-weight: 400; color: #3a2318; margin-bottom: 0.35rem; }
                .subtitulo-form { font-size: 0.82rem; color: #9c8070; font-weight: 300; margin-bottom: 2rem; }
                .divisor { height: 1px; background: linear-gradient(to right, #d4b896, transparent); margin-bottom: 2rem; }
                
                .campo { margin-bottom: 1.25rem; }
                @keyframes fadeInTop { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
                .fade-in { animation: fadeInTop 0.4s ease-out forwards; }
                
                label { display: block; font-size: 0.72rem; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; color: #6b4c3b; margin-bottom: 0.5rem; }
                input { width: 100%; padding: 0.8rem 1rem; border: 1.5px solid #e0d0c0; border-radius: 4px; background: white; color: #3a2318; font-family: 'DM Sans', sans-serif; font-size: 0.9rem; font-weight: 300; outline: none; transition: border-color 0.2s, box-shadow 0.2s; }
                input::placeholder { color: #c0a898; }
                input:focus { border-color: #8B5A2B; box-shadow: 0 0 0 3px rgba(139, 90, 43, 0.08); }
                input.invalido { border-color: #ef4444; }
                input:disabled { background: #f0e6d8; color: #9c8070; cursor: not-allowed; }
                
                .erro-msg { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem; background: #fff1f0; border: 1px solid #f5c5c0; border-radius: 4px; color: #b04040; font-size: 0.8rem; margin-bottom: 1.25rem; }
                .helper-text { color: #ef4444; font-size: 0.72rem; margin-top: 0.4rem; display: block; font-weight: 500; }
                
                .btn-entrar { width: 100%; padding: 0.9rem; background: #3a2318; color: #f0e6d8; border: none; border-radius: 4px; font-family: 'DM Sans', sans-serif; font-size: 0.8rem; font-weight: 500; letter-spacing: 0.2em; text-transform: uppercase; cursor: pointer; margin-top: 0.5rem; transition: background 0.2s, transform 0.1s, opacity 0.2s; }
                .btn-entrar:hover:not(:disabled) { background: #5C4033; }
                .btn-entrar:active:not(:disabled) { transform: scale(0.99); }
                .btn-entrar:disabled { opacity: 0.5; cursor: not-allowed; }
                
                .loader { display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; width: 100%; height: 20px;}
                .loader-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; animation: bounce 1.2s ease-in-out infinite; }
                .loader-dot:nth-child(2) { animation-delay: 0.15s; }
                .loader-dot:nth-child(3) { animation-delay: 0.3s; }
                @keyframes bounce { 0%, 80%, 100% { transform: translateY(0); opacity: 0.4; } 40% { transform: translateY(-4px); opacity: 1; } }
                
                .nota-privacidade { margin-top: 1.5rem; font-size: 0.72rem; color: #b0998a; text-align: center; line-height: 1.5; font-weight: 300; }
                
                /* Estilos novos para o Desafio Múltipla Escolha */
                .desafio-grid { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1rem; }
                .btn-desafio { width: 100%; padding: 1rem; background: white; border: 1px solid #e0d0c0; border-radius: 4px; color: #3a2318; font-family: 'DM Sans', sans-serif; font-weight: 500; font-size: 1rem; cursor: pointer; transition: all 0.2s; text-align: left; position: relative; overflow: hidden; }
                .btn-desafio:hover { border-color: #8B5A2B; background: #faf7f2; }
                .btn-desafio::before { content: '👉'; position: absolute; right: 1rem; opacity: 0; transform: translateX(-10px); transition: all 0.2s; }
                .btn-desafio:hover::before { opacity: 1; transform: translateX(0); }
            `}</style>

            <div className="page">
                <div className="panel-esquerdo">
                    <div className="panel-esquerdo-conteudo">
                        <div>
                            <span className="decorativo-linha" />
                            <p className="citacao">Beleza que <em>transforma</em>,<br />cuidado que <em>permanece</em>.</p>
                        </div>
                        <div className="rodape-esquerdo">
                            <span>LmLu Mattielo</span><span className="dot" /><span>Studio de Beleza</span>
                        </div>
                    </div>
                </div>

                <div className={`panel-direito ${mounted ? 'visivel' : ''}`}>
                    <div className="card">
                        <div className="logo-area">
                            <div className="logo">LmLu Mattielo<span>Studio de Beleza</span></div>
                        </div>

                        {fase === 'TELEFONE' && (
                            <div className="fade-in">
                                <h2 className="titulo-form">Bem-vinda</h2>
                                <p className="subtitulo-form">Insira o seu número para acessar os agendamentos.</p>
                            </div>
                        )}

                        {fase === 'CADASTRO' && (
                            <div className="fade-in">
                                <h2 className="titulo-form">Novo Cadastro</h2>
                                <p className="subtitulo-form">Parece que é sua primeira vez. Como podemos te chamar?</p>
                            </div>
                        )}

                        {fase === 'DESAFIO' && (
                            <div className="fade-in">
                                <h2 className="titulo-form" style={{ color: '#8B5A2B' }}>Verificação de Segurança</h2>
                                <p className="subtitulo-form">Para proteger sua conta, clique no seu nome abaixo:</p>
                            </div>
                        )}

                        <div className="divisor" />

                        {erro && <div className="erro-msg fade-in">{erro}</div>}

                        {/* RENDERIZAÇÃO CONDICIONAL DOS FORMULÁRIOS */}

                        {fase === 'TELEFONE' && (
                            <form onSubmit={handleVerificarTelefone} className="fade-in">
                                <div className="campo">
                                    <label htmlFor="telefone">WhatsApp</label>
                                    <input
                                        id="telefone"
                                        type="tel"
                                        required
                                        value={telefone}
                                        onChange={(e) => {
                                            setTelefone(formatarTelefone(e.target.value));
                                            setInputTocado(true);
                                        }}
                                        placeholder="(11) 90000-0000"
                                        autoComplete="tel"
                                        maxLength={15}
                                        className={mostrarErroValidacao ? 'invalido' : ''}
                                    />
                                    {mostrarErroValidacao && (
                                        <span className="helper-text fade-in">
                                            Formato inválido. Verifique o DDD e o número.
                                        </span>
                                    )}
                                </div>
                                <button type="submit" disabled={loading || !telefoneValido} className="btn-entrar">
                                    {loading ? <span className="loader"><span className="loader-dot" /><span className="loader-dot" /><span className="loader-dot" /></span> : 'Continuar'}
                                </button>
                            </form>
                        )}

                        {fase === 'CADASTRO' && (
                            <form onSubmit={handleCadastro} className="fade-in">
                                <div className="campo">
                                    <label htmlFor="nome">Nome Completo</label>
                                    <input
                                        id="nome"
                                        type="text"
                                        required
                                        value={nome}
                                        onChange={(e) => setNome(e.target.value)}
                                        placeholder="Digite o seu nome"
                                        autoComplete="name"
                                        autoFocus
                                    />
                                </div>
                                <button type="submit" disabled={loading || nome.length < 3} className="btn-entrar">
                                    {loading ? <span className="loader"><span className="loader-dot" /><span className="loader-dot" /><span className="loader-dot" /></span> : 'Criar Conta'}
                                </button>
                            </form>
                        )}

                        {fase === 'DESAFIO' && (
                            <div className="desafio-grid fade-in">
                                {loading && (
                                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                                        <span className="loader" style={{ color: '#8B5A2B' }}><span className="loader-dot" /><span className="loader-dot" /><span className="loader-dot" /></span>
                                        <p style={{ marginTop: '1rem', color: '#9c8070', fontSize: '0.8rem' }}>Validando segurança...</p>
                                    </div>
                                )}
                                {!loading && opcoesDesafio.map((opcao, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleEscolherDesafio(opcao)}
                                        className="btn-desafio"
                                        type="button"
                                    >
                                        {opcao}
                                    </button>
                                ))}
                            </div>
                        )}

                        <p className="nota-privacidade">
                            Seus dados são protegidos pela LGPD e utilizados<br />
                            exclusivamente para seus agendamentos.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}