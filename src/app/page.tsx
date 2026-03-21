'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import Sobre from '@/components/landing/Sobre'; // NOVO COMPONENTE
import ServicosVitrine from '@/components/landing/ServicosVitrine';
import PortfolioGaleria from '@/components/landing/PortfolioGaleria'; // NOVO COMPONENTE
import FormularioReserva from '@/components/landing/FormularioReserva';
import Footer from '@/components/landing/Footer';

import { buscarProfissionais } from '@/app/actions/profissionais';
import { criarAgendamentoMultiplo } from '@/app/actions/agendamento';
import { verificarSessaoCliente } from '@/app/actions/auth';
import { listarServicosPublicos } from '@/app/actions/servico';
import { listarPortfolioPublico } from '@/app/actions/portfolio'; // NOVA AÇÃO DE BANCO

export default function LandingPage() {
  const router = useRouter();
  const [profissionais, setProfissionais] = useState<{ id: string; nome: string; fotoUrl: string | null }[]>([]);
  const [catalogoServicos, setCatalogoServicos] = useState<any[]>([]);
  const [itensPortfolio, setItensPortfolio] = useState<any[]>([]); // ESTADO DO PORTFÓLIO
  const [sessao, setSessao] = useState({ logado: false, id: '' });
  const [mounted, setMounted] = useState(false);

  const [servicosSelecionados, setServicosSelecionados] = useState<string[]>([]);
  const [profissionalId, setProfissionalId] = useState('');
  const [dataHora, setDataHora] = useState('');
  const [mensagem, setMensagem] = useState({ texto: '', tipo: '' });

  useEffect(() => {
    setMounted(true);
    async function carregarDadosIniciais() {
      // Fazemos o fetch de tudo simultaneamente para não atrasar a tela
      const [resProfissionais, resSessao, resServicos, resPortfolio] = await Promise.all([
        buscarProfissionais(),
        verificarSessaoCliente(),
        listarServicosPublicos(),
        listarPortfolioPublico()
      ]);

      if (resProfissionais.sucesso) setProfissionais(resProfissionais.profissionais);
      if (resServicos.sucesso) setCatalogoServicos(resServicos.servicos);
      if (resPortfolio.sucesso) setItensPortfolio(resPortfolio.itens); // CARREGA AS FOTOS DO INSTAGRAM

      setSessao({ logado: resSessao.logado, id: resSessao.id ?? '' });
    }
    carregarDadosIniciais();
  }, []);

  const toggleServico = (id: string) => {
    setServicosSelecionados(prev =>
      prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
    );
  };

  const handleAgendar = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sessao.logado) {
      setMensagem({ texto: 'Para agendar, faça login com a sua conta. A redirecionar...', tipo: 'erro' });
      setTimeout(() => router.push('/login'), 2500);
      return;
    }

    if (servicosSelecionados.length === 0) {
      setMensagem({ texto: 'Por favor, selecione pelo menos um serviço do nosso portfólio.', tipo: 'erro' });
      return;
    }

    setMensagem({ texto: 'A processar reserva...', tipo: 'info' });

    const res = await criarAgendamentoMultiplo(
      sessao.id,
      profissionalId,
      new Date(dataHora),
      servicosSelecionados
    );

    if (res.sucesso) {
      setMensagem({ texto: 'Agendamento confirmado com sucesso! A redirecionar...', tipo: 'sucesso' });
      setTimeout(() => router.push('/cliente/dashboard'), 2500);
    } else {
      setMensagem({ texto: res.erro || 'Erro ao agendar.', tipo: 'erro' });
    }
  };

  const totalSelecionado = catalogoServicos
    .filter(s => servicosSelecionados.includes(s.id))
    .reduce((acc, s) => acc + (s.preco || 0), 0);

  return (
    <>
      <Navbar sessao={sessao} />
      <Hero mounted={mounted} />

      {/* SEÇÃO SOBRE FICA LOGO ABAIXO DO HERO */}
      <Sobre />

      <ServicosVitrine
        catalogoServicos={catalogoServicos}
        servicosSelecionados={servicosSelecionados}
        toggleServico={toggleServico}
        totalSelecionado={totalSelecionado}
      />

      {/* SEÇÃO DO PORTFÓLIO (Só renderiza se o Admin tiver cadastrado algo no BD) */}
      {itensPortfolio.length > 0 && (
        <PortfolioGaleria itensPortfolio={itensPortfolio} />
      )}

      <FormularioReserva
        sessao={sessao}
        mounted={mounted}
        profissionais={profissionais}
        catalogoServicos={catalogoServicos}
        servicosSelecionados={servicosSelecionados}
        totalSelecionado={totalSelecionado}
        profissionalId={profissionalId}
        setProfissionalId={setProfissionalId}
        dataHora={dataHora}
        setDataHora={setDataHora}
        mensagem={mensagem}
        handleAgendar={handleAgendar}
        profissionalSelecionado={
          profissionais.find(p => p.id === profissionalId)
        }
      />
      <Footer />
    </>
  );
}