import styles from './landing.module.css';

const ICONES = ['✦', '◈', '◉', '◆', '◇', '⬡'];

interface Props {
    catalogoServicos: any[];
    servicosSelecionados: string[];
    toggleServico: (id: string) => void;
    totalSelecionado: number;
}

export default function ServicosVitrine({ catalogoServicos, servicosSelecionados, toggleServico, totalSelecionado }: Props) {
    return (
        <section id="servicos" className={styles.secaoServicos}>
            <div className={styles.secaoHeader}>
                <div>
                    <p className={styles.secaoTag}>O que oferecemos</p>
                    <h2 className={styles.secaoTitulo}>Tratamentos pensados<br />para <em>realçar</em> você</h2>
                </div>
                <p className={styles.instrucaoSelecao}>Clique nos serviços para selecionar</p>
            </div>

            <div className={styles.gradeServicos}>
                {catalogoServicos.map((s, i) => {
                    const isSelected = servicosSelecionados.includes(s.id);
                    return (
                        <div key={s.id} className={`${styles.cardServico} ${isSelected ? styles.cardServicoSelecionado : ''}`} onClick={() => toggleServico(s.id)} role="checkbox" aria-checked={isSelected} tabIndex={0} onKeyDown={e => e.key === ' ' && toggleServico(s.id)}>
                            <div className={styles.cardServicoTopo}>
                                <div className={styles.servicoIcone}>{ICONES[i % ICONES.length]}</div>
                                <div className={styles.checkboxPremium} aria-hidden="true">
                                    <svg className={styles.checkboxTick} viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                </div>
                            </div>
                            <div className={styles.servicoNome}>{s.nome}</div>
                            <div className={styles.servicoDesc}>{s.descricao}</div>
                            <div className={styles.servicoRodape}>
                                <span className={styles.servicoPreco}>{s.preco ? `R$ ${s.preco.toFixed(2)}` : 'Sob Consulta'}</span>
                                {s.tempoMinutos && <span className={styles.servicoTempo}>{s.tempoMinutos} min</span>}
                            </div>
                        </div>
                    );
                })}
            </div>

            {servicosSelecionados.length > 0 && (
                <div className={styles.barraResumo}>
                    <div className={styles.barraResumoInfo}>
                        <span className={styles.barraResumoCount}>{servicosSelecionados.length} serviço{servicosSelecionados.length > 1 ? 's' : ''} selecionado{servicosSelecionados.length > 1 ? 's' : ''}</span>
                        <span className={styles.barraResumoTotal}>R$ {totalSelecionado.toFixed(2)}</span>
                    </div>
                    <a href="#agendamento" className={styles.barraResumoBtn}>Concluir Reserva →</a>
                </div>
            )}
        </section>
    );
}