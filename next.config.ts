import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuração para permitir que o componente next/image carregue ficheiros externos
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;