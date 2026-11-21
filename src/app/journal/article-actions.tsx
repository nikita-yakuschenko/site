'use client'

import { useRef, useState } from 'react'
import { ReactionButtons } from '@/components/reaction-buttons'
import { shareLink } from '../../lib/share'
import { recordJournalReaction } from './reactions'

type Counts = { likes: number; shares: number; liked: boolean }

export function ArticleActions({ slug, title, initial }: { slug: string; title: string; initial: Counts }) {
  const [counts, setCounts] = useState(initial)
  const [message, setMessage] = useState('')
  const pending = useRef(false)

  async function react(action: 'like' | 'unlike' | 'share') {
    try {
      const result = await recordJournalReaction(slug, action)
      if (!result) throw new Error('Reaction unavailable')
      setCounts(result)
    } catch {
      setMessage('Не удалось обновить счётчик')
    } finally {
      pending.current = false
    }
  }

  async function share() {
    if (pending.current) return
    pending.current = true
    const result = await shareLink({ title, url: location.href })
    if (result === 'copied') setMessage('Ссылка скопирована')
    if (result === 'failed') setMessage('Не удалось поделиться ссылкой')
    if (result === 'copied' || result === 'shared') await react('share')
    else pending.current = false
  }

  return <div className="journal-actions">
    <ReactionButtons
      likes={counts.likes}
      shares={counts.shares}
      pressed={counts.liked}
      likeLabel="Нравится"
      onLike={() => {
        if (pending.current) return
        pending.current = true
        void react(counts.liked ? 'unlike' : 'like')
      }}
      onShare={() => void share()}
    />
    <span className="visually-hidden" role="status">{message}</span>
  </div>
}
