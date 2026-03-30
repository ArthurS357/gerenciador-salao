'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { finalizarComanda } from '@/app/actions/comanda'

interface BotaoFinalizarComandaProps {
    agendamentoId: string;
    valorBruto: number;
    custoInsumosEstimado?: number; // Sugestão do sistema (calculado pelo front-end via ficha técnica)
}

export default function BotaoFinalizarComanda({
    agendamentoId,
    valorBruto,
    custoInsumosEstimado = 0,
}: BotaoFinalizarComandaProps) {
    const [carregando, setCarregando] = useState(false)
    const [mostrarModal, setMostrarModal] = useState(false)
    // Pré-populado com a estimativa da ficha técnica — operador confirma ou edita
    const [custoInsumos, setCustoInsumos] = useState(custoInsumosEstimado)
    const [taxaCartao, setTaxaCartao] = useState(3) // % padrão do adquirente
    const router = useRouter()

    const handleFinalizar = async () => {
        setCarregando(true)

        try {
            const res = await finalizarComanda(agendamentoId, taxaCartao, custoInsumos)

            if (res.sucesso) {
                const f = res.data.financeiro
                alert(
                    `✅ Comanda faturada com sucesso!\n\n` +
                    `Bruto: R$ ${f.bruto.toFixed(2)}\n` +
                    `Deduções: R$ ${f.deducoes.toFixed(2)}\n` +
                    `Repasse profissional: R$ ${f.comissao.toFixed(2)}\n` +
                    `Lucro do salão: R$ ${f.lucroSalao.toFixed(2)}`
                )
                router.push('/profissional/agenda')
            } else {
                alert(`Erro: ${res.erro}`)
                setMostrarModal(false)
                setCarregando(false)
            }
        } catch {
            alert('Ocorreu um erro técnico ao processar a fatura.')
            setMostrarModal(false)
            setCarregando(false)
        }
    }

    return (
        <>
            {/* Botão principal que abre o modal de confirmação */}
            <button
                onClick={() => setMostrarModal(true)}
                disabled={carregando}
                className="w-full md:w-auto bg-green-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center justify-center gap-2"
            >
                Concluir Agendamento e Faturar
            </button>

            {/* Modal de confirmação com campos editáveis (Abordagem Híbrida) */}
            {mostrarModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 9999, padding: '1rem'
                }}>
                    <div style={{
                        background: 'white', borderRadius: '12px', padding: '2rem',
                        maxWidth: '420px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
                    }}>
                        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: 700, color: '#1a1a1a' }}>
                            Confirmar Fechamento de Comanda
                        </h3>
                        <p style={{ margin: '0 0 1.5rem', fontSize: '0.85rem', color: '#666' }}>
                            Valor bruto: <strong>R$ {valorBruto.toFixed(2)}</strong>. Revise os valores abaixo antes de faturar.
                        </p>

                        {/* Custo de insumos — editável pelo operador (Abordagem Híbrida aprovada) */}
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#555', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Custo de Insumos (R$)
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={custoInsumos}
                                onChange={e => setCustoInsumos(Math.max(0, parseFloat(e.target.value) || 0))}
                                style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1.5px solid #ddd', borderRadius: '6px', fontSize: '0.95rem', boxSizing: 'border-box' }}
                            />
                            {custoInsumosEstimado > 0 && (
                                <p style={{ fontSize: '0.72rem', color: '#888', marginTop: '0.3rem' }}>
                                    Estimativa pela ficha técnica: R$ {custoInsumosEstimado.toFixed(2)}
                                </p>
                            )}
                        </div>

                        {/* Taxa do adquirente — editável */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#555', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Taxa do Cartão (%)
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="10"
                                step="0.1"
                                value={taxaCartao}
                                onChange={e => setTaxaCartao(Math.max(0, parseFloat(e.target.value) || 0))}
                                style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1.5px solid #ddd', borderRadius: '6px', fontSize: '0.95rem', boxSizing: 'border-box' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button
                                onClick={() => { setMostrarModal(false); setCarregando(false) }}
                                disabled={carregando}
                                style={{ flex: 1, padding: '0.75rem', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleFinalizar}
                                disabled={carregando}
                                style={{ flex: 1, padding: '0.75rem', background: carregando ? '#ccc' : '#16a34a', color: 'white', border: 'none', borderRadius: '8px', cursor: carregando ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                            >
                                {carregando ? (
                                    <>
                                        <svg style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} viewBox="0 0 24 24" fill="none">
                                            <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                                            <path style={{ opacity: 0.75 }} fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        A Processar...
                                    </>
                                ) : 'Confirmar e Faturar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </>
    )
}