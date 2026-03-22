'use client'
// src/app/page.tsx — Orquestrador da landing page
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

import Navbar from '@/components/landing/Navbar'
import Hero from '@/components/landing/Hero'
import Sobre from '@/components/landing/Sobre'
import ServicosVitrine from '@/components/landing/ServicosVitrine'
import PortfolioGaleria from '@/components/landing/PortfolioGaleria'
import FormularioReserva from '@/components/landing/FormularioReserva'
import Localizacao from '@/components/landing/Localizacao'
import Footer from '@/components/landing/Footer'

import { buscarProfissionais } from '@/app/actions/profissionais'
import { criarAgendamentoMultiplo } from '@/app/actions/agendamento'
import { verificarSessaoCliente, verificarSessaoFuncionario } from '@/app/actions/auth'
import { listarServicosPublicos } from '@/app/actions/servico'
import { listarPortfolioPublico } from '@/app/actions/portfolio'

import type { Profissional, Servico, ItemPortfolio, Sessao, Mensagem } from '@/components/landing/types'

export default function LandingPage() {
  const router = useRouter()

  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [catalogoServicos, setCatalogoServicos] = useState<Servico[]>([])
  const [itensPortfolio, setItensPortfolio] = useState<ItemPortfolio[]>([])
  const [sessao, setSessao] = useState<Sessao>({ logado: false })
  const [mounted, setMounted] = useState(false)

  const [servicosSelecionados, setServicosSelecionados] = useState<string[]>([])
  const [profissionalId, setProfissionalId] = useState('')
  const [dataHora, setDataHora] = useState('')
  const [mensagem, setMensagem] = useState<Mensagem>({ texto: '', tipo: '' })

  useEffect(() => {
    setMounted(true)

    async function carregarDados() {
      const [resProfissionais, resSessaoCliente, resSessaoFunc, resServicos, resPortfolio] =
        await Promise.all([
          buscarProfissionais(),
          verificarSessaoCliente(),
          verificarSessaoFuncionario(),
          listarServicosPublicos(),
          listarPortfolioPublico(),
        ])

      if (resProfissionais.sucesso) setProfissionais(resProfissionais.profissionais)
      if (resServicos.sucesso) setCatalogoServicos(resServicos.servicos)
      if (resPortfolio.sucesso) setItensPortfolio(resPortfolio.itens)

      // Prioridade: funcionário > cliente (um utilizador não pode ter os dois ao mesmo tempo
      // em condições normais, mas se existir os dois cookies priorizamos o funcionário)
      if (resSessaoFunc.logado) {
        setSessao({
          logado: true,
          id: resSessaoFunc.id,
          role: 'FUNCIONARIO',
          nome: resSessaoFunc.nome,
        })
      } else if (resSessaoCliente.logado) {
        // Para exibir o nome precisamos de o buscar — por ora usamos apenas o id
        setSessao({
          logado: true,
          id: resSessaoCliente.id,
          role: 'CLIENTE',
        })
      } else {
        setSessao({ logado: false })
      }
    }

    void carregarDados()
  }, [])

  const toggleServico = (id: string) =>
    setServicosSelecionados((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )

  const handleAgendar = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!sessao.logado || !sessao.id || sessao.role !== 'CLIENTE') {
      setMensagem({ texto: 'Para agendar, faça login com a sua conta. A redirecionar...', tipo: 'erro' })
      setTimeout(() => router.push('/login'), 2500)
      return
    }

    if (servicosSelecionados.length === 0) {
      setMensagem({ texto: 'Por favor, selecione pelo menos um serviço.', tipo: 'erro' })
      return
    }

    setMensagem({ texto: 'A processar reserva...', tipo: 'info' })

    const res = await criarAgendamentoMultiplo(
      sessao.id,
      profissionalId,
      new Date(dataHora),
      servicosSelecionados,
    )

    if (res.sucesso) {
      setMensagem({ texto: 'Agendamento confirmado! A redirecionar...', tipo: 'sucesso' })
      setTimeout(() => router.push('/cliente/dashboard'), 2500)
    } else {
      setMensagem({ texto: res.erro, tipo: 'erro' })
    }
  }

  const totalSelecionado = catalogoServicos
    .filter((s) => servicosSelecionados.includes(s.id))
    .reduce((acc, s) => acc + (s.preco ?? 0), 0)

  return (
    <>
      <Navbar sessao={sessao} />
      <Hero />
      <Sobre />
      <ServicosVitrine
        catalogoServicos={catalogoServicos}
        servicosSelecionados={servicosSelecionados}
        toggleServico={toggleServico}
        totalSelecionado={totalSelecionado}
      />
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
        profissionalSelecionado={profissionais.find((p) => p.id === profissionalId)}
      />
      <Localizacao />
      <Footer />
    </>
  )
}