'use client'
// src/app/_components/LandingInterativo.tsx

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ServicosVitrine from '@/components/landing/ServicosVitrine'
import PortfolioGaleria from '@/components/landing/PortfolioGaleria'
import FormularioReserva from '@/components/landing/FormularioReserva'
import { criarAgendamentoMultiplo } from '@/app/actions/agendamento'
import type { SessaoProps } from '@/components/landing/Navbar'
import type { Profissional, Servico, ItemPortfolio, Mensagem, AgendamentoConfirmado } from '@/components/landing/types'

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

    // ── Estado de horários ────────────────────────────────────────────────────
    // dataHora: mantido para compatibilidade com single-service e exibição
    const [dataHora, setDataHora] = useState('')
    // agendamentosConfirmados: usado pelo wizard multi-service
    const [agendamentosConfirmados, setAgendamentosConfirmados] = useState<AgendamentoConfirmado[]>([])

    const [mensagem, setMensagem] = useState<Mensagem>({ texto: '', tipo: '' })

    const toggleServico = (id: string) => {
        setServicosSelecionados(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        )
        // Limpa horários ao alterar seleção de serviços
        setDataHora('')
        setAgendamentosConfirmados([])
    }

    const totalSelecionado = catalogoServicos
        .filter(s => servicosSelecionados.includes(s.id))
        .reduce((acc, s) => acc + (s.preco ?? 0), 0)

    const profissionalSelecionado = profissionais.find(p => p.id === profissionalId)

    // ── Agendamento ───────────────────────────────────────────────────────────
    const handleAgendar = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!sessao.logado || !sessao.id || sessao.role !== 'CLIENTE') {
            setMensagem({ texto: 'Para agendar, faça login com a sua conta. A redirecionar…', tipo: 'erro' })
            setTimeout(() => router.push('/login'), 2500)
            return
        }

        if (servicosSelecionados.length === 0) {
            setMensagem({ texto: 'Por favor, selecione pelo menos um serviço.', tipo: 'erro' })
            return
        }

        setMensagem({ texto: 'A processar reserva…', tipo: 'info' })

        // ── Multi-serviço: um agendamento por serviço ─────────────────────────
        if (agendamentosConfirmados.length > 1) {
            for (const ag of agendamentosConfirmados) {
                const dataHoraAg = new Date(`${ag.dataIso}T${ag.hora}:00`)
                const res = await criarAgendamentoMultiplo(
                    sessao.id,
                    profissionalId,
                    dataHoraAg,
                    [ag.servicoId],
                )
                if (!res.sucesso) {
                    const servico = catalogoServicos.find(s => s.id === ag.servicoId)
                    setMensagem({
                        texto: `Erro ao agendar ${servico?.nome ?? 'serviço'}: ${res.erro}`,
                        tipo: 'erro',
                    })
                    return
                }
            }

            setMensagem({ texto: 'Agendamentos confirmados! A redirecionar…', tipo: 'sucesso' })
            setTimeout(() => router.push('/cliente/dashboard'), 2500)
            return
        }

        // ── Single-service: fluxo original ────────────────────────────────────
        const res = await criarAgendamentoMultiplo(
            sessao.id,
            profissionalId,
            new Date(dataHora),
            servicosSelecionados,
        )

        if (res.sucesso) {
            setMensagem({ texto: 'Agendamento confirmado! A redirecionar…', tipo: 'sucesso' })
            setTimeout(() => router.push('/cliente/dashboard'), 2500)
        } else {
            setMensagem({ texto: res.erro, tipo: 'erro' })
        }
    }

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
                mounted={true}
                profissionais={profissionais}
                catalogoServicos={catalogoServicos}
                servicosSelecionados={servicosSelecionados}
                totalSelecionado={totalSelecionado}
                profissionalId={profissionalId}
                setProfissionalId={id => {
                    setProfissionalId(id)
                    // Reseta horários ao trocar profissional
                    setDataHora('')
                    setAgendamentosConfirmados([])
                }}
                dataHora={dataHora}
                setDataHora={setDataHora}
                agendamentosConfirmados={agendamentosConfirmados}
                setAgendamentosConfirmados={setAgendamentosConfirmados}
                mensagem={mensagem}
                handleAgendar={handleAgendar}
                profissionalSelecionado={profissionalSelecionado}
                toggleServico={toggleServico}
            />
        </>
    )
}