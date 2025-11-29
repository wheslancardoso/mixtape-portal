import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'newsItem',
    title: 'Notícias Rápidas (News) 🗞️',
    type: 'document',
    fields: [
        defineField({ name: 'title', title: 'Manchete', type: 'string', validation: Rule => Rule.required() }),
        defineField({ name: 'description', title: 'Resumo Curto', type: 'text', rows: 3 }),
        defineField({ name: 'link', title: 'Link Externo', type: 'url' }),
        defineField({ name: 'source', title: 'Fonte', type: 'string' }),
        defineField({ name: 'date', title: 'Data', type: 'datetime', initialValue: () => new Date().toISOString() }),
        defineField({
            name: 'tags',
            title: 'Tags',
            type: 'array',
            of: [{ type: 'string' }],
            options: { layout: 'tags' }
        })
    ],
    preview: {
        select: { title: 'title', subtitle: 'source' }
    }
})
