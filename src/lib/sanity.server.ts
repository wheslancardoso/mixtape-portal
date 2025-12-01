// src/lib/sanity.server.ts
import 'dotenv/config'; // Força a leitura do .env no Localhost
import { createClient } from '@sanity/client';

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID || 'wccgg6vb';
const dataset = process.env.PUBLIC_SANITY_DATASET || 'production';
const token = process.env.SANITY_API_TOKEN;

// Debug seguro (mostra só se carregou, não o token inteiro)
if (!token) {
    console.warn("⚠️ AVISO: Token do Sanity não encontrado. O site pode não mostrar posts novos.");
} else {
    console.log("✅ Sanity Server Client: Token carregado com sucesso.");
}

export const sanityWriteClient = createClient({
    projectId,
    dataset,
    apiVersion: '2024-03-19',
    token: token, // O Token vive apenas aqui
    useCdn: false, // Sempre dados frescos
    ignoreBrowserTokenWarning: true,
});