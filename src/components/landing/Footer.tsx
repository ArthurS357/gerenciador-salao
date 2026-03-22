import { memo } from 'react'

const Footer = memo(function Footer() {
    return (
        <footer
            id="contato"
            className="bg-[#1a0f0a] py-10 px-6 md:px-16 flex justify-between items-center flex-wrap gap-4 border-t border-[rgba(197,168,124,0.1)]"
        >
            <span className="font-serif text-[1.1rem] font-semibold text-white/50">
                LmLu Matiello
            </span>
            <span className="text-[0.7rem] text-white/20 font-light tracking-[0.08em]">
                © {new Date().getFullYear()} · Studio de Beleza · Todos os direitos reservados
            </span>
        </footer>
    )
})

export default Footer