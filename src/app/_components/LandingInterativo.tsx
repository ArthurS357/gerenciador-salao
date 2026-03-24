'use client'
// src/app/_components/LandingInterativo.tsx
// Client island: contém apenas o que precisa de estado no browser.
// Recebe todos os dados já hidratados do Server Component pai (page.tsx).
// CORRIGIDO: sem 'sessao as any', sem useEffect de fetch, sem carregamento client-side.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ServicosVitrine from '@/components/landing/ServicosVitrine'
import PortfolioGaleria from '@/components/landing/PortfolioGaleria'
import FormularioReserva from '@/components/landing/FormularioReserva'
import { criarAgendamentoMultiplo } from '@/app/actions/agendamento'
import type { SessaoProps } from '@/components/landing/Navbar'
import type { Profissional, Servico, ItemPortfolio, Mensagem } from '@/components/landing/types'

interface LandingInterativoProps {
    profissionais: Profissional[]
    catalogoServicos: Servico[]
    itensPortfolio: ItemPortfolio[]
    sessao: SessaoProps
}

export default function LandingInterativo({
    profissionais,
    catalogoServicos,
    itensPortfolio,
    sessao,
}: LandingInterativoProps) {
    const router = useRouter()

    const [servicosSelecionados, setServicosSelecionados] = useState<string[]>([])
    const [profissionalId, setProfissionalId] = useState('')
    const [dataHora, setDataHora] = useState('')
    const [mensagem, setMensagem] = useState<Mensagem>({ texto: '', tipo: '' })

    const toggleServico = (id: string) =>
        setServicosSelecionados(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        )

    const totalSelecionado = catalogoServicos
        .filter(s => servicosSelecionados.includes(s.id))
        .reduce((acc, s) => acc + (s.preco ?? 0), 0)

    const profissionalSelecionado = profissionais.find(p => p.id === profissionalId)

    const handleAgendar = async (e: React.FormEvent) => {
        e.preventDefault()

        // Garante que apenas clientes autenticados podem agendar
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

    // Converte SessaoProps (Navbar) → Sessao (landing/types) — ambos são compatíveis
    // agora que SessaoRole inclui 'PROFISSIONAL' | 'ADMIN'
    const sessaoParaFormulario = {
        logado: sessao.logado,
        id: sessao.id,
        role: sessao.role as 'CLIENTE' | 'PROFISSIONAL' | 'ADMIN' | undefined,
        nome: sessao.nome,
    }

    return (
        <>
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
                sessao={sessaoParaFormulario}
                mounted={true}                  // sempre true — client component renderiza após hydration
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
                profissionalSelecionado={profissionalSelecionado}
            />
        </>
    )
}