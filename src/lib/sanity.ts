import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';
import type { SanityImageSource } from '@sanity/image-url/lib/types/types';

export const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID;
export const dataset = import.meta.env.PUBLIC_SANITY_DATASET || 'production';
export const apiVersion = '2024-03-19';

export const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true, // Set to false if statically generating pages, using ISR or tag-based revalidation
});

// Cliente com permissão de escrita (para API routes)
export const sanityWriteClient = createClient({
  projectId,
  dataset,
  apiVersion,
  token: import.meta.env.SANITY_API_TOKEN,
  useCdn: false, // Importante: false para garantir dados frescos na escrita
  ignoreBrowserTokenWarning: true,
});

const builder = imageUrlBuilder(sanityClient);

export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}
