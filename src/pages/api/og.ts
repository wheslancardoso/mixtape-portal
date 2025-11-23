import type { APIRoute } from "astro";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { sanityClient } from "../../lib/sanity";
import imageUrlBuilder from "@sanity/image-url";

export const prerender = false;

const builder = imageUrlBuilder(sanityClient);

function urlFor(source: any) {
  return builder.image(source);
}

// Noise texture for the "Punk/Zine" aesthetic
const noiseTexture = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MDAiIGhlaWdodD0iNTAwIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuNjUiIG51bTBPY3RhdmVzPSIzIiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI25vaXNlKSIgb3BhY2l0eT0iMC41Ii8+PC9zdmc+`;

const fetchFont = async (font: string, weights: number[], text: string = '') => {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=${font}:wght@${weights.join(
        ";"
      )}&text=${encodeURIComponent(text)}`
    ).then((res) => res.text());

    const resource = css.match(
      /src: url\((.+?)\) format\('(opentype|truetype)'\)/
    );

    if (!resource) return null;

    const res = await fetch(resource[1]);
    return res.arrayBuffer();
  } catch (e) {
    console.error(`Error fetching font ${font}:`, e);
    return null;
  }
};

export const GET: APIRoute = async ({ url }) => {
  try {
    const slug = url.searchParams.get("slug");

    if (!slug) {
      return new Response("Missing slug", { status: 400 });
    }

    // 1. Fetch Data from Sanity
    const post = await sanityClient.fetch(
      `*[_type == "post" && slug.current == $slug][0]{
        title,
        publishedAt,
        mainImage
      }`,
      { slug }
    );

    if (!post) {
      return new Response("Post not found", { status: 404 });
    }

    // 2. Prepare Data
    const title = post.title || "Sem Título";
    const date = post.publishedAt
      ? new Date(post.publishedAt).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
      : "DATA DESCONHECIDA";

    const imageUrl = post.mainImage
      ? urlFor(post.mainImage).width(1080).height(1080).fit("crop").url()
      : null;

    // 3. Fetch Fonts
    const antonFontData = await fetchFont("Anton", [400], title);
    const spaceMonoFontData = await fetchFont("Space Mono", [400, 700], `MIXTAPE252 // ${date}`);

    // Fallback if fetchFont fails (it returns null)
    // We can use the direct fetch as backup or just let it fail if strict.
    // Given "bulletproof", let's have a fallback or throw.
    // But fetchFont already catches errors and returns null.
    // Satori needs ArrayBuffer.

    if (!antonFontData || !spaceMonoFontData) {
      return new Response("Failed to load fonts", { status: 500 });
    }

    // 4. Generate SVG with Satori
    const svg = await satori(
      {
        type: "div",
        props: {
          style: {
            display: "flex",
            height: "100%",
            width: "100%",
            backgroundColor: "#000",
            position: "relative",
            overflow: "hidden",
          },
          children: [
            // Background Image
            imageUrl
              ? {
                type: "img",
                props: {
                  src: imageUrl,
                  style: {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    filter: "grayscale(100%) contrast(120%)",
                  },
                },
              }
              : {
                type: "div",
                props: {
                  style: {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    backgroundColor: "#111",
                    backgroundImage: `url(${noiseTexture})`,
                    backgroundRepeat: "repeat",
                  },
                },
              },
            // Noise Overlay
            {
              type: "div",
              props: {
                style: {
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  backgroundImage: `url(${noiseTexture})`,
                  opacity: 0.15,
                  mixBlendMode: "overlay",
                  pointerEvents: "none",
                },
              },
            },
            // Border Frame
            {
              type: "div",
              props: {
                style: {
                  position: "absolute",
                  top: "20px",
                  left: "20px",
                  right: "20px",
                  bottom: "20px",
                  border: "20px solid white",
                  zIndex: 10,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  padding: "40px",
                },
                children: [
                  // Top Right Label
                  {
                    type: "div",
                    props: {
                      style: {
                        display: "flex",
                        justifyContent: "flex-end",
                        width: "100%",
                      },
                      children: [
                        {
                          type: "span",
                          props: {
                            style: {
                              backgroundColor: "#000",
                              color: "#fff",
                              padding: "10px 20px",
                              fontFamily: "Space Mono",
                              fontSize: "32px",
                              fontWeight: "bold",
                              letterSpacing: "-1px",
                            },
                            children: `MIXTAPE252 // ${date}`,
                          },
                        },
                      ],
                    },
                  },
                  // Title
                  {
                    type: "div",
                    props: {
                      style: {
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "flex-end",
                        alignItems: "flex-start",
                      },
                      children: [
                        {
                          type: "h1",
                          props: {
                            style: {
                              fontFamily: "Anton",
                              fontSize: "180px",
                              color: "#fff",
                              lineHeight: 0.85,
                              margin: 0,
                              padding: 0,
                              textTransform: "uppercase",
                              wordBreak: "break-word",
                              display: "flex",
                              flexDirection: "column",
                            },
                            children: title,
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      } as any,
      {
        width: 1080,
        height: 1080,
        fonts: [
          {
            name: "Anton",
            data: antonFontData,
            style: "normal",
          },
          {
            name: "Space Mono",
            data: spaceMonoFontData,
            style: "normal",
          },
        ],
      }
    );

    // 5. Render to PNG
    const resvg = new Resvg(svg, {
      fitTo: {
        mode: "width",
        value: 1080,
      },
    });
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    // 6. Return Response
    return new Response(pngBuffer as any, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("OG Image Generation Error:", error);
    return new Response("Failed to generate image", { status: 500 });
  }
};
