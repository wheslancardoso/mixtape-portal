import type { APIRoute } from 'astro';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { sanityClient, urlFor } from '../../lib/sanity';

export const prerender = false;

// Busca fonte Anton
async function fetchFont(text: string) {
  const url = `https://fonts.googleapis.com/css2?family=Anton&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(url)).text();
  const resource = css.match(/src: url\((.+)\) format\('(opentype|truetype|woff)'\)/);
  if (!resource) throw new Error('Erro ao carregar fonte');
  return await fetch(resource[1]).then((res) => res.arrayBuffer());
}

export const GET: APIRoute = async ({ url }) => {
  try {
    const slug = url.searchParams.get('slug');
    if (!slug) return new Response('Slug missing', { status: 400 });

    const post = await sanityClient.fetch(
      `*[_type == "post" && slug.current == $slug][0]{ title, mainImage, publishedAt }`,
      { slug }
    );

    if (!post) return new Response('Post not found', { status: 404 });

    const title = post.title ? post.title.toUpperCase() : 'SEM TÍTULO';
    const date = new Date(post.publishedAt || Date.now()).toLocaleDateString('pt-BR');
    const imageUrl = post.mainImage ? urlFor(post.mainImage).width(1200).height(1200).url() : null;

    const fontData = await fetchFont(title + date + 'MIXTAPE252');

    const svg = await satori(
      {
        type: 'div',
        props: {
          style: {
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#1a1a1a',
            position: 'relative',
          },
          children: [
            // 1. Fundo (Imagem)
            imageUrl && {
              type: 'img',
              props: {
                src: imageUrl,
                style: {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  filter: 'contrast(115%) brightness(1.1)', 
                },
              },
            },
            
            // 2. Ruído (Ajustado para ser MUITO SUTIL)
            {
              type: 'div',
              props: {
                style: {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  // Mudei de 0.15 para 0.05 (5%). Fica elegante e imperceptível à primeira vista.
                  opacity: 0.05, 
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                },
              },
            },

            // 3. Container de Conteúdo (Mantendo seu layout aprovado)
            {
              type: 'div',
              props: {
                style: {
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '60px', 
                  margin: '0px', 
                },
                children: [
                  // Topo (Badge)
                  {
                    type: 'div',
                    props: {
                      children: `MIXTAPE // ${date}`,
                      style: {
                        color: '#ff4d00',
                        fontSize: '30px',
                        fontFamily: 'Anton',
                        backgroundColor: 'black',
                        padding: '10px 20px',
                        alignSelf: 'flex-end',
                        transform: 'rotate(2deg)',
                      },
                    },
                  },
                  // Título
                  {
                    type: 'div',
                    props: {
                      children: title,
                      style: {
                        color: 'white',
                        fontSize: '100px',
                        fontFamily: 'Anton',
                        lineHeight: '0.9',
                        textTransform: 'uppercase',
                        textShadow: '4px 4px 0px #000',
                      },
                    },
                  },
                ],
              },
            },
          ].filter(Boolean),
        },
      } as any,
      {
        width: 1080,
        height: 1080,
        fonts: [{ name: 'Anton', data: fontData, style: 'normal' }],
      }
    );

    const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1080 } });
    const pngBuffer = resvg.render().asPng();

    return new Response(pngBuffer as any, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('OG Image Generation Error:', error);
    return new Response('Failed to generate image', { status: 500 });
  }
};