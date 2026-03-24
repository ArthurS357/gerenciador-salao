// src/app/page.tsx
// CORRIGIDO: Server Component puro — sem 'use client', sem useEffect, sem waterfall de requests.
// Todos os dados são buscados em paralelo no servidor antes do primeiro byte ser enviado ao browser.
// Somente a interatividade (seleção de serviços, formulário) fica no client island <LandingInterativo>.

import Navbar from '@/components/landing/Navbar'
import Hero from '@/components/landing/Hero'
import Sobre from '@/components/landing/Sobre'
import Localizacao from '@/components/landing/Localizacao'
import Footer from '@/components/landing/Footer'
import LandingInterativo from './_components/LandingInterativo'

import { buscarProfissionais } from '@/app/actions/profissionais'
import { listarServicosPublicos } from '@/app/actions/servico'
import { listarPortfolioPublico } from '@/app/actions/portfolio'
import { verificarSessaoCliente, verificarSessaoFuncionario } from '@/app/actions/auth'
import type { SessaoProps } from '@/components/landing/Navbar'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'LmLu Matiello — Studio de Beleza',
  description: 'Onde a beleza encontra a excelência. Agende online seu horário.',
}

export default async function LandingPage() {
  // Todos os fetches em paralelo — sem waterfall
  const [
    resProfissionais,
    resSessaoCliente,
    resSessaoFunc,
    resServicos,
    resPortfolio,
  ] = await Promise.all([
    buscarProfissionais(),
    verificarSessaoCliente(),
    verificarSessaoFuncionario(),
    listarServicosPublicos(),
    listarPortfolioPublico(),
  ])

  const profissionais = resProfissionais.sucesso ? resProfissionais.profissionais : []
  const catalogoServicos = resServicos.sucesso ? resServicos.servicos : []
  const itensPortfolio = resPortfolio.sucesso ? resPortfolio.itens : []

  // Resolve a sessão com precedência: funcionário > cliente > anônimo
  let sessao: SessaoProps = { logado: false }

  if (resSessaoFunc.logado) {
    sessao = {
      logado: true,
      id: resSessaoFunc.id,
      role: resSessaoFunc.role,   // 'ADMIN' | 'PROFISSIONAL'
      nome: resSessaoFunc.nome,
    }
  } else if (resSessaoCliente.logado) {
    sessao = {
      logado: true,
      id: resSessaoCliente.id,
      role: 'CLIENTE',
      nome: resSessaoCliente.nome,
    }
  }

  return (
    <>
      {/* Navbar é 'use client' internamente (scroll, menu) — recebe dados via props */}
      <Navbar sessao={sessao} />

      {/* Seções estáticas renderizadas no servidor */}
      <Hero />
      <Sobre />

      {/**
             * Client island: contém ServicosVitrine, PortfolioGaleria e FormularioReserva.
             * Tudo que precisa de useState/useRouter fica aqui.
             * Os dados já chegam prontos do servidor — sem fetch no browser.
             */}
      <LandingInterativo
        profissionais={profissionais}
        catalogoServicos={catalogoServicos}
        itensPortfolio={itensPortfolio}
        sessao={sessao}
      />

      {/* Seções estáticas renderizadas no servidor */}
      <Localizacao />
      <Footer />
    </>
  )
}