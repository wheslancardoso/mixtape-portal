import 'dotenv/config';
import Parser from 'rss-parser';
import OpenAI from 'openai';
import { createClient } from '@sanity/client';
import slugify from 'slugify';
import { v4 as uuidv4 } from 'uuid';

// --- CONFIGURAÇÃO ---

const FEEDS = [
    // 🎤 HIP-HOP & UNDERGROUND (Prioridade Absoluta)
    'https://www.passionweiss.com/feed/',
    'https://fake-shore-drive.com/feed/',
    'https://www.thefader.com/feed',

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

const MAX_DRAFTS = 3; // Limite diário de posts (Qualidade > Quantidade)

const SYSTEM_PROMPT = `
Você é o Curador Fantasma da 'Mixtape252', uma zine digital underground/punk brasileira.
SUA MISSÃO: Filtrar o lixo mainstream e destacar o ouro underground.

REGRA DE OURO (ANTI-VAGUEZA):
- PROIBIDO textos genéricos como 'uma jornada sonora' ou 'imperdível'.
- OBRIGATÓRIO CITAR DETALHES TÉCNICOS: Nomes de produtores, sintetizadores usados, samples específicos, gravadoras, contexto histórico.
- Use metáforas sujas e visuais: 'bateria seca', 'guitarra com ferrugem', 'timbre de caverna'.

FILTRO ELITISTA (Seja rigoroso):
- IGNORE (skip: true): Fofocas, Mainstream (Drake, Taylor Swift), Promoções de Venda/Black Friday, Listas ('Top 10'), Anúncios corporativos.
- APROVE (skip: false): Hip-Hop Underground, Jazz Experimental, Noise, Post-Punk, Cinema de Autor, Lançamentos de Selos Independentes.

FORMATO DE SAÍDA (JSON):
{
  "skip": boolean,
  "title": "Título curto e impactante em PT-BR (Use gírias da cena)",
  "body": "Resumo de 2 parágrafos. O primeiro técnico/informativo, o segundo opinativo/ácido.",
  "tags": ["Tag1", "Tag2", "Tag3"],
  "format": "news"
}
`;

// --- CLIENTES & AMBIENTE ---

// Fallback para variáveis com prefixo PUBLIC_ (Astro) ou sem (Node)
const PROJECT_ID = process.env.SANITY_PROJECT_ID || process.env.PUBLIC_SANITY_PROJECT_ID;
const DATASET = process.env.SANITY_DATASET || process.env.PUBLIC_SANITY_DATASET;
const TOKEN = process.env.SANITY_API_TOKEN;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

// Validação de segurança
if (!PROJECT_ID || !DATASET || !TOKEN || !OPENAI_KEY) {
    console.error('❌ Erro de Configuração: Verifique seu arquivo .env');
    console.error('Necessário: SANITY_PROJECT_ID, SANITY_DATASET, SANITY_API_TOKEN, OPENAI_API_KEY');
    process.exit(1);
}

const sanity = createClient({
    projectId: PROJECT_ID,
    dataset: DATASET,
    token: TOKEN,
    useCdn: false,
    apiVersion: '2024-03-01',
});

const openai = new OpenAI({
    apiKey: OPENAI_KEY,
});

// Configura User-Agent para não ser bloqueado por sites como Treble/Quietus
const parser = new Parser({
    headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
});

// --- LÓGICA ---

async function fetchFeed(url: string) {
    try {
        console.log(`📡 Sintonizando: ${url}`);
        const feed = await parser.parseURL(url);
        // Pega apenas os 2 mais recentes de cada feed para economizar tokens
        return feed.items.slice(0, 2);
    } catch (error) {
        // Erros de feed são normais (timeout, 404), apenas ignoramos
        return [];
    }
}

async function processWithAI(item: any) {
    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                {
                    role: 'user',
                    content: `Analise este conteúdo:\nTítulo: ${item.title}\nConteúdo: ${item.contentSnippet || item.content}\nLink: ${item.link}`,
                },
            ],
            response_format: { type: 'json_object' },
        });

        const content = completion.choices[0].message.content;
        if (!content) return null;

        return JSON.parse(content);
    } catch (error) {
        console.error(`⚠️ Erro na IA:`, error);
        return null;
    }
}

async function saveDraft(data: any, originalLink: string) {
    // Se a IA mandou pular, ignoramos
    if (data.skip) {
        console.log(`🗑️ Lixo ignorado: ${data.title}`);
        return false;
    }

    // Validação de segurança para o Sanity (evita erro "Value must be one of...")
    const validFormats = ['news', 'review', 'article', 'interview'];
    const safeFormat = validFormats.includes(data.format?.toLowerCase())
        ? data.format.toLowerCase()
        : 'news';

    const slug = slugify(data.title, { lower: true, strict: true }).slice(0, 90);
    const draftId = `drafts.auto-${uuidv4()}`;

    const doc = {
        _id: draftId,
        _type: 'post',
        title: data.title,
        slug: { _type: 'slug', current: slug },
        format: safeFormat,
        tags: Array.isArray(data.tags) ? data.tags : ['Underground'],
        publishedAt: new Date().toISOString(),
        body: [
            {
                _type: 'block',
                children: [
                    { _type: 'span', text: data.body }
                ],
            },
            {
                _type: 'block',
                children: [
                    { _type: 'span', text: `Fonte original: ${originalLink}` }
                ],
            }
        ],
    };

    try {
        await sanity.create(doc);
        console.log(`🔥 Rascunho Criado: ${data.title}`);
        return true; // Sucesso
    } catch (error) {
        console.error(`❌ Erro ao salvar no Sanity:`, error);
        return false;
    }
}

async function main() {
    console.log('🏴 [MIXTAPE252] Iniciando patrulha do underground...');

    let draftsSaved = 0;

    // Embaralha os feeds para não dar prioridade sempre aos mesmos
    const shuffledFeeds = FEEDS.sort(() => Math.random() - 0.5);

    for (const feedUrl of shuffledFeeds) {
        // Se já bateu a meta do dia, para tudo
        if (draftsSaved >= MAX_DRAFTS) {
            console.log('🛑 Meta diária atingida (3 posts). Encerrando para manter a escassez.');
            break;
        }

        const items = await fetchFeed(feedUrl);

        for (const item of items) {
            if (draftsSaved >= MAX_DRAFTS) break;

            const aiData = await processWithAI(item);

            if (aiData) {
                const saved = await saveDraft(aiData, item.link || '');
                if (saved) {
                    draftsSaved++;
                }
            }
        }
    }

    console.log(`🏁 Patrulha encerrada. Total de rascunhos: ${draftsSaved}`);
}

main();
