import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                marrom: {
                    profundo: '#2a1810',
                    medio: '#5C4033',
                    claro: '#8B5A2B',
                },
                caramelo: '#c5a87c',
                creme: {
                    DEFAULT: '#f7f3ee',
                    escuro: '#ede5d8',
                },
                bege: {
                    borda: '#ddd0bc',
                },
                texto: {
                    suave: '#9c8070',
                }
            },
            fontFamily: {
                sans: ['DM Sans', 'sans-serif'],
                serif: ['Cormorant Garamond', 'serif'],
            },
            keyframes: {
                floatingLogo: {
                    '0%, 100%': { transform: 'translateZ(50px) rotateY(-8deg) rotateX(4deg)' },
                    '50%': { transform: 'translateZ(80px) rotateY(10deg) rotateX(6deg)' },
                },
                fadeIn: {
                    '0%': { opacity: '0', transform: 'translateY(3px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(12px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                }
            },
            animation: {
                'floating-logo': 'floatingLogo 6s ease-in-out infinite',
                'fade-in': 'fadeIn 0.25s ease',
                'slide-up': 'slideUp 0.35s ease',
            }
        },
    },
    plugins: [],
};
export default config;