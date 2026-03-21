'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import ServicosVitrine from '@/components/landing/ServicosVitrine';
import FormularioReserva from '@/components/landing/FormularioReserva';
import Footer from '@/components/landing/Footer';

import { buscarProfissionais } from '@/app/actions/profissionais';
import { criarAgendamentoMultiplo } from '@/app/actions/agendamento';
import { verificarSessaoCliente } from '@/app/actions/auth';
import { listarServicosPublicos } from '@/app/actions/servico';

export default function LandingPage() {
  const router = useRouter();
  const [profissionais, setProfissionais] = useState<{ id: string; nome: string; fotoUrl: string | null }[]>([]);
  const [catalogoServicos, setCatalogoServicos] = useState<any[]>([]);
  const [sessao, setSessao] = useState({ logado: false, id: '' });
  const [mounted, setMounted] = useState(false);

  const [servicosSelecionados, setServicosSelecionados] = useState<string[]>([]);
  const [profissionalId, setProfissionalId] = useState('');
  const [dataHora, setDataHora] = useState('');
  const [mensagem, setMensagem] = useState({ texto: '', tipo: '' });

  useEffect(() => {
    setMounted(true);
    async function carregarDadosIniciais() {
      const [resProfissionais, resSessao, resServicos] = await Promise.all([
        buscarProfissionais(),
        verificarSessaoCliente(),
        listarServicosPublicos(),
      ]);
      if (resProfissionais.sucesso) setProfissionais(resProfissionais.profissionais);
      if (resServicos.sucesso) setCatalogoServicos(resServicos.servicos);
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
      setMensagem({ texto: 'Por favor, selecione pelo menos um serviço do nosso portefólio.', tipo: 'erro' });
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
      <ServicosVitrine
        catalogoServicos={catalogoServicos}
        servicosSelecionados={servicosSelecionados}
        toggleServico={toggleServico}
        totalSelecionado={totalSelecionado}
      />
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
