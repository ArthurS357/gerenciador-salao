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
}

export default function FormularioReserva({ sessao, mounted, profissionais, catalogoServicos, servicosSelecionados, totalSelecionado, profissionalId, setProfissionalId, dataHora, setDataHora, mensagem, handleAgendar }: Props) {
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
                                <select id="profissional" required value={profissionalId} onChange={e => setProfissionalId(e.target.value)} disabled={!sessao.logado}>
                                    <option value="">Qualquer profissional</option>
                                    {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                                </select>
                            </div>
                            <div className={styles.campoForm}>
                                <label htmlFor="dataHora">Data e Horário</label>
                                <input id="dataHora" type="datetime-local" required value={dataHora} onChange={e => setDataHora(e.target.value)} disabled={!sessao.logado} />
                            </div>
                        </div>

                        {servicosSelecionados.length > 0 && totalSelecionado > 0 && (
                            <div className={styles.formTotalLinha}>
                                <span className={styles.formTotalLabel}>Total · {servicosSelecionados.length} serviço{servicosSelecionados.length > 1 ? 's' : ''}</span>
                                <span className={styles.formTotalValor}>R$ {totalSelecionado.toFixed(2)}</span>
                            </div>
                        )}

                        <button type="submit" className={styles.btnConfirmar} disabled={!sessao.logado}>
                            {sessao.logado ? servicosSelecionados.length > 0 ? `Confirmar ${servicosSelecionados.length} Serviço${servicosSelecionados.length > 1 ? 's' : ''}` : 'Selecione os serviços acima' : 'Faça login para agendar'}
                        </button>
                    </form>
                </div>
            </div>
        </section>
    );
}