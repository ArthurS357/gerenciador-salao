import Link from 'next/link'

export default function NotFound() {
    return (
        <div className="min-h-screen bg-[#fdfbf7] flex flex-col items-center justify-center p-6 text-center">
            <div className="max-w-md w-full bg-white p-10 rounded-2xl shadow-xl border-t-4 border-marrom-claro">
                <div className="text-marrom-claro font-black text-8xl mb-4 tracking-tighter">404</div>
                <h1 className="text-2xl font-bold text-marrom-medio mb-2">Página não encontrada</h1>
                <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                    A página que tentou acessar não existe, foi movida ou não tem permissão para a visualizar.
                </p>
                <div className="flex flex-col gap-3">
                    <Link
                        href="/"
                        className="w-full py-3 bg-marrom-claro text-white font-bold rounded-xl hover:bg-[#704620] transition-colors"
                    >
                        Voltar ao Início
                    </Link>
                </div>
            </div>
        </div>
    )
}