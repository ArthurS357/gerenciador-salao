import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// 1. Configuração de credenciais do Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
    try {
        // 2. Extrair o ficheiro do FormData enviado pelo frontend
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'Nenhum ficheiro recebido.' }, { status: 400 });
        }

        // 3. Converter o ficheiro File (Web API) para um Buffer (Node.js)
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // 4. Enviar o Buffer para o Cloudinary através de uma Upload Stream
        const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: 'gerenciador-salao' }, // Organiza os ficheiros numa pasta
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );

            // Finaliza a stream passando o buffer da imagem
            uploadStream.end(buffer);
        }) as any; // Type assertion rápido para aceder às propriedades de resposta

        // 5. Retornar a URL segura gerada pelo Cloudinary
        return NextResponse.json({ url: uploadResult.secure_url });
    } catch (error) {
        console.error('Erro no upload para o Cloudinary:', error);
        return NextResponse.json({ error: 'Falha ao processar o upload da imagem.' }, { status: 500 });
    }
}