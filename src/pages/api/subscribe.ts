import type { APIRoute } from 'astro';
import { sanityWriteClient } from '../../lib/sanity';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const email = formData.get('email')?.toString();

    // Validação básica
    if (!email) {
      return new Response(JSON.stringify({ error: 'Email é obrigatório' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validação de formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: 'Email inválido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verifica se o email já existe
    const existing = await sanityWriteClient.fetch(
      `*[_type == "subscriber" && email == $email][0]`,
      { email }
    );

    if (existing) {
      return new Response(JSON.stringify({ error: 'Este email já está cadastrado' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Cria o subscriber no Sanity
    const subscriber = await sanityWriteClient.create({
      _type: 'subscriber',
      email,
      joinedAt: new Date().toISOString(),
      active: true,
    });

    return new Response(JSON.stringify({ success: true, id: subscriber._id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return new Response(JSON.stringify({ error: 'Erro ao processar inscrição' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

