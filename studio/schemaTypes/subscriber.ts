import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'subscriber',
  title: 'Subscriber',
  type: 'document',
  fields: [
    defineField({
      name: 'email',
      title: 'Email',
      type: 'string',
      validation: (Rule) => Rule.required().email(),
    }),
    defineField({
      name: 'joinedAt',
      title: 'Joined At',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: 'active',
      title: 'Active',
      type: 'boolean',
      initialValue: true,
    }),
  ],

  preview: {
    select: {
      email: 'email',
      joinedAt: 'joinedAt',
    },
    prepare(selection) {
      const { email, joinedAt } = selection
      return {
        title: email,
        subtitle: joinedAt ? new Date(joinedAt).toLocaleDateString('pt-BR') : 'No date',
      }
    },
  },
})

