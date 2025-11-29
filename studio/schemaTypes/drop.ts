import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'drop',
  title: 'Drop (Edição)',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Título da Edição',
      description: 'Ex: "Vol. 01", "Edição #42"',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Data de Publicação',
      type: 'datetime',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'coverImage',
      title: 'Imagem de Capa',
      description: 'A arte do cabeçalho da edição',
      type: 'image',
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: 'editorial',
      title: 'Editorial',
      description: 'Texto de introdução/manifesto da edição',
      type: 'text',
      rows: 5,
    }),
    defineField({
      name: 'featuredPosts',
      title: 'Posts em Destaque',
      description: 'Selecione os posts que compõem esta edição',
      type: 'array',
      of: [
        {
          type: 'reference',
          to: [{ type: 'post' }],
        },
      ],
      validation: (Rule) => Rule.min(1).error('Selecione pelo menos um post'),
    }),
    defineField({
      name: 'newsDigest',
      title: 'Digest de Notícias (Para o E-mail)',
      description: 'Selecione as notícias rápidas que entram nesta edição.',
      type: 'array',
      of: [{ type: 'reference', to: { type: 'newsItem' } }]
    }),
  ],

  preview: {
    select: {
      title: 'title',
      media: 'coverImage',
      publishedAt: 'publishedAt',
    },
    prepare(selection) {
      const { publishedAt } = selection
      const date = publishedAt
        ? new Date(publishedAt).toLocaleDateString('pt-BR')
        : 'Sem data'
      return { ...selection, subtitle: date }
    },
  },
})

