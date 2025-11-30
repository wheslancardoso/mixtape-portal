import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'newsItem',
    title: 'Notícias Rápidas (News) 🗞️',
    type: 'document',
    fields: [
        defineField({ name: 'title', title: 'Manchete', type: 'string', validation: Rule => Rule.required() }),
        defineField({
            name: 'channel',
            title: 'Canal de Transmissão',
            type: 'string',
            description: 'Em qual frequência isso será transmitido? Define a cor e a estética do card.',
            options: {
                list: [
                    { title: '📟 SYSTEM_LOG (Tech/Code)', value: 'system_log' },
                    { title: '🎸 DISTORÇÃO (Música/Cena)', value: 'distorcao' },
                    { title: '👾 PIXEL_TRASH (Art/Design)', value: 'pixel_trash' },
                ],
                layout: 'radio', // CRÍTICO: Manter como radio para facilitar uso no mobile (1 tap)
            },
            validation: (Rule) => Rule.required(),
            initialValue: 'distorcao',
        }),
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
