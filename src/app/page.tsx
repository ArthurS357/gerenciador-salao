'use client'

import { useState, useEffect } from 'react';
import { buscarProfissionais } from '@/app/actions/profissionais';
import { criarAgendamentoComBuffer } from '@/app/actions/agendamento';

// Catálogo de serviços baseado no escopo de negócios LmLuMattielo
const CATALOGO_SERVICOS = [
  { id: '1', nome: 'Colorimetria Completa', tempoMinutos: 210, preco: 450.00 },
  { id: '2', nome: 'Corte e Selagem', tempoMinutos: 100, preco: 180.00 },
  { id: '3', nome: 'Design de Sobrancelhas', tempoMinutos: 30, preco: 60.00 },
];

export default function LandingPage() {
  const [profissionais, setProfissionais] = useState<{ id: string, nome: string }[]>([]);
  const [servicoId, setServicoId] = useState('');
  const [profissionalId, setProfissionalId] = useState('');
  const [dataHora, setDataHora] = useState('');
  const [mensagem, setMensagem] = useState({ texto: '', tipo: '' });

  // Busca os profissionais assim que a página carrega
  useEffect(() => {
    async function carregar() {
      const res = await buscarProfissionais();
      if (res.sucesso) setProfissionais(res.profissionais);
    }
    carregar();
  }, []);

  const handleAgendar = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagem({ texto: 'Processando reserva...', tipo: 'info' });

    const servicoSelecionado = CATALOGO_SERVICOS.find(s => s.id === servicoId);
    if (!servicoSelecionado) return;

    // Em um fluxo real, pegaríamos o clienteId do cookie JWT da sessão logada.
    // Aqui usaremos um ID provisório para testar a mecânica do Buffer Invisível.
    const clienteIdTemporario = "cliente-logado-id";

    const res = await criarAgendamentoComBuffer(
      clienteIdTemporario,
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

  return (
    <div className="min-h-screen bg-[#fdfbf7] font-sans">

      {/* Navbar Minimalista */}
      <nav className="flex justify-between items-center px-10 py-6 border-b border-[#e5d9c5] bg-white">
        <div className="text-2xl font-serif font-bold text-[#5C4033]">LmLuMattielo</div>
        <div className="space-x-8 text-sm font-semibold text-[#5C4033] hidden md:block">
          <a href="#servicos" className="hover:text-[#8B5A2B]">SERVIÇOS</a>
          <a href="#equipe" className="hover:text-[#8B5A2B]">EQUIPE</a>
          <a href="#contato" className="hover:text-[#8B5A2B]">CONTATO</a>
        </div>
        <button className="bg-[#5C4033] text-white px-6 py-2 rounded font-medium hover:bg-[#3e2b22] transition-colors">
          Acesso Profissional
        </button>
      </nav>

      {/* Hero Section (Vitrine) */}
      <header className="relative bg-[#3e2b22] text-white py-32 px-10 overflow-hidden text-center md:text-left">
        <div className="relative z-10 max-w-3xl mx-auto md:mx-0">
          <p className="text-sm tracking-[0.2em] uppercase mb-4 text-[#d4c3b3]">Salão de Alto Padrão</p>
          <h1 className="text-5xl md:text-6xl font-serif mb-6 leading-tight">
            Onde a <i className="font-light">beleza</i> encontra a <br /> excelência
          </h1>
          <p className="text-lg text-[#e5d9c5] mb-10 max-w-xl leading-relaxed">
            Experiência premium em cuidados capilares e estéticos. Tecnologia e sofisticação em cada detalhe do seu atendimento.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button className="bg-white text-[#5C4033] px-8 py-3 rounded font-bold hover:bg-gray-100 transition-colors">
              Nossos Serviços
            </button>
            <button className="border border-white text-white px-8 py-3 rounded font-bold hover:bg-white hover:text-[#5C4033] transition-colors">
              Agendar por Telefone
            </button>
          </div>
        </div>
      </header>

      {/* Módulo de Agendamento Online */}
      <section className="py-20 px-4 max-w-4xl mx-auto">
        <div className="bg-white p-8 rounded-lg shadow-xl border border-[#e5d9c5]">
          <h2 className="text-3xl font-bold text-[#5C4033] mb-8 text-center">Agendamento Online</h2>

          {mensagem.texto && (
            <div className={`mb-6 p-4 rounded text-center font-semibold ${mensagem.tipo === 'erro' ? 'bg-red-100 text-red-700' : mensagem.tipo === 'sucesso' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
              {mensagem.texto}
            </div>
          )}

          <form onSubmit={handleAgendar} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Seleção de Serviço */}
              <div>
                <label className="block text-sm font-semibold text-[#5C4033] mb-2">Selecione o Serviço</label>
                <select
                  required
                  value={servicoId}
                  onChange={(e) => setServicoId(e.target.value)}
                  className="w-full border border-gray-300 rounded px-4 py-3 text-gray-800 focus:ring-2 focus:ring-[#8B5A2B] outline-none"
                >
                  <option value="">Escolha uma opção...</option>
                  {CATALOGO_SERVICOS.map(s => (
                    <option key={s.id} value={s.id}>{s.nome} - R$ {s.preco.toFixed(2)}</option>
                  ))}
                </select>
              </div>

              {/* Seleção de Profissional */}
              <div>
                <label className="block text-sm font-semibold text-[#5C4033] mb-2">Profissional</label>
                <select
                  required
                  value={profissionalId}
                  onChange={(e) => setProfissionalId(e.target.value)}
                  className="w-full border border-gray-300 rounded px-4 py-3 text-gray-800 focus:ring-2 focus:ring-[#8B5A2B] outline-none"
                >
                  <option value="">Qualquer profissional...</option>
                  {profissionais.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Data e Hora */}
            <div>
              <label className="block text-sm font-semibold text-[#5C4033] mb-2">Data e Horário</label>
              <input
                type="datetime-local"
                required
                value={dataHora}
                onChange={(e) => setDataHora(e.target.value)}
                className="w-full border border-gray-300 rounded px-4 py-3 text-gray-800 focus:ring-2 focus:ring-[#8B5A2B] outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#8B5A2B] text-white text-lg font-bold py-4 rounded hover:bg-[#704620] transition-colors mt-4"
            >
              Confirmar Reserva
            </button>
          </form>
        </div>
      </section>

    </div>
  );
}