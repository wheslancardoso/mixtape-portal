// Configuração do cliente Sanity será implementada aqui.
// @sanity/client e @sanity/image-url já estão instalados.

export const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID;
export const dataset = import.meta.env.PUBLIC_SANITY_DATASET || 'production';
export const apiVersion = '2024-03-19';

