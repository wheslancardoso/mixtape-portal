import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'queue',
    title: 'Fila de Curadoria',
    type: 'document',
    icon: () => '⏳',
    fields: [
        defineField({ name: 'title', title: 'Título', type: 'string' }),
        defineField({ name: 'body', title: 'Texto (IA)', type: 'text' }),
        defineField({ name: 'link', title: 'Link Original', type: 'url' }),
        defineField({ name: 'source', title: 'Fonte', type: 'string' }),
        defineField({ name: 'format', title: 'Formato Sugerido', type: 'string' }),
        defineField({ name: 'tags', title: 'Tags', type: 'array', of: [{ type: 'string' }] }),
        defineField({ name: 'aiJson', title: 'Dados Crus (JSON)', type: 'text', hidden: true }),
    ],
    preview: {
        select: { title: 'title', subtitle: 'source' }
    }
})
