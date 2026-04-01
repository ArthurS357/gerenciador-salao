'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { finalizarComanda } from '@/app/actions/comanda'

interface BotaoFinalizarComandaProps {
    agendamentoId: string;
    valorBruto: number;
    custoInsumosEstimado?: number;
}

export default function BotaoFinalizarComanda({
    agendamentoId,
    valorBruto,
    custoInsumosEstimado = 0,
}: BotaoFinalizarComandaProps) {
    const [carregando, setCarregando] = useState(false)
    const [mostrarModal, setMostrarModal] = useState(false)
    const [custoInsumos, setCustoInsumos] = useState(custoInsumosEstimado)

    // Pagamentos mistos
    const [valorDinheiro, setValorDinheiro] = useState(0)
    const [valorCartao, setValorCartao] = useState(0)
    const [valorPix, setValorPix] = useState(0)
    const [tipoCartao, setTipoCartao] = useState<'CREDITO' | 'DEBITO'>('CREDITO')

    const router = useRouter()

    const totalAlocado = valorDinheiro + valorCartao + valorPix
    const diferenca = valorBruto - totalAlocado
    const totalValido = Math.abs(diferenca) < 0.01

    const handleFinalizar = async () => {
        if (!totalValido) {
            toast.error(`Distribua o valor total: faltam R$ ${diferenca.toFixed(2)}`)
            return
        }

        setCarregando(true)
        try {
            const res = await finalizarComanda(
                agendamentoId,
                custoInsumos,
                valorDinheiro,
                valorCartao,
                valorPix,
                valorCartao > 0 ? tipoCartao : undefined
            )

            if (res.sucesso) {
                const f = res.data.financeiro
                toast.success(
                    `Comanda faturada! Lucro líquido: R$ ${f.lucroSalao.toFixed(2)}`,
                    { description: `Bruto R$ ${f.bruto.toFixed(2)} — Repasse prof. R$ ${f.comissao.toFixed(2)}` }
                )
                router.push('/profissional/agenda')
            } else {
                toast.error(res.erro ?? 'Erro ao processar comanda.')
                setCarregando(false)
            }
        } catch {
            toast.error('Ocorreu um erro técnico ao processar a fatura.')
            setCarregando(false)
        }
    }

    return (
        <>
            <button
                onClick={() => setMostrarModal(true)}
                disabled={carregando}
                className="w-full md:w-auto bg-green-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center justify-center gap-2"
            >
                Concluir Agendamento e Faturar
            </button>

            {mostrarModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 9999, padding: '1rem'
                }}>
                    <div style={{
                        background: 'white', borderRadius: '12px', padding: '2rem',
                        maxWidth: '460px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                        maxHeight: '90vh', overflowY: 'auto'
                    }}>
                        <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.1rem', fontWeight: 700, color: '#1a1a1a' }}>
                            Confirmar Fechamento de Comanda
                        </h3>
                        <p style={{ margin: '0 0 1.5rem', fontSize: '0.85rem', color: '#666' }}>
                            Valor bruto: <strong>R$ {valorBruto.toFixed(2)}</strong>. Informe como foi o pagamento.
                        </p>

                        {/* Custo de insumos */}
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#555', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Custo de Insumos (R$)
                            </label>
                            <input
                                type="number" min="0" step="0.01" value={custoInsumos}
                                onChange={e => setCustoInsumos(Math.max(0, parseFloat(e.target.value) || 0))}
                                style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1.5px solid #ddd', borderRadius: '6px', fontSize: '0.95rem', boxSizing: 'border-box' }}
                            />
                            {custoInsumosEstimado > 0 && (
                                <p style={{ fontSize: '0.72rem', color: '#888', marginTop: '0.3rem' }}>
                                    Estimativa pela ficha técnica: R$ {custoInsumosEstimado.toFixed(2)}
                                </p>
                            )}
                        </div>

                        {/* Divisão do pagamento */}
                        <div style={{ background: '#f8f9fa', borderRadius: '8px', padding: '1rem', marginBottom: '1rem', border: '1px solid #e9ecef' }}>
                            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#555', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Divisão do Pagamento
                            </p>

                            {/* Dinheiro */}
                            <div style={{ marginBottom: '0.75rem' }}>
                                <label style={{ display: 'block', fontSize: '0.72rem', color: '#666', marginBottom: '0.3rem', fontWeight: 600 }}>
                                    Dinheiro (R$)
                                </label>
                                <input
                                    type="number" min="0" step="0.01" value={valorDinheiro || ''}
                                    placeholder="0,00"
                                    onChange={e => setValorDinheiro(Math.max(0, parseFloat(e.target.value) || 0))}
                                    style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1.5px solid #ddd', borderRadius: '6px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                                />
                            </div>

                            {/* Cartão */}
                            <div style={{ marginBottom: '0.75rem' }}>
                                <label style={{ display: 'block', fontSize: '0.72rem', color: '#666', marginBottom: '0.3rem', fontWeight: 600 }}>
                                    Cartão (R$)
                                </label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input
                                        type="number" min="0" step="0.01" value={valorCartao || ''}
                                        placeholder="0,00"
                                        onChange={e => setValorCartao(Math.max(0, parseFloat(e.target.value) || 0))}
                                        style={{ flex: 1, padding: '0.5rem 0.75rem', border: '1.5px solid #ddd', borderRadius: '6px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                                    />
                                    {valorCartao > 0 && (
                                        <select
                                            value={tipoCartao}
                                            onChange={e => setTipoCartao(e.target.value as 'CREDITO' | 'DEBITO')}
                                            style={{ padding: '0.5rem', border: '1.5px solid #ddd', borderRadius: '6px', fontSize: '0.85rem', background: 'white', cursor: 'pointer' }}
                                        >
                                            <option value="CREDITO">Crédito</option>
                                            <option value="DEBITO">Débito</option>
                                        </select>
                                    )}
                                </div>
                            </div>

                            {/* PIX */}
                            <div style={{ marginBottom: '0.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.72rem', color: '#666', marginBottom: '0.3rem', fontWeight: 600 }}>
                                    PIX (R$)
                                </label>
                                <input
                                    type="number" min="0" step="0.01" value={valorPix || ''}
                                    placeholder="0,00"
                                    onChange={e => setValorPix(Math.max(0, parseFloat(e.target.value) || 0))}
                                    style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1.5px solid #ddd', borderRadius: '6px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                                />
                            </div>

                            {/* Indicador de total alocado */}
                            <div style={{
                                marginTop: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '6px',
                                background: totalValido ? '#d1fae5' : Math.abs(diferenca) < 0.001 ? '#d1fae5' : '#fef9c3',
                                color: totalValido ? '#065f46' : '#78350f',
                                fontSize: '0.8rem', fontWeight: 700, display: 'flex', justifyContent: 'space-between'
                            }}>
                                <span>Total alocado:</span>
                                <span>R$ {totalAlocado.toFixed(2)} / R$ {valorBruto.toFixed(2)}</span>
                            </div>
                            {!totalValido && totalAlocado > 0 && (
                                <p style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '0.3rem' }}>
                                    {diferenca > 0 ? `Faltam R$ ${diferenca.toFixed(2)} para completar.` : `Excesso de R$ ${Math.abs(diferenca).toFixed(2)}.`}
                                </p>
                            )}
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
                                disabled={carregando || !totalValido}
                                style={{ flex: 1, padding: '0.75rem', background: carregando || !totalValido ? '#ccc' : '#16a34a', color: 'white', border: 'none', borderRadius: '8px', cursor: carregando || !totalValido ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
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
