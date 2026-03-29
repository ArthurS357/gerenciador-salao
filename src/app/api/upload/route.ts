import { NextResponse } from 'next/server';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { verificarSessaoFuncionario } from '@/app/actions/auth';
import { Readable } from 'stream';
import type { ReadableStream } from 'stream/web'; // Tipagem estrita para o Node.js

// 1. Configuração de credenciais do Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function POST(request: Request) {
    try {
        // 2. Verificação de Autenticação — bloqueia acessos anônimos (Denial-of-Wallet)
        const sessao = await verificarSessaoFuncionario();
        if (!sessao.logado) {
            return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
        }

        // 3. Extrair o ficheiro do FormData enviado pelo frontend
        const formData = await request.formData();
        const file = formData.get('file');

        // 4. Validação estrita em runtime — substitui o `as File` cego
        if (!file || typeof file === 'string' || !(file instanceof Blob)) {
            return NextResponse.json(
                { error: 'Ficheiro inválido ou não enviado.' },
                { status: 400 }
            );
        }

        // 5. Validação de formato MIME (apenas imagens permitidas)
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: 'Formato de imagem não suportado. Use JPEG, PNG ou WebP.' },
                { status: 415 }
            );
        }

        // 6. Validação de tamanho (máx. 5 MB)
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: 'O ficheiro excede o tamanho máximo de 5 MB.' },
                { status: 413 }
            );
        }

        // 7. Streaming Real: Consome a stream do request diretamente para o Cloudinary
        // sem sobrecarregar a memória RAM da Vercel (evitando o ArrayBuffer completo).
        const uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: 'gerenciador-salao' },
                (error, result) => {
                    if (error || !result) {
                        reject(error || new Error('Upload falhou sem erro explícito.'));
                    } else {
                        resolve(result);
                    }
                }
            );

            // Converte a Web API Stream do ficheiro para uma Node.js Stream
            // Utilizamos o cast seguro de "stream/web" para resolver o erro de "any"
            const nodeStream = Readable.fromWeb(file.stream() as ReadableStream);

            // Faz o piping (redireciona o fluxo de dados contínuo) direto para o Cloudinary
            nodeStream.pipe(uploadStream);
        });

        // 8. Retornar a URL segura gerada pelo Cloudinary
        return NextResponse.json({ url: uploadResult.secure_url });
    } catch (error) {
        console.error('Erro no upload para o Cloudinary:', error);
        return NextResponse.json(
            { error: 'Falha interna ao processar o upload.' },
            { status: 500 }
        );
    }
}