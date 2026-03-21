import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
    try {
        const data = await request.formData();
        const file: File | null = data.get('file') as unknown as File;

        if (!file) {
            return NextResponse.json({ sucesso: false, erro: 'Nenhum arquivo recebido.' }, { status: 400 });
        }

        // 1. Converte o ficheiro num formato que o Node.js consiga ler (Buffer)
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // 2. Cria um nome único para não haver ficheiros sobrepostos (ex: 168439294_foto.jpg)
        const filename = `${Date.now()}-${file.name.replace(/\s/g, '_')}`;

        // 3. Define o caminho onde a imagem será salva
        const uploadDir = path.join(process.cwd(), 'public/uploads');
        const filepath = path.join(uploadDir, filename);

        // 4. Garante que a pasta "uploads" existe; se não, cria-a automaticamente
        await mkdir(uploadDir, { recursive: true });

        // 5. Guarda o ficheiro fisicamente no disco
        await writeFile(filepath, buffer);

        // 6. Devolve o link relativo para ser salvo na base de dados
        return NextResponse.json({ sucesso: true, url: `/uploads/${filename}` });

    } catch (error) {
        console.error('Erro no upload:', error);
        return NextResponse.json({ sucesso: false, erro: 'Erro interno ao processar a imagem.' }, { status: 500 });
    }
}