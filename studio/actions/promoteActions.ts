import { useClient } from 'sanity'
import { useRouter } from 'sanity/router'
import { uuid } from '@sanity/uuid'
import type { DocumentActionProps, SanityDocument } from 'sanity'

// Interface para tipar os campos específicos da Fila
interface QueueDocument extends SanityDocument {
    title?: string
    body?: string
    link?: string
    source?: string
    tags?: string[]
}

export function PromoteToNewsAction(props: DocumentActionProps) {
    const { id, type, draft, published } = props
    const doc = (draft || published) as QueueDocument
    const client = useClient({ apiVersion: '2024-03-01' })
    const router = useRouter()

    if (type !== 'queue' || !doc) return null

    return {
        label: 'Promover para NEWS 🗞️',
        onHandle: async () => {
            const newId = `news.${uuid()}`

            await client.create({
                _id: newId,
                _type: 'newsItem',
                title: doc.title || 'Sem Título',
                description: doc.body || '',
                link: doc.link,
                source: doc.source,
                date: new Date().toISOString(),
                tags: doc.tags || []
            })

            await client.delete(id)
            router.navigateIntent('edit', { id: newId, type: 'newsItem' })
        }
    }
}

export function PromoteToPostAction(props: DocumentActionProps) {
    const { id, type, draft, published } = props
    const doc = (draft || published) as QueueDocument
    const client = useClient({ apiVersion: '2024-03-01' })
    const router = useRouter()

    if (type !== 'queue' || !doc) return null

    return {
        label: 'Promover para POST 🚀',
        onHandle: async () => {
            const newId = `drafts.${uuid()}`

            // Slugify simples
            const slugBase = doc.title
                ? doc.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 96)
                : 'novo-post'

            await client.create({
                _id: newId,
                _type: 'post',
                title: doc.title || 'Novo Post da Fila',
                slug: { _type: 'slug', current: slugBase },
                format: 'news',
                publishedAt: new Date().toISOString(),
                tags: doc.tags || ['Underground'],
                body: [
                    {
                        _type: 'block',
                        children: [{ _type: 'span', text: doc.body || '' }]
                    },
                    {
                        _type: 'block',
                        children: [{ _type: 'span', text: doc.source ? `Fonte: ${doc.source} (${doc.link})` : '' }]
                    }
                ]
            })

            await client.delete(id)
            router.navigateIntent('edit', { id: newId, type: 'post' })
        }
    }
}
