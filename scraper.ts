import 'dotenv/config';
import Parser from 'rss-parser';
import OpenAI from 'openai';
import { createClient } from '@sanity/client';
import slugify from 'slugify';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// --- CONFIGURAÇÃO ---
const FEEDS = [
    // 🎤 HIP-HOP & UNDERGROUND (Novas Fontes Estáveis)
    'https://www.thefader.com/feed',             // Geral (Indie + Rap)
    'https://hiphopdx.com/rss/news.xml',         // Notícias Rápidas (Volume alto)
    'https://2dopeboyz.com/feed/',               // Blog Era Survivor (Boom Bap/Underground)
    'https://rapradar.com/feed/',                // Mainstream e Underground
    'https://clashmusic.com/news/feed',          // UK Scene (Drill/Grime)

    // 🎸 CRÍTICA & CULTURA
    'https://thequietus.com/feed',
    'https://www.stereogum.com/category/music/feed/',
    'https://www.gorillavsbear.net/feed/',
    'https://post-punk.com/feed/',

    // 🎨 VISUAL, NOISE & EXPERIMENTAL
    'https://mubi.com/notebook/posts.rss',
    'https://thevinylfactory.com/feed/',
    'https://thewire.co.uk/rss',
    'https://xlr8r.com/feed/'
];

const PROMOTION_LIMIT = 3; // Quantos posts saem da fila para o rascunho por execução

const SYSTEM_PROMPT = `
Você é o Curador Fantasma da 'Mixtape252', uma zine digital underground.
SUA MISSÃO: Filtrar o mainstream e destacar o ouro underground com TEXTO DE JORNALISTA.

REGRA DE OURO (ANTI-ROBÔ):
- PROIBIDO TRADUZIR TERMOS LITERAIS: 'Drops' -> 'Lança', 'Kicks off' -> 'Inicia'.
- MANTENHA NOMES ORIGINAIS.

ESTILO PUNK/ZINE:
- Use gírias naturais: 'Som sujo', 'Pedrada', 'Hype', 'Atmosférico'.
- Títulos diretos (Estilo Popload).

FILTRO ELITISTA:
- IGNORE: Fofocas, Taylor Swift, Marvel, Promoções.
- APROVE: Hip-Hop Underground, Noise, Post-Punk, Cinema Cult.

FORMATO (JSON):
{
  "skip": boolean,
  "title": "Título em PT-BR natural",
  "body": "Resumo ácido de 2 parágrafos.",
  "tags": ["Tag1", "Tag2"],
  "format": "news"
}
`;

// --- AMBIENTE ---
const PROJECT_ID = process.env.SANITY_PROJECT_ID || process.env.PUBLIC_SANITY_PROJECT_ID;
const DATASET = process.env.SANITY_DATASET || process.env.PUBLIC_SANITY_DATASET;
const TOKEN = process.env.SANITY_API_TOKEN;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

if (!PROJECT_ID || !DATASET || !TOKEN || !OPENAI_KEY) {
    console.error('❌ Erro de Configuração .env');
    process.exit(1);
}

const sanity = createClient({
    projectId: PROJECT_ID,
    dataset: DATASET,
    token: TOKEN,
    useCdn: false,
    apiVersion: '2024-03-01',
});

const openai = new OpenAI({ apiKey: OPENAI_KEY });
const parser = new Parser({
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
});

// --- LÓGICA ---

// ESTÁGIO 1: INGESTÃO (Feed -> Fila)
async function runIngestion() {
    console.log('📡 [ESTÁGIO 1] Coletando para a Fila...');

    // Embaralha feeds para variedade
    const shuffledFeeds = FEEDS.sort(() => Math.random() - 0.5);

    for (const feedUrl of shuffledFeeds) {
        try {
            const feed = await parser.parseURL(feedUrl);
            const items = feed.items.slice(0, 2); // Pega só os 2 mais novos

            for (const item of items) {
                if (!item.link) continue;

                // Verifica se já existe na FILA ou nos POSTS (evita gasto de IA)
                const linkHash = crypto.createHash('md5').update(item.link).digest('hex');
                const queueId = `queue.${linkHash}`;

                // Checagem rápida no Sanity
                const existing = await sanity.fetch(`count(*[_type in ["queue", "post"] && source match $link])`, { link: item.link });
                if (existing > 0) {
                    process.stdout.write('.'); // Skip silencioso
                    continue;
                }

                // Processa com IA
                console.log(`\n🧠 Analisando: ${item.title}`);
                const completion = await openai.chat.completions.create({
                    model: 'gpt-4o',
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'user', content: `Título: ${item.title}\nConteúdo: ${item.contentSnippet}\nLink: ${item.link}` }
                    ],
                    response_format: { type: 'json_object' }
                });

                const data = JSON.parse(completion.choices[0].message.content || '{}');

                if (data.skip) {
                    console.log(`🗑️ Ignorado: ${data.title || item.title}`);
                    continue;
                }

                // Salva na FILA (Queue)
                await sanity.createIfNotExists({
                    _id: queueId,
                    _type: 'queue',
                    title: data.title,
                    body: data.body,
                    link: item.link,
                    source: new URL(feedUrl).hostname.replace('www.', ''),
                    format: (data.format || 'news').toLowerCase(),
                    tags: data.tags || ['Underground'],
                    aiJson: JSON.stringify(data)
                });
                console.log(`📥 Guardado na Fila: ${data.title}`);
            }
        } catch (err: any) {
            console.error(`Erro no feed ${feedUrl}:`, err.message);
        }
    }
}

// ESTÁGIO 2: PROMOÇÃO (Fila -> Draft)
async function runPromotion() {
    console.log('\n🚀 [ESTÁGIO 2] Promovendo da Fila para Rascunho...');

    // Pega os mais antigos da fila (FIFO)
    const queueItems = await sanity.fetch(`*[_type == "queue"] | order(_createdAt asc) [0...${PROMOTION_LIMIT}]`);

    if (queueItems.length === 0) {
        console.log('zzz Fila vazia. Nada para promover.');
        return;
    }

    for (const item of queueItems) {
        const slug = slugify(item.title, { lower: true, strict: true }).slice(0, 90);
        const draftId = `drafts.auto-${uuidv4()}`;

        const postDoc = {
            _id: draftId,
            _type: 'post',
            title: item.title,
            slug: { _type: 'slug', current: slug },
            format: item.format,
            tags: item.tags,
            publishedAt: new Date().toISOString(),
            excerpt: item.body.substring(0, 160) + '...',
            body: [
                { _type: 'block', children: [{ _type: 'span', text: item.body }] },
                { _type: 'block', children: [{ _type: 'span', text: `Fonte: ${item.source} (${item.link})` }] }
            ]
        };

        try {
            // Cria o Post
            await sanity.create(postDoc);
            console.log(`✨ Promovido: ${item.title}`);

            // Deleta da Fila (Consumiu)
            await sanity.delete(item._id);
        } catch (err: any) {
            console.error(`Erro ao promover ${item.title}:`, err.message);
        }
    }
}

async function main() {
    await runIngestion(); // Enche a Fila
    await runPromotion(); // Libera 3 Rascunhos
    console.log('\n🏁 Ciclo concluído.');
}

main();
