"use client";
import { useState, useEffect, useRef, memo } from "react";
import { cn } from "./cn";

const Hero = memo(function Hero() {
    const [mounted, setMounted] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const glowRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const t = setTimeout(() => setMounted(true), 150);
        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        if (window.matchMedia("(max-width: 768px)").matches) return;
        const el = containerRef.current;
        const img = imageRef.current;
        const glow = glowRef.current;
        if (!el || !img) return;

        const onMove = (e: MouseEvent) => {
            const { left, top, width, height } = el.getBoundingClientRect();
            const pctX = (e.clientX - left - width / 2) / (width / 2);
            const pctY = (e.clientY - top - height / 2) / (height / 2);
            img.style.transform = `translateZ(80px) rotateY(${pctX * 18}deg) rotateX(${pctY * -18}deg)`;
            if (glow) {
                glow.style.transform = `translate(${pctX * 24}px, ${pctY * 24}px)`;
                glow.style.opacity = "1";
            }
        };
        const onLeave = () => {
            img.style.transform = "translateZ(50px) rotateY(-8deg) rotateX(4deg)";
            if (glow) glow.style.opacity = "0.6";
        };

        el.addEventListener("mousemove", onMove);
        el.addEventListener("mouseleave", onLeave);
        return () => {
            el.removeEventListener("mousemove", onMove);
            el.removeEventListener("mouseleave", onLeave);
        };
    }, [mounted]);

    return (
        <section className="relative min-h-screen grid grid-rows-[auto_1fr] md:grid-rows-1 md:grid-cols-2 pt-20 bg-[#0e0905] overflow-hidden">
            {/* ── Plano de fundo atmosférico ── */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-0"
            >
                {/* Névoa quente esquerda */}
                <div className="absolute -top-[20%] -left-[10%] w-[65%] h-[80%] rounded-full bg-[radial-gradient(ellipse,rgba(92,64,51,0.4)_0%,transparent_65%)] blur-3xl" />
                {/* Acento dourado direito */}
                <div className="absolute top-[10%] right-[5%] w-[45%] h-[55%] rounded-full bg-[radial-gradient(ellipse,rgba(197,168,124,0.12)_0%,transparent_65%)] blur-2xl" />
                {/* Vinheta inferior */}
                <div className="absolute bottom-0 inset-x-0 h-[35%] bg-gradient-to-t from-[#0a0603] to-transparent" />
                {/* Grade de linhas sutis */}
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage:
                            "linear-gradient(rgba(197,168,124,1) 1px, transparent 1px), linear-gradient(90deg, rgba(197,168,124,1) 1px, transparent 1px)",
                        backgroundSize: "96px 96px",
                    }}
                />
                {/* Ruído de grão */}
                <div
                    className="absolute inset-0 opacity-[0.035] mix-blend-overlay"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`,
                    }}
                />
            </div>

            {/* ══════════════════════════════════════════
          COLUNA DIREITA — Logo 3D (aparece primeiro no mobile)
      ══════════════════════════════════════════ */}
            <div
                ref={containerRef}
                className="relative z-10 overflow-hidden flex items-center justify-center w-full order-first md:order-last h-[45vh] md:h-full"
                style={{ perspective: "2200px" }}
            >
                {/* Fundo da coluna — arredondado */}
                <div aria-hidden="true" className="absolute inset-2 top-2 md:inset-4 md:top-6 rounded-2xl md:rounded-3xl overflow-hidden">
                    {/* Gradiente base escuro com direção diagonal */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#1a0e0a]/90 via-[#120804]/40 to-[#0e0905]/60" />

                    {/* Névoa dourada central — dá "calor" ao fundo */}
                    <div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] rounded-full opacity-40"
                        style={{
                            background:
                                "radial-gradient(ellipse 50% 45% at 50% 50%, rgba(197,168,124,0.10) 0%, rgba(139,90,43,0.05) 40%, transparent 70%)",
                        }}
                    />

                    {/* Acento quente superior esquerdo */}
                    <div
                        className="absolute -top-[5%] -left-[10%] w-[60%] h-[50%] rounded-full opacity-50"
                        style={{
                            background:
                                "radial-gradient(ellipse at 30% 30%, rgba(160,100,50,0.12) 0%, transparent 65%)",
                            filter: "blur(40px)",
                        }}
                    />

                    {/* Acento frio inferior direito — contraste sutil */}
                    <div
                        className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[45%] rounded-full opacity-30"
                        style={{
                            background:
                                "radial-gradient(ellipse at 70% 70%, rgba(90,70,100,0.10) 0%, transparent 60%)",
                            filter: "blur(50px)",
                        }}
                    />

                    {/* Vinheta escura nas bordas */}
                    <div
                        className="absolute inset-0"
                        style={{
                            background:
                                "radial-gradient(ellipse 70% 60% at 50% 50%, transparent 30%, rgba(10,6,3,0.5) 100%)",
                        }}
                    />

                    {/* Linhas diagonais sutis — textura */}
                    <div
                        className="absolute inset-0 opacity-[0.025]"
                        style={{
                            backgroundImage:
                                "repeating-linear-gradient(135deg, rgba(197,168,124,1) 0px, rgba(197,168,124,1) 1px, transparent 1px, transparent 80px)",
                        }}
                    />

                    {/* Borda sutil do card arredondado */}
                    <div className="absolute inset-0 rounded-2xl md:rounded-3xl border border-[#c5a87c]/[0.08]" />

                    {/* Brilho topo — simula luz incidindo */}
                    <div
                        className="absolute top-0 left-[20%] right-[20%] h-px opacity-30"
                        style={{
                            background:
                                "linear-gradient(to right, transparent, rgba(197,168,124,0.4), transparent)",
                        }}
                    />
                </div>

                {/* Container 3D */}
                <div
                    className={cn(
                        "relative w-[55%] max-w-[260px] md:w-[78%] md:max-w-[440px] transition-all duration-1000 ease-out",
                        mounted ? "opacity-100 scale-100" : "opacity-0 scale-95",
                    )}
                    style={{ transformStyle: "preserve-3d" }}
                >
                    {/* Halo dourado por baixo da logo */}
                    <div
                        ref={glowRef}
                        aria-hidden="true"
                        className="absolute inset-[-15%] rounded-full transition-[transform,opacity] duration-500 ease-out opacity-60"
                        style={{
                            background:
                                "radial-gradient(ellipse 60% 55% at 50% 52%, rgba(197,168,124,0.28) 0%, rgba(139,90,43,0.14) 45%, transparent 70%)",
                            filter: "blur(24px)",
                        }}
                    />

                    {/* Reflexo de luz superior */}
                    <div
                        aria-hidden="true"
                        className="absolute top-[8%] left-[20%] right-[20%] h-[1px] opacity-40"
                        style={{
                            background:
                                "linear-gradient(to right, transparent, rgba(255,240,200,0.7), transparent)",
                            filter: "blur(1px)",
                        }}
                    />

                    {/* A logo */}
                    <div
                        ref={imageRef as React.RefObject<HTMLDivElement>}
                        className="relative w-full transition-transform duration-100 ease-out motion-safe:animate-floating-logo md:motion-safe:animate-none rounded-2xl md:rounded-3xl overflow-hidden"
                        style={{
                            transform: "translateZ(50px) rotateY(-8deg) rotateX(4deg)",
                            filter: "drop-shadow(0 40px 80px rgba(0,0,0,0.7)) drop-shadow(0 8px 24px rgba(197,168,124,0.15))",
                            boxShadow: "inset 0 0 0 1.5px rgba(197,168,124,0.35), inset 0 0 0 4px rgba(197,168,124,0.06)",
                        }}
                    >
                        <img
                            src="/images/logo-hero-render.png"
                            alt="LmLu Matiello Emblem"
                            className="w-full h-auto object-contain"
                        />
                    </div>

                    {/* Sombra no chão */}
                    <div
                        aria-hidden="true"
                        className="absolute bottom-[-8%] left-[15%] right-[15%] h-[20px] opacity-50"
                        style={{
                            background:
                                "radial-gradient(ellipse, rgba(0,0,0,0.6) 0%, transparent 70%)",
                            filter: "blur(12px)",
                            transform: "translateZ(-20px)",
                        }}
                    />
                </div>

                {/* Métricas — desktop */}
                <div className="absolute bottom-8 right-8 md:bottom-14 md:right-14 z-10 hidden md:flex flex-col gap-6 items-end">
                    {[
                        { num: "8+", label: "Anos de experiência" },
                        { num: "2k+", label: "Clientes atendidos" },
                    ].map(({ num, label }, i) => (
                        <div
                            key={label}
                            className={cn(
                                "text-right transition-all duration-700",
                                mounted
                                    ? "opacity-100 translate-x-0"
                                    : "opacity-0 translate-x-4",
                                i === 0 ? "delay-[700ms]" : "delay-[800ms]",
                            )}
                        >
                            <span className="block font-serif text-[2.6rem] font-light text-[#c5a87c] leading-none tracking-[-0.02em]">
                                {num}
                            </span>
                            <span className="block text-[0.6rem] font-medium tracking-[0.2em] uppercase text-white/30 mt-1.5">
                                {label}
                            </span>
                        </div>
                    ))}

                    {/* Linha decorativa vertical */}
                    <div className="w-px h-16 bg-gradient-to-b from-[#c5a87c]/30 to-transparent mt-2" />
                </div>

                {/* Badge "Alto Padrão" */}
                <div
                    className={cn(
                        "absolute top-5 right-5 md:bottom-14 md:left-12 md:top-auto md:right-auto z-10 transition-all duration-700 delay-[900ms]",
                        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
                    )}
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-[#c5a87c]/20 rounded-full bg-[#c5a87c]/[0.06] backdrop-blur-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#c5a87c]/70 animate-pulse" />
                        <span className="text-[0.58rem] font-medium tracking-[0.2em] uppercase text-[#c5a87c]/60">
                            Alto Padrão
                        </span>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════
          COLUNA ESQUERDA — Texto
      ══════════════════════════════════════════ */}
            <div
                className={cn(
                    "relative z-10 flex flex-col justify-center py-8 px-6 md:py-20 md:px-20 lg:px-28 transition-all duration-[900ms] ease-out",
                    mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8",
                )}
            >
                {/* Linha decorativa + label */}
                <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-10">
                    <div className="h-px w-8 md:w-10 bg-gradient-to-r from-transparent to-[#c5a87c]" />
                    <span className="text-[0.6rem] md:text-[0.63rem] font-medium tracking-[0.32em] uppercase text-[#c5a87c]/70">
                        Studio de Beleza
                    </span>
                    <div className="h-px flex-1 max-w-[40px] bg-gradient-to-r from-[#c5a87c]/30 to-transparent" />
                </div>

                {/* Headline principal */}
                <h1 className="font-serif leading-[1.05] mb-5 md:mb-7 text-white">
                    <span
                        className={cn(
                            "block text-[2rem] md:text-[3.8rem] lg:text-[4.8rem] font-light tracking-[-0.02em] transition-all duration-700 delay-100",
                            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
                        )}
                    >
                        Onde a
                    </span>
                    <span
                        className={cn(
                            "block text-[2.6rem] md:text-[4.8rem] lg:text-[6rem] font-semibold tracking-[-0.03em] italic transition-all duration-700 delay-200",
                            "bg-gradient-to-br from-[#e8d5b0] via-[#c5a87c] to-[#9a7a50] bg-clip-text text-transparent",
                            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
                        )}
                    >
                        beleza
                    </span>
                    <span
                        className={cn(
                            "block text-[2rem] md:text-[3.8rem] lg:text-[4.8rem] font-light tracking-[-0.02em] transition-all duration-700 delay-300",
                            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
                        )}
                    >
                        encontra a
                    </span>
                    <span
                        className={cn(
                            "block text-[2rem] md:text-[3.8rem] lg:text-[4.8rem] font-light tracking-[-0.02em] text-white/60 transition-all duration-700 delay-[400ms]",
                            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
                        )}
                    >
                        excelência
                    </span>
                </h1>

                {/* Divisor */}
                <div
                    className={cn(
                        "w-10 md:w-12 h-px mb-5 md:mb-7 bg-gradient-to-r from-[#c5a87c]/60 to-transparent transition-all duration-700 delay-500",
                        mounted ? "opacity-100" : "opacity-0",
                    )}
                />

                {/* Subtítulo */}
                <p
                    className={cn(
                        "text-[0.82rem] md:text-[0.9rem] font-light text-white/40 leading-[1.85] max-w-[400px] mb-8 md:mb-12 tracking-[0.02em] transition-all duration-700 delay-[550ms]",
                        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
                    )}
                >
                    Experiência premium em cuidados capilares e estéticos.
                    <br />
                    Tecnologia e sofisticação em cada detalhe.
                </p>

                {/* CTAs */}
                <div
                    className={cn(
                        "flex gap-3 md:gap-4 flex-wrap transition-all duration-700 delay-[650ms]",
                        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
                    )}
                >
                    <a
                        href="#servicos"
                        className="group relative inline-flex items-center gap-2.5 px-6 md:px-8 py-3 md:py-3.5 bg-[#c5a87c] text-[#0e0905] rounded-sm font-sans text-[0.68rem] md:text-[0.72rem] font-semibold tracking-[0.18em] uppercase overflow-hidden transition-all duration-300 hover:bg-[#d4b896] hover:shadow-[0_8px_32px_rgba(197,168,124,0.35)] active:scale-[0.98]"
                    >
                        <span className="relative z-10">Ver Serviços</span>
                        <svg
                            className="relative z-10 w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1"
                            viewBox="0 0 14 14"
                            fill="none"
                        >
                            <path
                                d="M1 7h12M8 2l5 5-5 5"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </a>
                    <a
                        href="#agendamento"
                        className="inline-flex items-center px-6 md:px-8 py-3 md:py-3.5 bg-transparent text-white/65 border border-white/15 rounded-sm font-sans text-[0.68rem] md:text-[0.72rem] font-normal tracking-[0.18em] uppercase transition-all duration-300 hover:border-[#c5a87c]/50 hover:text-white/90 hover:bg-white/[0.04] active:scale-[0.98]"
                    >
                        Agendar Agora
                    </a>
                </div>

                {/* Métricas — mobile only */}
                <div className="flex gap-8 mt-8 md:hidden">
                    {[
                        { num: "8+", label: "Anos de experiência" },
                        { num: "2k+", label: "Clientes atendidos" },
                    ].map(({ num, label }) => (
                        <div key={label}>
                            <span className="block font-serif text-2xl font-light text-[#c5a87c]">
                                {num}
                            </span>
                            <span className="block text-[0.6rem] font-normal tracking-[0.12em] uppercase text-white/35 mt-1">
                                {label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Scroll indicator */}
            <div
                className={cn(
                    "absolute bottom-8 left-1/2 -translate-x-1/2 z-20 hidden md:flex flex-col items-center gap-2 transition-all duration-700 delay-[1000ms]",
                    mounted ? "opacity-100" : "opacity-0",
                )}
                aria-hidden="true"
            >
                <div className="w-px h-10 bg-gradient-to-b from-transparent via-[#c5a87c]/40 to-transparent" />
            </div>
        </section>
    );
});

export default Hero;