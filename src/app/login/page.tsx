'use client'

import { useState, useEffect } from 'react';
import { loginCliente } from '@/app/actions/auth';
// 1. Importando a Server Action recém-criada
import { validarWhatsAppAction } from '@/app/actions/whatsapp';

export default function LoginPage() {
    const [telefone, setTelefone] = useState('');
    const [nome, setNome] = useState('');

    // Flags de fluxo de login
    const [precisaNovoNome, setPrecisaNovoNome] = useState(false);
    const [precisaConfirmarNome, setPrecisaConfirmarNome] = useState(false);
    const [nomeMascarado, setNomeMascarado] = useState('');

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

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setErro('');

        if (telefone.length < 14) {
            setErro('Por favor, insira um telefone válido com DDD.');
            setLoading(false);
            return;
        }

        try {
            // 2. NOVA VALIDAÇÃO: Verifica o WhatsApp apenas na primeira etapa (quando pede o número)
            if (!precisaNovoNome && !precisaConfirmarNome) {
                const numeroAtivo = await validarWhatsAppAction(telefone);

                if (!numeroAtivo) {
                    setErro('O número digitado é inválido ou não possui uma conta de WhatsApp ativa.');
                    setLoading(false);
                    return;
                }
            }

            const envioNome = (precisaNovoNome || precisaConfirmarNome) ? nome : undefined;
            const res = await loginCliente(telefone, envioNome);

            if (res.requireNewName) {
                setPrecisaNovoNome(true);
                setErro('');
                setLoading(false);
                return;
            }

            if (res.requireNameConfirmation) {
                setPrecisaConfirmarNome(true);
                setNomeMascarado(res.maskedName || '');
                setErro('');
                setLoading(false);
                return;
            }

            if (res.success) {
                // Utilizado href em vez de router.push para forçar o recarregamento
                // e garantir que o layout do servidor lê o novo cookie de sessão.
                window.location.href = '/';
            } else {
                setErro(res.error || 'Ocorreu um erro ao tentar entrar.');
            }
        } catch {
            setErro('Falha de comunicação com o servidor.');
        } finally {
            setLoading(false);
        }
    };

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

                .panel-esquerdo {
                    position: relative;
                    overflow: hidden;
                    background: #1a0f0a;
                }

                .panel-esquerdo::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background:
                        radial-gradient(ellipse 80% 60% at 30% 40%, rgba(139, 90, 43, 0.35) 0%, transparent 70%),
                        radial-gradient(ellipse 50% 80% at 70% 70%, rgba(92, 64, 51, 0.2) 0%, transparent 60%);
                }

                .panel-esquerdo::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E");
                    opacity: 0.4;
                }

                .panel-esquerdo-conteudo {
                    position: relative;
                    z-index: 1;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    padding: 3rem;
                }

                .decorativo-linha {
                    width: 40px;
                    height: 1px;
                    background: rgba(197, 168, 124, 0.5);
                    display: block;
                    margin-bottom: 1.5rem;
                }

                .citacao {
                    font-family: 'Cormorant Garamond', serif;
                    font-size: 2rem;
                    font-weight: 300;
                    font-style: italic;
                    color: rgba(255, 255, 255, 0.75);
                    line-height: 1.4;
                    max-width: 320px;
                }

                .citacao em {
                    color: #c5a87c;
                    font-style: normal;
                }

                .rodape-esquerdo {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    color: rgba(255,255,255,0.3);
                    font-size: 0.75rem;
                    font-weight: 300;
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                }

                .dot {
                    width: 4px;
                    height: 4px;
                    border-radius: 50%;
                    background: rgba(197, 168, 124, 0.4);
                }

                .panel-direito {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem;
                    background: #f7f3ee;
                    opacity: 0;
                    transform: translateY(12px);
                    transition: opacity 0.6s ease, transform 0.6s ease;
                }

                .panel-direito.visivel {
                    opacity: 1;
                    transform: translateY(0);
                }

                .card {
                    width: 100%;
                    max-width: 400px;
                }

                .logo-area { margin-bottom: 2.5rem; }

                .logo {
                    font-family: 'Cormorant Garamond', serif;
                    font-size: 2rem;
                    font-weight: 600;
                    color: #3a2318;
                    letter-spacing: 0.02em;
                    line-height: 1;
                }

                .logo span {
                    display: block;
                    font-size: 0.7rem;
                    font-family: 'DM Sans', sans-serif;
                    font-weight: 300;
                    letter-spacing: 0.25em;
                    text-transform: uppercase;
                    color: #8B5A2B;
                    margin-top: 0.35rem;
                }

                .titulo-form {
                    font-family: 'Cormorant Garamond', serif;
                    font-size: 1.5rem;
                    font-weight: 400;
                    color: #3a2318;
                    margin-bottom: 0.35rem;
                }

                .subtitulo-form {
                    font-size: 0.82rem;
                    color: #9c8070;
                    font-weight: 300;
                    margin-bottom: 2rem;
                }

                .divisor {
                    height: 1px;
                    background: linear-gradient(to right, #d4b896, transparent);
                    margin-bottom: 2rem;
                }

                .campo { margin-bottom: 1.25rem; }

                @keyframes fadeInTop {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .fade-in { animation: fadeInTop 0.4s ease-out forwards; }

                label {
                    display: block;
                    font-size: 0.72rem;
                    font-weight: 500;
                    letter-spacing: 0.12em;
                    text-transform: uppercase;
                    color: #6b4c3b;
                    margin-bottom: 0.5rem;
                }

                input {
                    width: 100%;
                    padding: 0.8rem 1rem;
                    border: 1.5px solid #e0d0c0;
                    border-radius: 4px;
                    background: white;
                    color: #3a2318;
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.9rem;
                    font-weight: 300;
                    outline: none;
                    transition: border-color 0.2s, box-shadow 0.2s;
                }

                input::placeholder { color: #c0a898; }

                input:focus {
                    border-color: #8B5A2B;
                    box-shadow: 0 0 0 3px rgba(139, 90, 43, 0.08);
                }

                input:disabled {
                    background: #f0e6d8;
                    color: #9c8070;
                    cursor: not-allowed;
                }

                .erro-msg {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.75rem 1rem;
                    background: #fff1f0;
                    border: 1px solid #f5c5c0;
                    border-radius: 4px;
                    color: #b04040;
                    font-size: 0.8rem;
                    margin-bottom: 1.25rem;
                }

                .btn-entrar {
                    width: 100%;
                    padding: 0.9rem;
                    background: #3a2318;
                    color: #f0e6d8;
                    border: none;
                    border-radius: 4px;
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.8rem;
                    font-weight: 500;
                    letter-spacing: 0.2em;
                    text-transform: uppercase;
                    cursor: pointer;
                    margin-top: 0.5rem;
                    transition: background 0.2s, transform 0.1s;
                }

                .btn-entrar:hover:not(:disabled) { background: #5C4033; }
                .btn-entrar:active:not(:disabled) { transform: scale(0.99); }
                .btn-entrar:disabled { opacity: 0.6; cursor: not-allowed; }

                .loader { display: inline-flex; align-items: center; gap: 0.4rem; }
                .loader-dot {
                    width: 4px; height: 4px; border-radius: 50%; background: currentColor;
                    animation: bounce 1.2s ease-in-out infinite;
                }
                .loader-dot:nth-child(2) { animation-delay: 0.15s; }
                .loader-dot:nth-child(3) { animation-delay: 0.3s; }

                @keyframes bounce {
                    0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
                    40% { transform: translateY(-4px); opacity: 1; }
                }

                .nota-privacidade {
                    margin-top: 1.5rem;
                    font-size: 0.72rem;
                    color: #b0998a;
                    text-align: center;
                    line-height: 1.5;
                    font-weight: 300;
                }
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

                        <h2 className="titulo-form">Bem-vinda</h2>
                        <p className="subtitulo-form">Insira o seu número para acessar os agendamentos.</p>

                        <div className="divisor" />
                        {erro && <div className="erro-msg">{erro}</div>}

                        <form onSubmit={handleLogin}>
                            <div className="campo">
                                <label htmlFor="telefone">WhatsApp</label>
                                <input
                                    id="telefone"
                                    type="tel"
                                    required
                                    value={telefone}
                                    onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
                                    placeholder="(11) 90000-0000"
                                    autoComplete="tel"
                                    maxLength={15}
                                    disabled={precisaNovoNome || precisaConfirmarNome}
                                />
                            </div>

                            {/* Fluxo: Novo Cadastro */}
                            {precisaNovoNome && (
                                <div className="campo fade-in">
                                    <label htmlFor="nome">Como podemos te chamar?</label>
                                    <input
                                        id="nome"
                                        type="text"
                                        required
                                        value={nome}
                                        onChange={(e) => setNome(e.target.value)}
                                        placeholder="Seu primeiro nome"
                                        autoComplete="name"
                                        autoFocus
                                    />
                                </div>
                            )}

                            {/* Fluxo: Confirmação de Segurança (Máscara) */}
                            {precisaConfirmarNome && (
                                <div className="campo fade-in p-4 bg-orange-50 border border-orange-200 rounded text-center">
                                    <p className="text-xs text-[#8B5A2B] font-bold mb-2 uppercase tracking-wider">
                                        🔒 Verificação de Segurança
                                    </p>
                                    <p className="text-sm text-gray-700 mb-4">
                                        Para confirmar que é você, digite o seu primeiro nome.<br />
                                        <span className="block mt-1 font-mono text-[#5C4033] bg-white p-1 rounded font-bold border border-orange-100">
                                            {nomeMascarado}
                                        </span>
                                    </p>
                                    <input
                                        id="nomeConfirmacao"
                                        type="text"
                                        required
                                        value={nome}
                                        onChange={(e) => setNome(e.target.value)}
                                        placeholder="Digite o seu primeiro nome"
                                        autoFocus
                                        className="text-center"
                                    />
                                </div>
                            )}

                            <button type="submit" disabled={loading} className="btn-entrar">
                                {loading ? (
                                    <span className="loader">
                                        <span className="loader-dot" /><span className="loader-dot" /><span className="loader-dot" />
                                    </span>
                                ) : (precisaNovoNome || precisaConfirmarNome) ? 'Confirmar e Entrar' : 'Continuar'}
                            </button>
                        </form>

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