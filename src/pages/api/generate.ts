import type { APIRoute } from 'astro';
import OpenAI from 'openai';
import { sanityWriteClient } from '../../lib/sanity.server';
import crypto from 'crypto';
import slugify from 'slugify';

// Força a renderização no servidor (SSR) para esta rota
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    console.log('API /api/generate chamada...'); // Log para debug

    try {
        // 1. Carregar Variáveis (Priorizando Astro)
        const openaiKey = process.env.OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY;

        // Debug no Terminal (mostra status sem revelar segredos)
        console.log('Configuração Carregada:', {
            openaiKey: openaiKey ? 'OK' : 'FALTANDO'
        });

        if (!openaiKey) {
            throw new Error(`Configuração incompleta no .env. Verifique o terminal.`);
        }

        // 2. Ler o Corpo da Requisição
        const body = await request.json().catch(() => null);
        if (!body) {
            throw new Error('Corpo da requisição inválido ou vazio.');
        }
        const { topic, mode } = body;

        // 3. Configurar Clientes
        // sanityWriteClient já está configurado em lib/sanity.server.ts

        const openai = new OpenAI({ apiKey: openaiKey });

        // 4. Prompt & Geração
        const SYSTEM_PROMPT = `
        Você é o Editor de uma Zine Digital chamada 'Mixtape252'.
        SUA IDENTIDADE: Brutalista, Underground, Obcecado por Estética e Avesso ao Mainstream Plástico.

        SUA MISSÃO: 
        Não apenas "informar", mas traduzir a vibe visual e sonora. Você escreve para criativos, designers e beatmakers, não para o público geral.

        DIRETRIZES DE ESTILO (O "TOM DE VOZ"):
        1. VISCERAL, NÃO ACADÊMICO: Substitua "Este artigo analisa..." por "Isso soa como...". Fale da sensação, da textura, do ruído.
        2. TÉCNICO, MAS SUJO: Use termos de produção (sample, bitcrush, grão, saturação, reverb) para descrever a obra. Mostre que você entende do assunto.
        3. DIRETO AO PONTO: Frases curtas. Punchlines. Sem "enrolação introdutória".
        4. OPINATIVO: Não fique em cima do muro. Se é caótico, diga que é caótico. Se é nostálgico, diga que cheira a mofo e VHS.

        O QUE NÃO FAZER (LISTA NEGRA):
        - JAMAIS use: "Mergulho profundo", "Amálgama", "Tapeçaria sonora", "Imperdível", "No cenário atual", "Implicações culturais".
        - JAMAIS comece com: "O Vapor

        FORMATO JSON: { "title": "...", "body": "...", "tags": [], "format": "article" }
        `;

        const userPrompt = mode === 'random'
            ? 'Escolha um tema aleatório (pode ser um Álbum Experimental, um Filme Cult Visualmente Rico ou um Movimento de Arte Digital/Glitch) e escreva sobre ele.'
            : `Escreva uma análise visceral e estética sobre: "${topic}".`;
        console.log('Perguntando para a IA...');

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: userPrompt }
            ],
            response_format: { type: 'json_object' }
        });

        const data = JSON.parse(completion.choices[0].message.content || '{}');
        console.log('IA Respondeu:', data.title);

        // 5. Salvar DIRETO COMO RASCUNHO (Skip Queue)
        const slug = slugify(data.title, { lower: true, strict: true }).slice(0, 90);
        const draftId = `drafts.gen.${crypto.createHash('md5').update(data.title).digest('hex')}`;

        await sanityWriteClient.createIfNotExists({
            _id: draftId,
            _type: 'post', // Agora é um Post real
            title: data.title,
            slug: { _type: 'slug', current: slug },
            format: 'article',
            tags: data.tags || ['Original'],
            publishedAt: new Date().toISOString(),
            body: [
                {
                    _type: 'block',
                    children: [{ _type: 'span', text: data.body }]
                }
            ]
        });

        console.log('Salvo no Sanity com sucesso.');

        return new Response(JSON.stringify({ success: true, title: data.title }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error('❌ Erro na API:', error);
        // Retorna o erro como JSON para o frontend não quebrar com "Unexpected end of JSON"
        return new Response(JSON.stringify({
            error: error.message || 'Erro interno no servidor',
            details: error.stack
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
