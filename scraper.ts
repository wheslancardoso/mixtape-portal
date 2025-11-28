import 'dotenv/config';
import Parser from 'rss-parser';
import OpenAI from 'openai';
import { createClient } from '@sanity/client';
import slugify from 'slugify';
import { v4 as uuidv4 } from 'uuid';

// --- CONFIGURATION ---

const FEEDS = [
    'https://thequietus.com/feed',
    'https://www.dazeddigital.com/feed',
    'https://pitchfork.com/feed/feed-news/rss',
    'https://stereogum.com/feed',
    'https://consequence.net/feed/',
];

const SYSTEM_PROMPT = `
Você é o Curador Fantasma da 'Mixtape252', uma zine digital underground/punk brasileira.
SUA MISSÃO: Filtrar o lixo mainstream e destacar o ouro underground.
PERSONALIDADE: Ácido, crítico, usa gírias como 'fuzz', 'lo-fi', 'hype', 'cena'.
FILTRO:
- IGNORE (skip: true): Fofocas de celebridades (Taylor Swift, Kardashians), filmes de herói, polêmicas vazias.
- APROVE (skip: false): Post-Punk, Noise, Cinema de Autor, Moda Subversiva, Hip-Hop Experimental.
FORMATO DE SAÍDA (JSON):
{
  "skip": boolean,
  "title": "Título curto e impactante em PT-BR",
  "body": "Resumo de 2 parágrafos com opinião ácida em PT-BR",
  "tags": ["Tag1", "Tag2"],
  "format": "news" | "review" | "article"
}
`;

// --- CLIENTS ---

if (!process.env.SANITY_PROJECT_ID || !process.env.SANITY_DATASET || !process.env.SANITY_API_TOKEN) {
    console.error('❌ Missing Sanity configuration. Please check your .env file.');
    process.exit(1);
}

if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Missing OpenAI API Key. Please check your .env file.');
    process.exit(1);
}

const sanity = createClient({
    projectId: process.env.SANITY_PROJECT_ID,
    dataset: process.env.SANITY_DATASET,
    token: process.env.SANITY_API_TOKEN,
    useCdn: false, // We are writing data
    apiVersion: '2024-03-01',
});

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const parser = new Parser();

// --- LOGIC ---

async function fetchFeed(url: string) {
    try {
        console.log(`📡 Fetching feed: ${url}`);
        const feed = await parser.parseURL(url);
        return feed.items.slice(0, 3); // Process only the latest 3 items per feed to save tokens
    } catch (error) {
        console.error(`⚠️ Error fetching ${url}:`, error);
        return [];
    }
}

async function processWithAI(item: any) {
    try {
        console.log(`🧠 Processing: ${item.title}`);

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o', // Or gpt-4-turbo
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
        console.error(`⚠️ Error processing with AI:`, error);
        return null;
    }
}

async function saveDraft(data: any, originalLink: string) {
    if (data.skip) {
        console.log(`🗑️ Skipped: ${data.title}`);
        return;
    }

    const slug = slugify(data.title, { lower: true, strict: true });
    const draftId = `drafts.auto-${uuidv4()}`;

    const doc = {
        _id: draftId,
        _type: 'post',
        title: data.title,
        slug: { _type: 'slug', current: slug },
        format: data.format,
        tags: data.tags,
        publishedAt: new Date().toISOString(),
        body: [
            {
                _type: 'block',
                children: [
                    {
                        _type: 'span',
                        text: data.body,
                    },
                ],
            },
            {
                _type: 'block',
                children: [
                    {
                        _type: 'span',
                        text: `Fonte original: ${originalLink}`,
                    },
                ],
            }
        ],
    };

    try {
        await sanity.create(doc);
        console.log(`✅ Draft saved: ${data.title} (${draftId})`);
    } catch (error) {
        console.error(`❌ Error saving draft:`, error);
    }
}

async function main() {
    console.log('🚀 Starting Content Scraper...');

    for (const feedUrl of FEEDS) {
        const items = await fetchFeed(feedUrl);

        for (const item of items) {
            const aiData = await processWithAI(item);
            if (aiData) {
                await saveDraft(aiData, item.link || '');
            }
        }
    }

    console.log('🏁 Scraper finished.');
}

main();
