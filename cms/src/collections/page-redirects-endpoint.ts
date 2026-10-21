import type { Endpoint } from 'payload'

// Redirect addresses are public routing data; no page content or staff data is exposed.
export const pageRedirectsEndpoint: Endpoint = {
  path: '/redirects', method: 'get', handler: async req => {
    const result = await req.payload.find({ collection: 'pages', pagination: false, depth: 0, overrideAccess: true, req,
      where: { and: [{ kind: { equals: 'redirect' } }, { _status: { equals: 'published' } }] },
      select: { route: true, redirect: true },
    })
    return Response.json({ rules: result.docs.filter(row => row.route && row.redirect).map(row => ({ source: row.route, target: row.redirect })) }, { headers: { 'Cache-Control': 'no-store' } })
  },
}
