import 'dotenv/config';
import Parser from 'rss-parser';
import OpenAI from 'openai';
import { createClient } from '@sanity/client';
import crypto from 'crypto';

// --- CONFIGURAÇÃO ---
const FEEDS = [
    // 🎤 HIP-HOP & CULTURA (Prioridade)
    'https://www.thefader.com/feed',
    'https://hiphopdx.com/rss/news.xml',
    'https://2dopeboyz.com/feed/',
    'https://clashmusic.com/news/feed',

    // 🎸 CRÍTICA & INDIE
    'https://thequietus.com/feed',
    'https://www.stereogum.com/category/music/feed/',
    'https://www.gorillavsbear.net/feed/',

    // 🎨 VISUAL & ARTE
    'https://mubi.com/notebook/posts.rss',
    'https://thevinylfactory.com/feed/',
    'https://thewire.co.uk/rss'
];

const SYSTEM_PROMPT = `
Você é o Editor de uma Zine Digital Brutalista chamada 'Mixtape252'.
SUA MISSÃO: Filtrar o ruído da internet e encontrar a Excelência Artística.

O FILTRO DE OURO ("VISIONARY CHECK"):
1. MAINSTREAM ARTÍSTICO (SIM): Se for Tyler The Creator, Kendrick, Radiohead, Rosalia, A24... APROVE. O critério é: "Tem direção de arte? Inova? É relevante?"
2. MAINSTREAM FÚTIL (NÃO): Fofocas, charts, pop genérico de fábrica, polêmicas de Twitter. IGNORE.
3. UNDERGROUND (COM CRITÉRIO): Só aprove se for promissor ou esteticamente interessante (Noise, Glitch, Visual Arts).
4. RUÍDO DE AGENDA (NÃO): IGNORE Line-ups, Datas de Turnê, Venda de Ingressos e Merch.

ESTILO E VOZ (DIRETRIZES VITAIS):
- PERSONA: Você não é um jornalista isento. Você é um curador obcecado por estética, texturas e originalidade.
- TOM: Visceral, curto e direto. Evite "academicismo" (palavras difíceis como "amálgama", "paradigma").
- PROIBIDO: Clichês de IA ("mergulho profundo", "tapeçaria sonora", "imperdível").
- VOCABULÁRIO: Use termos de design e produção (ex: "saturação", "textura", "ruído", "estética", "direção de arte").
- ESTRUTURA: Nada de "introdução, desenvolvimento, conclusão". Vá direto ao ponto.

DIRETRIZES DE TEXTO:
- TÍTULO: Impactante em PT-BR (Caixa Alta apenas se for muito urgente). Ex: "JPEGMAFIA TRAZ O CAOS EM NOVO DISCO".
- CORPO: 
  - Parágrafo 1: O Fato (O que é? Como soa? Como se parece?).
  - Parágrafo 2: A Visão (Por que isso é relevante esteticamente? Qual a "vibe"?).

FORMATO (JSON):
{
  "skip": boolean,
  "title": "Título curto e estético em PT-BR",
  "body": "Texto com personalidade, sem enrolação.",
  "tags": ["Gênero", "Estética"],
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

async function runIngestion() {
    console.log('📡 [ESTÁGIO 1] Coletando para a Fila (Backlog)...');

    // Randomiza para não viciar no primeiro feed
    const shuffledFeeds = FEEDS.sort(() => Math.random() - 0.5);

    for (const feedUrl of shuffledFeeds) {
        try {
            const feed = await parser.parseURL(feedUrl);
            const items = feed.items.slice(0, 2); // Top 2 notícias

            for (const item of items) {
                if (!item.link) continue;

                // 1. CHECAGEM DE DUPLICATA (Título ou Link)
                // Verifica se já temos algo com título parecido na Fila ou Posts
                const titleSlug = item.title?.toLowerCase().slice(0, 20); // Primeiros chars
                const query = `count(*[_type in ["queue", "post"] && (link == $link || title match $titleSlug)])`;
                const existing = await sanity.fetch(query, { link: item.link, titleSlug: titleSlug + '*' });

                if (existing > 0) {
                    process.stdout.write('.'); // Skip silencioso
                    continue;
                }

                // 2. PROCESSAMENTO IA
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
                    console.log(`🗑️ Ignorado (Irrelevante): ${data.title || item.title}`);
                    continue;
                }

                // 3. SALVAR NA FILA (Queue)
                // Não cria Post ainda. Guarda para humano ver.
                const linkHash = crypto.createHash('md5').update(item.link).digest('hex');
                await sanity.createIfNotExists({
                    _id: `queue.${linkHash}`,
                    _type: 'queue',
                    title: data.title,
                    body: data.body,
                    link: item.link,
                    source: new URL(feedUrl).hostname.replace('www.', ''),
                    format: (data.format || 'news').toLowerCase(),
                    tags: data.tags || ['Cultura'],
                    aiJson: JSON.stringify(data)
                });
                console.log(`📥 Guardado na Fila: ${data.title}`);
            }
        } catch (err) {
            // Ignora erros de feed individual
        }
    }
    console.log('\n🏁 Coleta finalizada. Verifique a aba "Fila" no Sanity.');
}

runIngestion();
