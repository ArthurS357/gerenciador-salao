import type { NextConfig } from "next";

// ── Security Headers ─────────────────────────────────────────────────────────
// Aplicados a todas as rotas. Seguem as recomendações OWASP e o padrão
// de Defense in Depth documentado em Defense_in_Depth.md do Obsidian.
const securityHeaders = [
  // Impede que o browser adivinhe o Content-Type (sniffing attacks)
  { key: "X-Content-Type-Options", value: "nosniff" },

  // Bloqueia clickjacking: este app não deve ser embutido em iframes externos
  { key: "X-Frame-Options", value: "SAMEORIGIN" },

  // Controla o cabeçalho Referer para não vazar a URL de origem em requests cross-origin
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

  // Desabilita APIs sensíveis do navegador não utilizadas pela aplicação
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },

  // Habilita pré-busca de DNS para melhorar performance
  { key: "X-DNS-Prefetch-Control", value: "on" },

  // Content Security Policy — define quais origens são confiáveis para cada
  // tipo de recurso. Bloqueia XSS, data exfiltration e injection de scripts.
  //
  // Notas de design:
  //  - 'unsafe-inline' em style-src é necessário para Tailwind CSS
  //  - img-src inclui res.cloudinary.com (portfólio) e data: (base64 de PDF/avatar)
  //  - connect-src 'self' cobre Server Actions e API Routes do Next.js
  //  - frame-ancestors 'none' duplica X-Frame-Options para browsers modernos
  //  - base-uri 'self' previne ataques de injeção de <base> tag
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com",
      "frame-src https://www.google.com",
      "font-src 'self' data:",
      "connect-src 'self'",
      "media-src 'none'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // ── Imagens Externas ───────────────────────────────────────────────────────
  // Permite que next/image carregue imagens do Cloudinary (portfólio do salão)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },

  // ── Pacotes Externos para Server Components ────────────────────────────────
  // Impede que o bundler do Next.js tente empacotar módulos nativos Node.js.
  // Prisma e bcrypt usam binários nativos (.node) que não funcionam bundlados.
  serverExternalPackages: ["@prisma/client", "prisma", "bcrypt"],

  // ── Security Headers ───────────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
