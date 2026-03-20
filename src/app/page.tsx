'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { buscarProfissionais } from '@/app/actions/profissionais';
import { criarAgendamentoComBuffer } from '@/app/actions/agendamento';
import { verificarSessaoCliente } from '@/app/actions/auth'; // ✅ NOVO

const CATALOGO_SERVICOS = [
  { id: '1', nome: 'Colorimetria Completa', tempoMinutos: 210, preco: 450.00, descricao: 'Transformação total com técnicas exclusivas' },
  { id: '2', nome: 'Corte e Selagem', tempoMinutos: 100, preco: 180.00, descricao: 'Precisão e brilho em cada fio' },
  { id: '3', nome: 'Design de Sobrancelhas', tempoMinutos: 30, preco: 60.00, descricao: 'Harmonização que emoldura o olhar' },
];

export default function LandingPage() {
  const [profissionais, setProfissionais] = useState<{ id: string, nome: string }[]>([]);
  const [servicoId, setServicoId] = useState('');
  const [profissionalId, setProfissionalId] = useState('');
  const [dataHora, setDataHora] = useState('');
  const [mensagem, setMensagem] = useState({ texto: '', tipo: '' });
  const [mounted, setMounted] = useState(false);
  const [clienteLogado, setClienteLogado] = useState(false); // ✅ NOVO
  const router = useRouter(); // ✅ NOVO

  useEffect(() => {
    setMounted(true);

    async function carregar() {
      const [resProfissionais, resSessao] = await Promise.all([
        buscarProfissionais(),
        verificarSessaoCliente(), // ✅ NOVO: verifica sessão em paralelo
      ]);

      if (resProfissionais.sucesso) setProfissionais(resProfissionais.profissionais);
      setClienteLogado(resSessao.logado); // ✅ NOVO
    }

    carregar();
  }, []);

  const handleAgendar = async (e: React.FormEvent) => {
    e.preventDefault();

    // ✅ NOVO: trava o formulário se não estiver logado, redireciona para login
    if (!clienteLogado) {
      router.push('/login');
      return;
    }

    setMensagem({ texto: 'Processando reserva...', tipo: 'info' });

    const servicoSelecionado = CATALOGO_SERVICOS.find(s => s.id === servicoId);
    if (!servicoSelecionado) return;

    // ✅ NOVO: busca o ID real da sessão em vez do ID temporário
    const sessao = await verificarSessaoCliente();
    if (!sessao.logado || !sessao.id) {
      router.push('/login');
      return;
    }

    const res = await criarAgendamentoComBuffer(
      sessao.id, // ✅ ID real do cliente autenticado
      profissionalId,
      new Date(dataHora),
      servicoSelecionado.tempoMinutos,
      servicoSelecionado.preco
    );

    if (res.sucesso) {
      setMensagem({ texto: 'Agendamento confirmado com sucesso!', tipo: 'sucesso' });
    } else {
      setMensagem({ texto: res.erro || 'Erro ao agendar.', tipo: 'erro' });
    }
  };

  const servicoAtual = CATALOGO_SERVICOS.find(s => s.id === servicoId);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400;1,600&family=DM+Sans:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --marrom-profundo: #2a1810;
          --marrom-medio: #5C4033;
          --marrom-claro: #8B5A2B;
          --caramelo: #c5a87c;
          --creme: #f7f3ee;
          --creme-escuro: #ede5d8;
          --bege-borda: #ddd0bc;
          --texto-suave: #9c8070;
        }

        html { scroll-behavior: smooth; }

        body {
          font-family: 'DM Sans', sans-serif;
          background: var(--creme);
          color: var(--marrom-profundo);
        }

        .nav {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 4rem;
          background: rgba(247, 243, 238, 0.92);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(197, 168, 124, 0.2);
        }

        @media (max-width: 768px) {
          .nav { padding: 1rem 1.5rem; }
          .nav-links { display: none; }
        }

        .nav-logo {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--marrom-profundo);
          letter-spacing: 0.02em;
          text-decoration: none;
        }

        .nav-logo small {
          display: block;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.6rem;
          font-weight: 400;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: var(--caramelo);
          margin-top: 1px;
        }

        .nav-links {
          display: flex;
          gap: 2.5rem;
          align-items: center;
        }

        .nav-links a {
          font-size: 0.72rem;
          font-weight: 500;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--texto-suave);
          text-decoration: none;
          transition: color 0.2s;
        }

        .nav-links a:hover { color: var(--marrom-medio); }

        .nav-btn {
          padding: 0.6rem 1.5rem;
          background: transparent;
          border: 1.5px solid var(--marrom-medio);
          border-radius: 2px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.72rem;
          font-weight: 500;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--marrom-medio);
          cursor: pointer;
          transition: all 0.2s;
          text-decoration: none;
          display: inline-block;
        }

        .nav-btn:hover {
          background: var(--marrom-medio);
          color: white;
        }

        .hero {
          min-height: 100svh;
          display: grid;
          grid-template-columns: 1fr 1fr;
          padding-top: 5rem;
          background: var(--marrom-profundo);
          overflow: hidden;
        }

        @media (max-width: 768px) {
          .hero { grid-template-columns: 1fr; }
          .hero-visual { height: 240px; order: -1; }
        }

        .hero-conteudo {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 5rem 4rem;
          opacity: 0;
          transform: translateX(-20px);
          transition: opacity 0.8s ease, transform 0.8s ease;
        }

        .hero-conteudo.visivel {
          opacity: 1;
          transform: translateX(0);
        }

        @media (max-width: 768px) {
          .hero-conteudo { padding: 3rem 1.5rem; }
        }

        .hero-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.7rem;
          font-weight: 500;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: var(--caramelo);
          margin-bottom: 2rem;
        }

        .hero-tag::before {
          content: '';
          display: block;
          width: 32px;
          height: 1px;
          background: var(--caramelo);
        }

        .hero-titulo {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(3rem, 5vw, 4.5rem);
          font-weight: 300;
          color: white;
          line-height: 1.1;
          margin-bottom: 1.5rem;
        }

        .hero-titulo em {
          font-style: italic;
          color: var(--caramelo);
        }

        .hero-desc {
          font-size: 0.95rem;
          font-weight: 300;
          color: rgba(255,255,255,0.55);
          line-height: 1.8;
          max-width: 400px;
          margin-bottom: 3rem;
        }

        .hero-acoes {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .btn-primario {
          padding: 0.9rem 2rem;
          background: var(--caramelo);
          color: var(--marrom-profundo);
          border: none;
          border-radius: 2px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.78rem;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s;
          text-decoration: none;
          display: inline-block;
        }

        .btn-primario:hover { background: #d4b896; }

        .btn-secundario {
          padding: 0.9rem 2rem;
          background: transparent;
          color: rgba(255,255,255,0.7);
          border: 1px solid rgba(255,255,255,0.25);
          border-radius: 2px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.78rem;
          font-weight: 400;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secundario:hover {
          border-color: rgba(255,255,255,0.6);
          color: white;
        }

        .hero-visual {
          position: relative;
          overflow: hidden;
        }

        .hero-visual::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 70% 60% at 40% 50%, rgba(197, 168, 124, 0.2) 0%, transparent 70%),
            radial-gradient(ellipse 100% 100% at 100% 0%, rgba(139, 90, 43, 0.15) 0%, transparent 50%);
          z-index: 1;
        }

        .hero-visual-grade {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(197,168,124,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(197,168,124,0.06) 1px, transparent 1px);
          background-size: 60px 60px;
          z-index: 0;
        }

        .hero-numero {
          position: absolute;
          bottom: 3rem;
          left: 3rem;
          z-index: 2;
          display: flex;
          gap: 3rem;
        }

        @media (max-width: 768px) {
          .hero-numero { bottom: 1.5rem; left: 1.5rem; gap: 2rem; }
        }

        .stat { display: flex; flex-direction: column; }

        .stat-num {
          font-family: 'Cormorant Garamond', serif;
          font-size: 2.5rem;
          font-weight: 300;
          color: var(--caramelo);
          line-height: 1;
        }

        .stat-label {
          font-size: 0.65rem;
          font-weight: 400;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.35);
          margin-top: 0.35rem;
        }

        .secao-servicos {
          padding: 7rem 4rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        @media (max-width: 768px) {
          .secao-servicos { padding: 4rem 1.5rem; }
        }

        .secao-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 3.5rem;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .secao-tag {
          font-size: 0.68rem;
          font-weight: 500;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: var(--caramelo);
          margin-bottom: 0.75rem;
        }

        .secao-titulo {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(2rem, 3vw, 2.75rem);
          font-weight: 400;
          color: var(--marrom-profundo);
          line-height: 1.15;
        }

        .secao-titulo em { font-style: italic; color: var(--marrom-claro); }

        .grade-servicos {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5px;
          background: var(--bege-borda);
          border: 1.5px solid var(--bege-borda);
          border-radius: 4px;
          overflow: hidden;
        }

        .card-servico {
          background: white;
          padding: 2.5rem;
          transition: background 0.2s;
          cursor: default;
        }

        .card-servico:hover { background: #faf6f1; }

        .servico-icone {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--creme-escuro);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
          font-size: 1rem;
        }

        .servico-nome {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.35rem;
          font-weight: 600;
          color: var(--marrom-profundo);
          margin-bottom: 0.5rem;
        }

        .servico-desc {
          font-size: 0.8rem;
          color: var(--texto-suave);
          font-weight: 300;
          line-height: 1.6;
          margin-bottom: 1.5rem;
        }

        .servico-rodape {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 1.5rem;
          border-top: 1px solid var(--creme-escuro);
        }

        .servico-preco {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.5rem;
          font-weight: 300;
          color: var(--marrom-claro);
        }

        .servico-tempo {
          font-size: 0.7rem;
          font-weight: 400;
          letter-spacing: 0.1em;
          color: var(--texto-suave);
          text-transform: uppercase;
        }

        .secao-agendamento {
          background: var(--marrom-profundo);
          padding: 7rem 4rem;
        }

        @media (max-width: 768px) {
          .secao-agendamento { padding: 4rem 1.5rem; }
        }

        .agendamento-inner {
          max-width: 820px;
          margin: 0 auto;
        }

        .agendamento-header {
          text-align: center;
          margin-bottom: 3.5rem;
        }

        .agendamento-titulo {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(2rem, 3vw, 2.75rem);
          font-weight: 300;
          color: white;
          margin-bottom: 0.75rem;
        }

        .agendamento-subtitulo {
          font-size: 0.82rem;
          color: rgba(255,255,255,0.4);
          font-weight: 300;
          letter-spacing: 0.05em;
        }

        /* ✅ NOVO: aviso de login necessário */
        .aviso-login {
          padding: 1.25rem 1.5rem;
          background: rgba(197, 168, 124, 0.07);
          border: 1px solid rgba(197, 168, 124, 0.2);
          border-radius: 3px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
          margin-bottom: 1.75rem;
        }

        .aviso-login p {
          font-size: 0.8rem;
          color: rgba(255,255,255,0.45);
          font-weight: 300;
        }

        .aviso-login p strong {
          color: var(--caramelo);
          font-weight: 500;
        }

        .aviso-login-link {
          padding: 0.5rem 1.25rem;
          background: transparent;
          border: 1px solid rgba(197, 168, 124, 0.35);
          border-radius: 2px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.7rem;
          font-weight: 500;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--caramelo);
          text-decoration: none;
          white-space: nowrap;
          transition: all 0.2s;
        }

        .aviso-login-link:hover {
          background: rgba(197, 168, 124, 0.1);
          border-color: rgba(197, 168, 124, 0.6);
        }

        .form-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(197, 168, 124, 0.15);
          border-radius: 4px;
          padding: 3rem;
          backdrop-filter: blur(4px);
        }

        @media (max-width: 768px) {
          .form-card { padding: 1.75rem; }
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
          margin-bottom: 1.25rem;
        }

        @media (max-width: 600px) {
          .form-grid { grid-template-columns: 1fr; }
        }

        .campo-form label {
          display: block;
          font-size: 0.68rem;
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(197, 168, 124, 0.8);
          margin-bottom: 0.6rem;
        }

        .campo-form select,
        .campo-form input {
          width: 100%;
          padding: 0.9rem 1rem;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(197, 168, 124, 0.2);
          border-radius: 3px;
          color: rgba(255,255,255,0.85);
          font-family: 'DM Sans', sans-serif;
          font-size: 0.875rem;
          font-weight: 300;
          outline: none;
          transition: border-color 0.2s, background 0.2s;
          -webkit-appearance: none;
          appearance: none;
        }

        /* ✅ Inputs desabilitados quando não logado */
        .campo-form select:disabled,
        .campo-form input:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .campo-form select {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='7' fill='none'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23c5a87c' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 1rem center;
          padding-right: 2.5rem;
        }

        .campo-form select option {
          background: #2a1810;
          color: white;
        }

        .campo-form select:focus,
        .campo-form input:focus {
          border-color: rgba(197, 168, 124, 0.6);
          background: rgba(255,255,255,0.09);
        }

        .campo-form input[type="datetime-local"]::-webkit-calendar-picker-indicator {
          filter: invert(0.6) sepia(1) saturate(0.5) hue-rotate(340deg);
          cursor: pointer;
        }

        .preview-servico {
          margin: 1.25rem 0;
          padding: 1rem 1.25rem;
          background: rgba(197, 168, 124, 0.08);
          border: 1px solid rgba(197, 168, 124, 0.2);
          border-radius: 3px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.8rem;
          color: rgba(255,255,255,0.5);
          animation: fadeIn 0.3s ease;
        }

        .preview-servico strong {
          color: var(--caramelo);
          font-weight: 500;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .mensagem-feedback {
          padding: 0.9rem 1.25rem;
          border-radius: 3px;
          font-size: 0.82rem;
          font-weight: 400;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }

        .feedback-sucesso {
          background: rgba(52, 199, 89, 0.1);
          border: 1px solid rgba(52, 199, 89, 0.25);
          color: #6fcf97;
        }

        .feedback-erro {
          background: rgba(235, 87, 87, 0.1);
          border: 1px solid rgba(235, 87, 87, 0.25);
          color: #f08080;
        }

        .feedback-info {
          background: rgba(197, 168, 124, 0.1);
          border: 1px solid rgba(197, 168, 124, 0.2);
          color: var(--caramelo);
        }

        .btn-confirmar {
          width: 100%;
          padding: 1rem;
          background: var(--caramelo);
          color: var(--marrom-profundo);
          border: none;
          border-radius: 3px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.78rem;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          cursor: pointer;
          margin-top: 1.5rem;
          transition: background 0.2s, transform 0.1s;
        }

        .btn-confirmar:hover:not(:disabled) { background: #d4b896; }
        .btn-confirmar:active:not(:disabled) { transform: scale(0.99); }
        .btn-confirmar:disabled { opacity: 0.4; cursor: not-allowed; }

        footer {
          background: #1a0f0a;
          padding: 2.5rem 4rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
          border-top: 1px solid rgba(197, 168, 124, 0.1);
        }

        @media (max-width: 768px) {
          footer { padding: 2rem 1.5rem; flex-direction: column; text-align: center; }
        }

        .footer-logo {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.1rem;
          font-weight: 600;
          color: rgba(255,255,255,0.5);
        }

        .footer-copy {
          font-size: 0.7rem;
          color: rgba(255,255,255,0.2);
          font-weight: 300;
          letter-spacing: 0.08em;
        }
      `}</style>

      {/* ── NAV ── */}
      <nav className="nav">
        <a href="#" className="nav-logo">
          LmLu Mattielo
          <small>Studio de Beleza</small>
        </a>
        <div className="nav-links">
          <a href="#servicos">Serviços</a>
          <a href="#agendamento">Agendar</a>
          <a href="#contato">Contato</a>
        </div>
        {/* ✅ NOVO: Link real em vez de <button> estático */}
        <Link href="/login-profissional" className="nav-btn">
          Acesso Profissional
        </Link>
      </nav>

      {/* ── HERO ── */}
      <section className="hero">
        <div className={`hero-conteudo ${mounted ? 'visivel' : ''}`}>
          <span className="hero-tag">Salão de Alto Padrão</span>
          <h1 className="hero-titulo">
            Onde a <em>beleza</em><br />
            encontra a<br />
            excelência
          </h1>
          <p className="hero-desc">
            Experiência premium em cuidados capilares e estéticos.
            Tecnologia e sofisticação em cada detalhe do seu atendimento.
          </p>
          <div className="hero-acoes">
            <a href="#servicos" className="btn-primario">Ver Serviços</a>
            <button className="btn-secundario">Agendar por Telefone</button>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-visual-grade" />
          <div className="hero-numero">
            <div className="stat">
              <span className="stat-num">8+</span>
              <span className="stat-label">Anos de experiência</span>
            </div>
            <div className="stat">
              <span className="stat-num">2k</span>
              <span className="stat-label">Clientes atendidas</span>
            </div>
            <div className="stat">
              <span className="stat-num">100%</span>
              <span className="stat-label">Satisfação</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── SERVIÇOS ── */}
      <section id="servicos" className="secao-servicos">
        <div className="secao-header">
          <div>
            <p className="secao-tag">O que oferecemos</p>
            <h2 className="secao-titulo">
              Tratamentos pensados<br />
              para <em>realçar</em> você
            </h2>
          </div>
        </div>

        <div className="grade-servicos">
          {CATALOGO_SERVICOS.map((s, i) => (
            <div key={s.id} className="card-servico">
              <div className="servico-icone">{['✦', '◈', '◉'][i]}</div>
              <div className="servico-nome">{s.nome}</div>
              <div className="servico-desc">{s.descricao}</div>
              <div className="servico-rodape">
                <span className="servico-preco">R$ {s.preco.toFixed(2)}</span>
                <span className="servico-tempo">{s.tempoMinutos} min</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── AGENDAMENTO ── */}
      <section id="agendamento" className="secao-agendamento">
        <div className="agendamento-inner">
          <div className="agendamento-header">
            <p className="secao-tag" style={{ color: 'rgba(197,168,124,0.6)' }}>Reserve seu horário</p>
            <h2 className="agendamento-titulo">Agendamento Online</h2>
            <p className="agendamento-subtitulo">Escolha o serviço, profissional e horário ideal para você</p>
          </div>

          <div className="form-card">

            {/* ✅ NOVO: aviso contextual quando não logado */}
            {mounted && !clienteLogado && (
              <div className="aviso-login">
                <p>
                  Para finalizar seu agendamento,{' '}
                  <strong>faça login com seu WhatsApp</strong>.
                </p>
                <Link href="/login" className="aviso-login-link">
                  Entrar
                </Link>
              </div>
            )}

            {mensagem.texto && (
              <div className={`mensagem-feedback ${mensagem.tipo === 'erro' ? 'feedback-erro' :
                  mensagem.tipo === 'sucesso' ? 'feedback-sucesso' :
                    'feedback-info'
                }`}>
                {mensagem.tipo === 'sucesso' && '✓ '}
                {mensagem.tipo === 'erro' && '✕ '}
                {mensagem.texto}
              </div>
            )}

            <form onSubmit={handleAgendar}>
              <div className="form-grid">
                <div className="campo-form">
                  <label>Serviço</label>
                  {/* ✅ Desabilita campos se não logado */}
                  <select
                    required
                    value={servicoId}
                    onChange={e => setServicoId(e.target.value)}
                    disabled={!clienteLogado}
                  >
                    <option value="">Selecionar serviço...</option>
                    {CATALOGO_SERVICOS.map(s => (
                      <option key={s.id} value={s.id}>{s.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="campo-form">
                  <label>Profissional</label>
                  <select
                    required
                    value={profissionalId}
                    onChange={e => setProfissionalId(e.target.value)}
                    disabled={!clienteLogado}
                  >
                    <option value="">Qualquer profissional</option>
                    {profissionais.map(p => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="campo-form">
                <label>Data e Horário</label>
                <input
                  type="datetime-local"
                  required
                  value={dataHora}
                  onChange={e => setDataHora(e.target.value)}
                  disabled={!clienteLogado}
                />
              </div>

              {servicoAtual && (
                <div className="preview-servico">
                  <span>{servicoAtual.nome} · {servicoAtual.tempoMinutos} min</span>
                  <strong>R$ {servicoAtual.preco.toFixed(2)}</strong>
                </div>
              )}

              <button
                type="submit"
                className="btn-confirmar"
                disabled={!clienteLogado}
              >
                {clienteLogado ? 'Confirmar Reserva' : 'Faça login para agendar'}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer id="contato">
        <span className="footer-logo">LmLu Mattielo</span>
        <span className="footer-copy">© {new Date().getFullYear()} · Studio de Beleza · Todos os direitos reservados</span>
      </footer>
    </>
  );
}