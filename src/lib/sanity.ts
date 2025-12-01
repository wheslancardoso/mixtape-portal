// src/lib/sanity.ts
import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';
import type { SanityImageSource } from '@sanity/image-url/lib/types/types';

export const projectId = 'wccgg6vb';
export const dataset = 'production';
export const apiVersion = '2024-03-19';

export const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false, // Pode ser true em produção se quiser cache
});

const builder = imageUrlBuilder(sanityClient);

export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}