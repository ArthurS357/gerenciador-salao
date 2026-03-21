// src/components/landing/Hero.tsx
'use client' // Necessário para interações client-side

import { useState, useEffect, useRef } from 'react';
import styles from './landing.module.css';

export default function Hero() {
    const [mounted, setMounted] = useState(false);
    // Refs para interação 3D
    const heroVisualRef = useRef<HTMLDivElement>(null);
    const heroImageRef = useRef<HTMLImageElement>(null);

    // Efeito existente para animação de entrada (visível)
    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), 150);
        return () => clearTimeout(timer);
    }, []);

    // Novo Efeito Sênior: Lógica dinâmica de tracking do rato (apenas desktop)
    useEffect(() => {
        // 1. Verificação arquitetural: Break early se for celular (touch/ecrã pequeno)
        const isMobile = window.matchMedia('(max-width: 768px)').matches;
        if (isMobile) return;

        const visualContainer = heroVisualRef.current;
        const image3d = heroImageRef.current;

        // Se o Next.js ainda não montou os elementos, sai
        if (!visualContainer || !image3d) return;

        // Função que calcula e aplica a transformação baseada no rato
        const handleMouseMove = (e: MouseEvent) => {
            // 1. Get as dimensões do container visual
            const rect = visualContainer.getBoundingClientRect();
            const width = rect.width;
            const height = rect.height;

            // 2. Calcula a posição do rato em relação ao centro do container
            const mouseX = e.clientX - rect.left - width / 2;
            const mouseY = e.clientY - rect.top - height / 2;

            // 3. Normaliza a posição (intervalo de -1 a 1)
            const pctX = mouseX / (width / 2);
            const pctY = mouseY / (height / 2);

            // 4. Calcula os ângulos de rotação finais (intensidade de inclinação)
            const MAX_TILT = 20; // Máximo de graus de inclinação
            const angleY = pctX * MAX_TILT; // Movimento horizontal inclina verticalmente (RotateY)
            const angleX = pctY * -MAX_TILT; // Movimento vertical inclina horizontalmente (RotateX, invertido)

            // 5. Aplica a transformação diretamente no elemento da imagem para performance
            // Mantemos o translateZ(80px) existente para profundidade
            image3d.style.transform = `translateZ(80px) rotateY(${angleY}deg) rotateX(${angleX}deg)`;
        };

        // Função para resetar a imagem quando o rato sai da área
        const handleMouseLeave = () => {
            // Volta para a inclinação estática padrão chique
            image3d.style.transform = `translateZ(50px) rotateY(-8deg) rotateX(4deg)`;
        };

        // Adiciona os event listeners nativos
        visualContainer.addEventListener('mousemove', handleMouseMove);
        visualContainer.addEventListener('mouseleave', handleMouseLeave);

        // Função de limpeza (cleanup) nativa do React
        return () => {
            visualContainer.removeEventListener('mousemove', handleMouseMove);
            visualContainer.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, [mounted]); // Re-executa se o mounted mudar apenas para garantir

    return (
        <section className={styles.hero}>
            <div className={`${styles.heroConteudo} ${mounted ? styles.visivel : ''}`}>
                <span className={styles.heroTag}>Salão de Alto Padrão</span>
                <h1 className={styles.heroTitulo}>Onde a <em>beleza</em><br />encontra a<br />excelência</h1>
                <p className={styles.heroDesc}>Experiência premium em cuidados capilares e estéticos. Tecnologia e sofisticação em cada detalhe do seu atendimento.</p>
                <div className={styles.heroAcoes}>
                    <a href="#servicos" className={styles.btnPrimario}>Ver Serviços</a>
                    <a href="#agendamento" className={styles.btnSecundario}>Agendar Agora</a>
                </div>
            </div>

            {/* ÁREA VISUAL ATUALIZADA COM REF NO PAIS */}
            <div ref={heroVisualRef} className={styles.heroVisual}>
                <div className={styles.heroVisualGrade} />

                <div className={styles.hero3dContainer}>
                    {/* ADICIONADA REF NA IMAGEM EM SI */}
                    <img
                        ref={heroImageRef}
                        src="/images/logo-hero-render.png"
                        alt="LmLu Mattielo Emblem"
                        className={styles.hero3dImage}
                    />
                </div>

                <div className={styles.heroNumero}>
                    <div className={styles.stat}><span className={styles.statNum}>8+</span><span className={styles.statLabel}>Anos de experiência</span></div>
                    <div className={styles.stat}><span className={styles.statNum}>2k</span><span className={styles.statLabel}>Clientes atendidas</span></div>
                    <div className={styles.stat}><span className={styles.statNum}>100%</span><span className={styles.statLabel}>Satisfação</span></div>
                </div>
            </div>
        </section>
    );
}