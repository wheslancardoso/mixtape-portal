import 'dotenv/config';
import { createClient } from '@sanity/client';

// Tenta pegar o token do .env
const token = process.env.SANITY_API_TOKEN;

console.log("---------------------------------------------------");
console.log("🔑 Testando Token:", token ? "Carregado (Começa com " + token.substring(0, 4) + "...)" : "NÃO ENCONTRADO ❌");
console.log("---------------------------------------------------");

const client = createClient({
    projectId: process.env.PUBLIC_SANITY_PROJECT_ID || 'wccgg6vb',
    dataset: process.env.PUBLIC_SANITY_DATASET || 'production',
    apiVersion: '2024-03-01',
    useCdn: false, // Força dados frescos
    token: token // Usa o token para ver tudo (inclusive drafts)
});

async function run() {
    try {
        console.log("📡 Buscando posts recentes no Sanity...");
        const posts = await client.fetch(`*[_type == "post"] | order(_createdAt desc)[0...5] {
      title,
      "slug": slug.current,
      _id,
      "isDraft": _id in path("drafts.**")
    }`);

        console.log("\n📋 RESULTADO DO BANCO:");
        if (posts.length === 0) console.log("⚠️ Nenhum post encontrado.");

        posts.forEach((p: any) => {
            console.log(`[${p.isDraft ? 'RASCUNHO 🟡' : 'PUBLICADO 🟢'}] ${p.title}`);
            console.log(`   Slug: ${p.slug}`);
            console.log(`   ID: ${p._id}`);
            console.log('---');
        });

    } catch (error: any) {
        console.error("\n❌ ERRO DE CONEXÃO:");
        console.error(error.message);
    }
}

run();