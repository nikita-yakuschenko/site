'use client'

import { useEffect, useState } from 'react'
import { IconStarFilled } from '@tabler/icons-react'

const REVIEWS_URL = 'https://yandex.ru/maps/org/168967074576/reviews/'

export function YandexRating() {
  const [rating, setRating] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/yandex-rating', { signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(data => { if (typeof data?.rating === 'number' && data.rating >= 0 && data.rating <= 5) setRating(data.rating) })
      .catch(() => {})
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])
  return <a className="yandex-rating" href={REVIEWS_URL} target="_blank" rel="noopener noreferrer" aria-label={rating !== null ? `Рейтинг на Яндексе: ${rating} из 5. Читать отзывы` : 'Читать отзывы на Яндексе'}>
    <span className="yandex-rating__row">
      <strong>{rating !== null ? rating.toLocaleString('ru-RU', { minimumFractionDigits: 1 }) : loading ? '…' : 'Яндекс'}</strong>
      {rating !== null ? <span className="yandex-rating__stars" aria-hidden>{Array.from({ length: 5 }, (_, index) => <span className="yandex-rating__star" key={index}><IconStarFilled size={20} /><span style={{ width: `${Math.max(0, Math.min(1, rating - index)) * 100}%` }}><IconStarFilled size={20} /></span></span>)}</span> : null}
    </span>
    <span className="yandex-rating__caption">{rating !== null ? 'Наш рейтинг в Яндексе' : loading ? 'Загружаем рейтинг' : 'Отзывы на Яндекс Картах'}</span>
  </a>
}
