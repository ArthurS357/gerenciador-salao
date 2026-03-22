'use client'
import { useState, useEffect, useRef, memo } from 'react'
import { cn } from './cn'

const Hero = memo(function Hero() {
    const [mounted, setMounted] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const imageRef = useRef<HTMLImageElement>(null)

    useEffect(() => {
        const t = setTimeout(() => setMounted(true), 150)
        return () => clearTimeout(t)
    }, [])

    useEffect(() => {
        if (window.matchMedia('(max-width: 768px)').matches) return
        const el = containerRef.current
        const img = imageRef.current
        if (!el || !img) return

        const onMove = (e: MouseEvent) => {
            const { left, top, width, height } = el.getBoundingClientRect()
            const pctX = (e.clientX - left - width / 2) / (width / 2)
            const pctY = (e.clientY - top - height / 2) / (height / 2)
            img.style.transform = `translateZ(80px) rotateY(${pctX * 20}deg) rotateX(${pctY * -20}deg)`
        }
        const onLeave = () => { img.style.transform = 'translateZ(50px) rotateY(-8deg) rotateX(4deg)' }

        el.addEventListener('mousemove', onMove)
        el.addEventListener('mouseleave', onLeave)
        return () => { el.removeEventListener('mousemove', onMove); el.removeEventListener('mouseleave', onLeave) }
    }, [mounted])

    return (
        <section className="min-h-screen h-screen grid grid-cols-1 md:grid-cols-2 pt-20 bg-marrom-profundo overflow-hidden">

            {/* Coluna de texto */}
            <div className={cn(
                'flex flex-col justify-center py-12 px-6 md:py-20 md:px-24 transition-all duration-700 ease-out',
                mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-5'
            )}>
                <span className="inline-flex items-center gap-3 text-[0.7rem] font-medium tracking-[0.25em] uppercase text-caramelo mb-8">
                    <span className="block w-8 h-px bg-caramelo" aria-hidden="true" />
                    Salão de Alto Padrão
                </span>

                <h1 className="font-serif text-[2.5rem] md:text-[4.2rem] font-light text-white leading-[1.1] mb-6">
                    Onde a <em className="italic text-caramelo not-italic">beleza</em>
                    <br />encontra a<br />excelência
                </h1>

                <p className="text-[0.95rem] font-light text-white/55 leading-[1.8] max-w-[440px] mb-12">
                    Experiência premium em cuidados capilares e estéticos. Tecnologia e sofisticação em cada detalhe do seu atendimento.
                </p>

                <div className="flex gap-4 flex-wrap">
                    <a href="#servicos" className="px-8 py-3.5 bg-caramelo text-marrom-profundo rounded-sm font-sans text-[0.78rem] font-semibold tracking-[0.12em] uppercase transition-colors hover:bg-[#d4b896]">Ver Serviços</a>
                    <a href="#agendamento" className="px-8 py-3.5 bg-transparent text-white/70 border border-white/25 rounded-sm font-sans text-[0.78rem] font-normal tracking-[0.12em] uppercase transition-colors hover:border-white/60 hover:text-white">Agendar Agora</a>
                </div>
            </div>

            {/* Coluna visual */}
            <div ref={containerRef} className="relative overflow-hidden flex items-center justify-center h-full w-full [perspective:2000px] order-[-1] md:order-last">
                <div aria-hidden="true" className="absolute inset-0 z-[1] bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,rgba(197,168,124,0.15)_0%,transparent_70%),radial-gradient(ellipse_100%_100%_at_100%_0%,rgba(139,90,43,0.1)_0%,transparent_50%)]" />
                <div aria-hidden="true" className="absolute inset-0 z-0 bg-[linear-gradient(rgba(197,168,124,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(197,168,124,0.04)_1px,transparent_1px)] bg-[size:80px_80px]" />

                <div className="relative z-[2] w-[85%] max-w-[480px] [transform-style:preserve-3d]">
                    <img
                        ref={imageRef}
                        src="/images/logo-hero-render.png"
                        alt="LmLu Mattielo Emblem"
                        className="w-full h-auto object-contain drop-shadow-[0_30px_70px_rgba(0,0,0,0.5)] transition-transform duration-100 ease-out motion-safe:animate-floating-logo md:motion-safe:animate-none"
                        style={{ transform: 'translateZ(50px) rotateY(-8deg) rotateX(4deg)' }}
                    />
                </div>

                <div className="absolute bottom-6 right-6 md:bottom-12 md:right-16 z-10 flex gap-6 md:gap-12 bg-marrom-profundo/50 py-3 px-4 md:py-4 md:px-8 rounded backdrop-blur-sm">
                    {[{ num: '8+', label: 'Anos de exp.' }, { num: '2k', label: 'Clientes atend.' }].map(({ num, label }) => (
                        <div key={label} className="flex flex-col items-end">
                            <span className="font-serif text-2xl md:text-4xl font-light text-caramelo leading-none">{num}</span>
                            <span className="text-[0.62rem] font-normal tracking-[0.15em] uppercase text-white/45 mt-1.5 text-right">{label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
})

export default Hero