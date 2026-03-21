import Link from 'next/link';
import styles from './landing.module.css';

interface Props {
    sessao: { logado: boolean };
    mounted: boolean;
    profissionais: any[];
    catalogoServicos: any[];
    servicosSelecionados: string[];
    totalSelecionado: number;
    profissionalId: string;
    setProfissionalId: (id: string) => void;
    dataHora: string;
    setDataHora: (dh: string) => void;
    mensagem: { texto: string; tipo: string };
    handleAgendar: (e: React.FormEvent) => void;
    profissionalSelecionado?: { nome: string; fotoUrl: string | null };
}

export default function FormularioReserva({
    sessao, mounted, profissionais, catalogoServicos, servicosSelecionados, totalSelecionado,
    profissionalId, setProfissionalId, dataHora, setDataHora, mensagem, handleAgendar,
    profissionalSelecionado,
}: Props) {

    const obterInicial = (nome?: string) => nome ? nome.charAt(0).toUpperCase() : '?';

    return (
        <section id="agendamento" className={styles.secaoAgendamento}>
            <div className={styles.agendamentoInner}>
                <div className={styles.agendamentoHeader}>
                    <p className={styles.secaoTag} style={{ color: 'rgba(197,168,124,0.6)' }}>Reserve o seu horário</p>
                    <h2 className={styles.agendamentoTitulo}>Agendamento Online</h2>
                    <p className={styles.agendamentoSubtitulo}>Escolha o profissional e horário ideal para si</p>
                </div>

                <div className={styles.formCard}>
                    {mounted && !sessao.logado && (
                        <div className={styles.avisoLogin}>
                            <p>Para finalizar o seu agendamento, <strong>faça login com a sua conta</strong>.</p>
                            <Link href="/login" className={styles.avisoLoginLink}>Entrar</Link>
                        </div>
                    )}

                    {mensagem.texto && (
                        <div className={`${styles.mensagemFeedback} ${mensagem.tipo === 'erro' ? styles.feedbackErro : mensagem.tipo === 'sucesso' ? styles.feedbackSucesso : styles.feedbackInfo}`}>
                            {mensagem.tipo === 'sucesso' && '✓ '}
                            {mensagem.tipo === 'erro' && '✕ '}
                            {mensagem.texto}
                        </div>
                    )}

                    {servicosSelecionados.length > 0 && (
                        <div className={styles.formServicosBadge}>
                            {catalogoServicos.filter(s => servicosSelecionados.includes(s.id)).map(s => (
                                <span key={s.id} className={styles.badgeServico}>{s.nome}</span>
                            ))}
                        </div>
                    )}

                    <form onSubmit={handleAgendar}>
                        <div className={styles.formGrid}>
                            <div className={styles.campoForm}>
                                <label htmlFor="profissional">Profissional</label>

                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                    {/* Avatar — só aparece quando há profissional selecionado */}
                                    {profissionalId && (
                                        <div style={{
                                            width: '45px',
                                            height: '45px',
                                            borderRadius: '50%',
                                            flexShrink: 0,
                                            backgroundColor: '#8B5A2B',
                                            color: 'white',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 'bold',
                                            fontSize: '1.1rem',
                                            overflow: 'hidden',
                                            border: '2px solid #c5a87c',
                                            transition: 'opacity 0.2s ease',
                                        }}>
                                            {profissionalSelecionado?.fotoUrl ? (
                                                <img
                                                    src={profissionalSelecionado.fotoUrl}
                                                    alt={`Foto de ${profissionalSelecionado.nome}`}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            ) : (
                                                obterInicial(profissionalSelecionado?.nome)
                                            )}
                                        </div>
                                    )}

                                    <select
                                        id="profissional"
                                        required
                                        value={profissionalId}
                                        onChange={e => setProfissionalId(e.target.value)}
                                        disabled={!sessao.logado}
                                        style={{ flex: 1 }}
                                    >
                                        <option value="">Qualquer profissional</option>
                                        {profissionais.map(p => (
                                            <option key={p.id} value={p.id}>{p.nome}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className={styles.campoForm}>
                                <label htmlFor="dataHora">Data e Horário</label>
                                <input
                                    id="dataHora"
                                    type="datetime-local"
                                    required
                                    value={dataHora}
                                    onChange={e => setDataHora(e.target.value)}
                                    disabled={!sessao.logado}
                                />
                            </div>
                        </div>

                        {servicosSelecionados.length > 0 && totalSelecionado > 0 && (
                            <div className={styles.formTotalLinha}>
                                <span className={styles.formTotalLabel}>
                                    Total · {servicosSelecionados.length} serviço{servicosSelecionados.length > 1 ? 's' : ''}
                                </span>
                                <span className={styles.formTotalValor}>R$ {totalSelecionado.toFixed(2)}</span>
                            </div>
                        )}

                        <button type="submit" className={styles.btnConfirmar} disabled={!sessao.logado}>
                            {sessao.logado
                                ? servicosSelecionados.length > 0
                                    ? `Confirmar ${servicosSelecionados.length} Serviço${servicosSelecionados.length > 1 ? 's' : ''}`
                                    : 'Selecione os serviços acima'
                                : 'Faça login para agendar'}
                        </button>
                    </form>
                </div>
            </div>
        </section>
    );
}