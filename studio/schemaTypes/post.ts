import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'post',
  title: 'Post',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
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
      name: 'mainImage',
      title: 'Main image',
      type: 'image',
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published at',
      type: 'datetime',
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'format',
      title: 'Format',
      type: 'string',
      options: {
        list: [
          { title: '⚡ Flash/Notícia', value: 'news' },
          { title: '📝 Ensaio/Original', value: 'article' },
          { title: '💿 Review/Crítica', value: 'review' },
          { title: '🎤 Entrevista', value: 'interview' },
        ],
        layout: 'radio',
      },
      initialValue: 'news',
      validation: (Rule) => Rule.required(),
    }),
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
    defineField({
      name: 'tags',
      title: 'Tags (Categorias)',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        // Removemos o layout: 'tags' que buga no mobile.
        // Adicionamos uma lista de sugestões comuns para clicar em vez de digitar.
        list: [
          { title: 'Hip-Hop', value: 'Hip-Hop' },
          { title: 'Rock/Indie', value: 'Rock' },
          { title: 'Eletrônica', value: 'Eletrônica' },
          { title: 'Cinema', value: 'Cinema' },
          { title: 'Design', value: 'Design' },
          { title: 'Tech', value: 'Tech' },
          { title: 'Underground', value: 'Underground' },
          { title: 'Manifesto', value: 'Manifesto' },
        ],
      },
      description: 'Selecione da lista ou digite uma nova tag personalizada.',
      validation: (Rule) => Rule.min(1).error('Selecione pelo menos uma tag.'),
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [
        {
          type: 'block',
        },
        {
          type: 'image',
          options: { hotspot: true },
        },
      ],
    }),
  ],

  preview: {
    select: {
      title: 'title',
      author: 'author.name',
      media: 'mainImage',
    },
    prepare(selection) {
      const { author } = selection
      return { ...selection, subtitle: author && `by ${author}` }
    },
  },
})

