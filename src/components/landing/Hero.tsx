'use client'

import { useState, useEffect, useRef } from 'react';

export default function Hero() {
    const [mounted, setMounted] = useState(false);
    const heroVisualRef = useRef<HTMLDivElement>(null);
    const heroImageRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), 150);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const isMobile = window.matchMedia('(max-width: 768px)').matches;
        if (isMobile) return;

        const visualContainer = heroVisualRef.current;
        const image3d = heroImageRef.current;

        if (!visualContainer || !image3d) return;

        const handleMouseMove = (e: MouseEvent) => {
            const rect = visualContainer.getBoundingClientRect();
            const mouseX = e.clientX - rect.left - rect.width / 2;
            const mouseY = e.clientY - rect.top - rect.height / 2;
            const pctX = mouseX / (rect.width / 2);
            const pctY = mouseY / (rect.height / 2);
            const angleY = pctX * 20;
            const angleX = pctY * -20;

            image3d.style.transform = `translateZ(80px) rotateY(${angleY}deg) rotateX(${angleX}deg)`;
        };

        const handleMouseLeave = () => {
            image3d.style.transform = `translateZ(50px) rotateY(-8deg) rotateX(4deg)`;
        };

        visualContainer.addEventListener('mousemove', handleMouseMove);
        visualContainer.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            visualContainer.removeEventListener('mousemove', handleMouseMove);
            visualContainer.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, [mounted]);

    return (
        <section className="min-h-screen h-screen grid grid-cols-1 md:grid-cols-2 pt-20 bg-marrom-profundo overflow-hidden">
            <div className={`flex flex-col justify-center py-12 px-6 md:py-20 md:px-24 transition-all duration-700 ease-out ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-5'}`}>
                <span className="inline-flex items-center gap-3 text-[0.7rem] font-medium tracking-[0.25em] uppercase text-caramelo mb-8">
                    <span className="block w-8 h-px bg-caramelo"></span>
                    Salão de Alto Padrão
                </span>
                <h1 className="font-serif text-[2.5rem] md:text-[4.2rem] font-light text-white leading-[1.1] mb-6">
                    Onde a <em className="italic text-caramelo">beleza</em><br />encontra a<br />excelência
                </h1>
                <p className="text-[0.95rem] font-light text-white/55 leading-[1.8] max-w-[440px] mb-12">
                    Experiência premium em cuidados capilares e estéticos. Tecnologia e sofisticação em cada detalhe do seu atendimento.
                </p>
                <div className="flex gap-4 flex-wrap">
                    <a href="#servicos" className="px-8 py-3.5 bg-caramelo text-marrom-profundo rounded-sm font-sans text-[0.78rem] font-semibold tracking-[0.12em] uppercase transition-colors hover:bg-[#d4b896]">Ver Serviços</a>
                    <a href="#agendamento" className="px-8 py-3.5 bg-transparent text-white/70 border border-white/25 rounded-sm font-sans text-[0.78rem] font-normal tracking-[0.12em] uppercase transition-colors hover:border-white/60 hover:text-white">Agendar Agora</a>
                </div>
            </div>

            <div ref={heroVisualRef} className="relative overflow-hidden flex items-center justify-center h-full w-full [perspective:2000px] order-[-1] md:order-last">
                <div className="absolute inset-0 z-[1] bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,rgba(197,168,124,0.15)_0%,transparent_70%),radial-gradient(ellipse_100%_100%_at_100%_0%,rgba(139,90,43,0.1)_0%,transparent_50%)]" />
                <div className="absolute inset-0 z-0 bg-[linear-gradient(rgba(197,168,124,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(197,168,124,0.04)_1px,transparent_1px)] bg-[size:80px_80px]" />

                <div className="relative z-[2] w-[85%] max-w-[480px] [transform-style:preserve-3d]">
                    <img
                        ref={heroImageRef}
                        src="/images/logo-hero-render.png"
                        alt="LmLu Mattielo Emblem"
                        className="w-full h-auto object-contain drop-shadow-[0_30px_70px_rgba(0,0,0,0.5)] transition-transform duration-100 ease-out md:motion-safe:animate-none motion-safe:animate-floating-logo"
                        style={{ transform: 'translateZ(50px) rotateY(-8deg) rotateX(4deg)' }}
                    />
                </div>

                <div className="absolute bottom-6 right-6 md:bottom-12 md:right-16 z-10 flex gap-6 md:gap-12 bg-marrom-profundo/50 py-3 px-4 md:py-4 md:px-8 rounded backdrop-blur-sm">
                    <div className="flex flex-col items-end">
                        <span className="font-serif text-2xl md:text-4xl font-light text-caramelo leading-none">8+</span>
                        <span className="text-[0.62rem] font-normal tracking-[0.15em] uppercase text-white/45 mt-1.5 text-right">Anos de exp.</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="font-serif text-2xl md:text-4xl font-light text-caramelo leading-none">2k</span>
                        <span className="text-[0.62rem] font-normal tracking-[0.15em] uppercase text-white/45 mt-1.5 text-right">Clientes atend.</span>
                    </div>
                </div>
            </div>
        </section>
    );
}