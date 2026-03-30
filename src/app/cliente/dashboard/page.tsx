// src/app/cliente/dashboard/page.tsx
// CORRIGIDO: antes era um Client Component que recebia clienteId e nomeCliente via props
// — mas pages em Next.js não recebem props arbitrárias de um componente pai.
// Isso significava que clienteId e nomeCliente eram sempre undefined.
//
// Agora é um Server Component que lê a sessão no servidor e passa os dados
// para o componente de UI (ClienteDashboardUI) que contém a interatividade.

import { redirect } from 'next/navigation'
import { verificarSessaoCliente } from '@/app/actions/auth'
import { obterHistoricoCliente } from '@/app/actions/cliente'
import ClienteDashboardUI from './ClienteDashboardUI'
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Meu Painel — LmLu Matiello',
}

export default async function ClienteDashboardPage() {
    // Lê a sessão no servidor — seguro, sem exposição de token ao browser
    const sessao = await verificarSessaoCliente()

    if (!sessao.logado) {
        // Middleware já deveria redirecionar, mas esta é a segunda camada de defesa
        redirect('/login')
    }

    // Busca o histórico completo de agendamentos do cliente
    const resHistorico = await obterHistoricoCliente(sessao.id)

    const agendamentos = resHistorico.sucesso ? resHistorico.data.dados.agendamentos : []
    const totalGasto = resHistorico.sucesso ? resHistorico.data.dados.totalGasto : 0
    return (
        <ClienteDashboardUI
            clienteId={sessao.id}
            nomeCliente={sessao.nome}
            agendamentos={agendamentos}
            totalGasto={totalGasto}
        />
    )
}