import styles from "./landing.module.css";

interface Props {
    itensPortfolio: any[];
}

export default function PortfolioGaleria({ itensPortfolio }: Props) {
    if (!itensPortfolio || itensPortfolio.length === 0) return null;

    return (
        <section
            className={styles.secaoServicos}
            style={{ paddingTop: "2rem", paddingBottom: "7rem" }}
        >
            <div className={styles.secaoHeader}>
                <div>
                    <p className={styles.secaoTag}>Nosso Portfólio</p>
                    <h2 className="font-serif text-4xl text-[#5C4033] mb-2">
                        Resultados que <em>Inspiram</em>
                    </h2>
                </div>
            </div>

            {/* CSS Grid simulando o feed do Instagram */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                    gap: "1.5rem",
                }}
            >
                {itensPortfolio.map((item) => (
                    <div
                        key={item.id}
                        className="group"
                        style={{
                            position: "relative",
                            borderRadius: "8px",
                            overflow: "hidden",
                            aspectRatio: "1/1",
                            backgroundColor: "#eee",
                        }}
                    >
                        {/* Imagem do Serviço */}
                        <img
                            src={item.imagemUrl}
                            alt={item.titulo}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />

                        {/* Overlay com Informações (Aparece no Hover) */}
                        <div
                            style={{
                                position: "absolute",
                                inset: 0,
                                background: "rgba(42, 24, 16, 0.7)",
                                opacity: 0,
                                transition: "opacity 0.3s",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "center",
                                alignItems: "center",
                                color: "white",
                                padding: "1.5rem",
                                textAlign: "center",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                            onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}
                        >
                            <h3
                                style={{
                                    fontFamily: "Cormorant Garamond",
                                    fontSize: "1.5rem",
                                    fontWeight: 600,
                                    marginBottom: "0.5rem",
                                }}
                            >
                                {item.titulo}
                            </h3>
                            {item.valor && (
                                <p
                                    style={{
                                        color: "#c5a87c",
                                        fontWeight: "bold",
                                        marginBottom: "1rem",
                                    }}
                                >
                                    R$ {item.valor.toFixed(2)}
                                </p>
                            )}

                            {item.linkSocial && (
                                <a
                                    href={item.linkSocial}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                        padding: "0.5rem 1rem",
                                        border: "1px solid #c5a87c",
                                        color: "#c5a87c",
                                        borderRadius: "4px",
                                        fontSize: "0.8rem",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.1em",
                                    }}
                                >
                                    Ver no Instagram
                                </a>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
