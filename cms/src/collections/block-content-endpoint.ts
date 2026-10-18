import type { Endpoint } from 'payload'
import { authorizeSiteRequest } from './project-hero-endpoint'

type MediaValue = { url?: string | null } | string | number | null | undefined

function mediaURL(image: MediaValue) {
  if (!image || typeof image !== 'object' || !image.url) return ''
  return new URL(image.url, process.env.CMS_PUBLIC_URL || 'http://localhost:3001').href
}

function formKey(form: unknown) {
  if (!form || typeof form !== 'object' || !('key' in form)) return ''
  return typeof form.key === 'string' ? form.key : ''
}

// The public site reads saved block copy. The admin API stays staff-only.
export const blockContentEndpoint: Endpoint = {
  path: '/content', method: 'get', handler: async req => {
    const denied = authorizeSiteRequest(req)
    if (denied) return denied
    const params = new URL(req.url || '').searchParams
    if (params.get('all') === '1') {
      const result = await req.payload.find({ collection: 'blocks', pagination: false, depth: 1, overrideAccess: true, req, select: { key: true, defaults: true, parts: true } })
      const route = params.get('route')
      return Response.json({ blocks: result.docs.filter(block => (block.defaults as { contentBinding?: string } | null)?.contentBinding === 'react' && (!route || !(block.defaults as { contentScope?: string } | null)?.contentScope || (block.defaults as { contentScope?: string }).contentScope === route)).map(block => ({
        key: block.key,
        scope: (block.defaults as { contentScope?: string } | null)?.contentScope || '',
        gallery: (block.defaults as { contentGallery?: boolean } | null)?.contentGallery === true,
        parts: (block.parts || []).filter(part => part.key.includes('.content.')).map(part => ({ key: part.key, title: part.title || '', text: part.text ?? '', href: part.href ?? '', image: mediaURL(part.image) || part.textMore || '', originalImage: part.textMore || '' })),
      })) }, { headers: { 'Cache-Control': 'no-store' } })
    }
    const key = params.get('key') || ''
    if (!/^[A-Za-z0-9]+(?:[.-][A-Za-z0-9]+)*$/.test(key)) return Response.json({ error: 'Некорректный ключ' }, { status: 400 })
    const result = await req.payload.find({ collection: 'blocks', where: { key: { equals: key } }, limit: 1, depth: 1, overrideAccess: true, req })
    const parts = (result.docs[0]?.parts || []).map(part => ({
      key: part.key,
      title: part.title || '',
      text: part.text || '',
      textMore: part.textMore || '',
      href: part.href || '',
      action: part.action === 'link' ? 'link' : part.action === 'form' ? 'form' : '',
      url: part.link || '',
      form: formKey(part.form),
      image: mediaURL(part.image),
      imageMobile: mediaURL(part.imageMobile),
    }))
    return Response.json({ parts }, { headers: { 'Cache-Control': 'no-store' } })
  },
}
