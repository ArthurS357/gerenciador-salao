export default function Sobre() {
    return (
        <section id="sobre" className="py-16 md:py-28 px-6 md:px-16 bg-creme-escuro flex items-center justify-center">
            <div className="max-w-[1000px] w-full grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center">
                <div className="relative w-full aspect-[4/5] rounded-lg overflow-hidden shadow-[0_20px_40px_rgba(42,24,16,0.1)]">
                    <img
                        src="https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=1074&auto=format&fit=crop"
                        alt="Interior do Salão LmLu Mattielo"
                        className="w-full h-full object-cover"
                    />
                </div>
                <div className="flex flex-col text-center md:text-left">
                    <p className="text-[0.68rem] font-medium tracking-[0.25em] uppercase text-caramelo mb-3">Nossa Essência</p>
                    <h2 className="font-serif text-[2.5rem] md:text-[3.5rem] font-light text-marrom-profundo mb-6 leading-[1.1]">
                        A arte de revelar a <em className="italic text-marrom-claro">sua melhor versão</em>
                    </h2>
                    <p className="text-[0.95rem] leading-[1.8] mb-6 text-texto-suave">
                        Fundado com a missão de transformar o cuidado pessoal em uma experiência de puro luxo e bem-estar, o LmLu Mattielo é mais que um salão de beleza. É um refúgio desenhado exclusivamente para você.
                    </p>
                    <p className="text-[0.95rem] leading-[1.8] text-texto-suave">
                        Nossa equipe de especialistas combina técnicas avançadas, produtos de excelência internacional e um atendimento meticulosamente personalizado para garantir resultados impecáveis que respeitam e realçam a sua identidade única.
                    </p>
                </div>
            </div>
        </section>
    );
}