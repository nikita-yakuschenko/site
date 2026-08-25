import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { describe, it, beforeAll, expect } from 'vitest'

const hasDb = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDb)('API', () => {
  let payload: Payload

  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })
  })

  it('fetches users', async () => {
    const users = await payload.find({
      collection: 'users',
    })
    expect(users).toBeDefined()
  })

  it('hides draft pages from public reads', async () => {
    const pages = await payload.find({
      collection: 'pages',
      draft: false,
      overrideAccess: false,
      limit: 50,
    })
    expect(pages.docs.every((page) => page._status !== 'draft')).toBe(true)
  })
})
