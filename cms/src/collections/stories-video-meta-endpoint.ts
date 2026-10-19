import type { Endpoint } from 'payload'
import { fetchVideoMetaFromUrl } from '../config/video-meta'

export const storiesVideoMetaEndpoint: Endpoint = {
  path: '/video-meta', method: 'get', handler: async req => {
    if (!req.user) return Response.json({ error: 'Нет доступа' }, { status: 401 })
    const url = new URL(req.url!).searchParams.get('url')
    if (!url) return Response.json({ error: 'Нужна ссылка' }, { status: 400 })
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)
    try {
      const meta = await fetchVideoMetaFromUrl(url, controller.signal)
      if (!meta) return Response.json({ error: 'Не удалось прочитать видео' }, { status: 404 })
      return Response.json(meta, { headers: { 'Cache-Control': 'no-store' } })
    } finally {
      clearTimeout(timer)
    }
  },
}
