'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loginFuncionario } from '@/app/actions/auth';

export default function LoginProfissionalPage() {
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [senhaVisivel, setSenhaVisivel] = useState(false);
    const [erro, setErro] = useState('');
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const router = useRouter();

    useEffect(() => setMounted(true), []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErro('');

        try {
            const res = await loginFuncionario(email, senha);

            if (res.success) {
                if (res.role === 'ADMIN') {
                    router.push('/admin/dashboard');
                } else {
                    router.push('/profissional/agenda');
                }
            } else {
                setErro(res.error || 'Acesso negado.');
            }
        } catch {
            setErro('Erro de comunicação com o servidor.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&family=DM+Sans:wght@300;400;500;600&display=swap');

                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

                body {
                    font-family: 'DM Sans', sans-serif;
                    background: #0e0a08;
                }

                .pagina {
                    min-height: 100svh;
                    display: grid;
                    grid-template-rows: 1fr auto;
                    position: relative;
                    overflow: hidden;
                    background: #150d09;
                }

                /* Fundo atmosférico */
                .fundo-gradiente {
                    position: fixed;
                    inset: 0;
                    pointer-events: none;
                    z-index: 0;
                }

                .fundo-gradiente::before {
                    content: '';
                    position: absolute;
                    top: -20%;
                    left: -10%;
                    width: 60%;
                    height: 70%;
                    background: radial-gradient(ellipse, rgba(92, 64, 51, 0.35) 0%, transparent 65%);
                }

                .fundo-gradiente::after {
                    content: '';
                    position: absolute;
                    bottom: -10%;
                    right: -5%;
                    width: 50%;
                    height: 60%;
                    background: radial-gradient(ellipse, rgba(139, 90, 43, 0.2) 0%, transparent 65%);
                }

                /* Grade sutil */
                .fundo-grade {
                    position: fixed;
                    inset: 0;
                    background-image:
                        linear-gradient(rgba(197,168,124,0.04) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(197,168,124,0.04) 1px, transparent 1px);
                    background-size: 72px 72px;
                    pointer-events: none;
                    z-index: 0;
                }

                /* Layout central */
                .centro {
                    position: relative;
                    z-index: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem;
                    min-height: 100svh;
                }

                /* Badge de acesso restrito */
                .badge-restrito {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.4rem 1rem;
                    border: 1px solid rgba(197, 168, 124, 0.25);
                    border-radius: 999px;
                    font-size: 0.65rem;
                    font-weight: 500;
                    letter-spacing: 0.2em;
                    text-transform: uppercase;
                    color: rgba(197, 168, 124, 0.6);
                    margin-bottom: 2.5rem;
                    opacity: 0;
                    transform: translateY(-8px);
                    transition: opacity 0.5s ease, transform 0.5s ease;
                }

                .badge-restrito.visivel {
                    opacity: 1;
                    transform: translateY(0);
                }

                .badge-dot {
                    width: 5px;
                    height: 5px;
                    border-radius: 50%;
                    background: rgba(197, 168, 124, 0.5);
                    animation: pulsar 2s ease-in-out infinite;
                }

                @keyframes pulsar {
                    0%, 100% { opacity: 0.5; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.3); }
                }

                /* Card */
                .card {
                    width: 100%;
                    max-width: 420px;
                    opacity: 0;
                    transform: translateY(16px);
                    transition: opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s;
                }

                .card.visivel {
                    opacity: 1;
                    transform: translateY(0);
                }

                /* Logo */
                .logo-area {
                    text-align: center;
                    margin-bottom: 2.5rem;
                }

                .logo {
                    font-family: 'Cormorant Garamond', serif;
                    font-size: 1.9rem;
                    font-weight: 600;
                    color: rgba(255,255,255,0.9);
                    letter-spacing: 0.02em;
                    line-height: 1;
                }

                .logo small {
                    display: block;
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.62rem;
                    font-weight: 400;
                    letter-spacing: 0.28em;
                    text-transform: uppercase;
                    color: rgba(197, 168, 124, 0.6);
                    margin-top: 0.4rem;
                }

                /* Formulário */
                .form-wrapper {
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(197, 168, 124, 0.12);
                    border-radius: 6px;
                    padding: 2.5rem;
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                }

                .form-titulo {
                    font-family: 'Cormorant Garamond', serif;
                    font-size: 1.35rem;
                    font-weight: 400;
                    color: rgba(255,255,255,0.75);
                    margin-bottom: 0.3rem;
                }

                .form-subtitulo {
                    font-size: 0.75rem;
                    color: rgba(255,255,255,0.25);
                    font-weight: 300;
                    letter-spacing: 0.04em;
                    margin-bottom: 2rem;
                }

                .divisor {
                    height: 1px;
                    background: linear-gradient(to right, rgba(197,168,124,0.2), transparent);
                    margin-bottom: 2rem;
                }

                .campo {
                    margin-bottom: 1.25rem;
                }

                .campo label {
                    display: block;
                    font-size: 0.68rem;
                    font-weight: 500;
                    letter-spacing: 0.18em;
                    text-transform: uppercase;
                    color: rgba(197, 168, 124, 0.7);
                    margin-bottom: 0.55rem;
                }

                .input-wrapper {
                    position: relative;
                }

                .campo input {
                    width: 100%;
                    padding: 0.85rem 1rem;
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(197, 168, 124, 0.18);
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
                    border-color: rgba(197, 168, 124, 0.5);
                    background: rgba(255,255,255,0.07);
                }

                /* Campo senha com botão de visibilidade */
                .campo input.com-icone { padding-right: 3rem; }

                .btn-visibilidade {
                    position: absolute;
                    right: 0.85rem;
                    top: 50%;
                    transform: translateY(-50%);
                    background: none;
                    border: none;
                    cursor: pointer;
                    color: rgba(197,168,124,0.45);
                    transition: color 0.2s;
                    display: flex;
                    align-items: center;
                    padding: 0;
                    line-height: 1;
                }

                .btn-visibilidade:hover { color: rgba(197,168,124,0.8); }

                /* Erro */
                .erro {
                    display: flex;
                    align-items: flex-start;
                    gap: 0.6rem;
                    padding: 0.85rem 1rem;
                    background: rgba(235, 87, 87, 0.08);
                    border: 1px solid rgba(235, 87, 87, 0.2);
                    border-radius: 3px;
                    color: #f08080;
                    font-size: 0.8rem;
                    font-weight: 300;
                    margin-bottom: 1.5rem;
                    line-height: 1.4;
                }

                .erro-icone {
                    width: 15px;
                    height: 15px;
                    min-width: 15px;
                    border-radius: 50%;
                    border: 1px solid rgba(235, 87, 87, 0.4);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.6rem;
                    font-weight: 700;
                    margin-top: 1px;
                    color: #f08080;
                }

                /* Botão */
                .btn-entrar {
                    width: 100%;
                    padding: 0.95rem;
                    background: rgba(197, 168, 124, 0.9);
                    color: #2a1810;
                    border: none;
                    border-radius: 3px;
                    font-family: 'DM Sans', sans-serif;
                    font-size: 0.75rem;
                    font-weight: 600;
                    letter-spacing: 0.22em;
                    text-transform: uppercase;
                    cursor: pointer;
                    margin-top: 0.75rem;
                    transition: background 0.2s, transform 0.1s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                }

                .btn-entrar:hover:not(:disabled) { background: rgba(197, 168, 124, 1); }
                .btn-entrar:active:not(:disabled) { transform: scale(0.99); }
                .btn-entrar:disabled { opacity: 0.35; cursor: not-allowed; }

                .loader-dot {
                    width: 4px;
                    height: 4px;
                    border-radius: 50%;
                    background: currentColor;
                    animation: bounce 1.1s ease-in-out infinite;
                }
                .loader-dot:nth-child(2) { animation-delay: 0.15s; }
                .loader-dot:nth-child(3) { animation-delay: 0.3s; }

                @keyframes bounce {
                    0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
                    40% { transform: translateY(-4px); opacity: 1; }
                }

                /* Rodapé */
                .rodape-link {
                    text-align: center;
                    margin-top: 2rem;
                    font-size: 0.72rem;
                    color: rgba(255,255,255,0.2);
                    font-weight: 300;
                }

                .rodape-link a {
                    color: rgba(197, 168, 124, 0.45);
                    text-decoration: none;
                    transition: color 0.2s;
                }

                .rodape-link a:hover { color: rgba(197, 168, 124, 0.8); }

                /* Footer */
                .footer {
                    position: relative;
                    z-index: 1;
                    text-align: center;
                    padding: 1.25rem;
                    font-size: 0.65rem;
                    font-weight: 300;
                    letter-spacing: 0.1em;
                    color: rgba(255,255,255,0.12);
                    border-top: 1px solid rgba(255,255,255,0.04);
                }
            `}</style>

            <div className="pagina">
                <div className="fundo-gradiente" />
                <div className="fundo-grade" />

                <div className="centro">
                    {/* Badge */}
                    <div className={`badge-restrito ${mounted ? 'visivel' : ''}`}>
                        <span className="badge-dot" />
                        Acesso Restrito
                    </div>

                    <div className={`card ${mounted ? 'visivel' : ''}`}>
                        {/* Logo */}
                        <div className="logo-area">
                            <div className="logo">
                                LmLu Mattielo
                                <small>Painel Operacional</small>
                            </div>
                        </div>

                        {/* Formulário */}
                        <div className="form-wrapper">
                            <p className="form-titulo">Bem-vindo de volta</p>
                            <p className="form-subtitulo">Painel administrativo e operacional</p>
                            <div className="divisor" />

                            {erro && (
                                <div className="erro">
                                    <span className="erro-icone">!</span>
                                    {erro}
                                </div>
                            )}

                            <form onSubmit={handleLogin}>
                                <div className="campo">
                                    <label htmlFor="email">E-mail Corporativo</label>
                                    <input
                                        id="email"
                                        type="email"
                                        required
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="seu.nome@lmlumattielo.com.br"
                                        autoComplete="email"
                                    />
                                </div>

                                <div className="campo">
                                    <label htmlFor="senha">Senha de Acesso</label>
                                    <div className="input-wrapper">
                                        <input
                                            id="senha"
                                            type={senhaVisivel ? 'text' : 'password'}
                                            required
                                            value={senha}
                                            onChange={e => setSenha(e.target.value)}
                                            placeholder="••••••••"
                                            autoComplete="current-password"
                                            className="com-icone"
                                        />
                                        <button
                                            type="button"
                                            className="btn-visibilidade"
                                            onClick={() => setSenhaVisivel(v => !v)}
                                            aria-label={senhaVisivel ? 'Ocultar senha' : 'Mostrar senha'}
                                        >
                                            {senhaVisivel ? (
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                                                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                                                    <line x1="1" y1="1" x2="23" y2="23" />
                                                </svg>
                                            ) : (
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                    <circle cx="12" cy="12" r="3" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <button type="submit" disabled={loading} className="btn-entrar">
                                    {loading ? (
                                        <>
                                            <span className="loader-dot" />
                                            <span className="loader-dot" />
                                            <span className="loader-dot" />
                                        </>
                                    ) : 'Entrar no Sistema'}
                                </button>
                            </form>
                        </div>

                        <p className="rodape-link">
                            Precisa de acesso? <a href="mailto:admin@lmlumattielo.com.br">Fale com o administrador</a>
                        </p>
                    </div>
                </div>

                <footer className="footer">
                    LmLu Mattielo · Área restrita · {new Date().getFullYear()}
                </footer>
            </div>
        </>
    );
}