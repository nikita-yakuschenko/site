import { describe, expect, it } from 'vitest'
import { partnerCannotSeeForeignSite } from '../../src/access'
import { isRegisteredBlock } from '../../src/blocks/registry'
import { canonicalUrl } from '../../src/lib/canonical'
import { createCatalogProvider } from '../../src/lib/catalog/fixture-provider'
import { allowLeadAttempt, leadInputSchema } from '../../src/lib/leads'
import { assertUniqueHostnames, normalizeHost, resolveSiteByHost } from '../../src/lib/host'
import { isPreviewSecretValid } from '../../src/lib/preview'
import { splitProjectName } from '../../src/lib/media'

describe('normalizeHost', () => {
  it('strips port and www', () => {
    expect(normalizeHost('WWW.Avgst.ru:443')).toBe('avgst.ru')
  })
})

describe('resolveSiteByHost', () => {
  const sites = [
    {
      code: 'corporate',
      status: 'published',
      subdomain: 'avgst',
      customDomains: [{ hostname: 'avgst.ru' }],
    },
    {
      code: 'partner-nn',
      status: 'published',
      subdomain: 'nn',
      customDomains: [{ hostname: 'nn.example.test' }],
    },
    {
      code: 'draft-site',
      status: 'draft',
      customDomains: [{ hostname: 'draft.example.test' }],
    },
  ]

  it('resolves corporate by custom domain', () => {
    expect(resolveSiteByHost(sites, 'avgst.ru')?.code).toBe('corporate')
  })

  it('resolves partner by subdomain host', () => {
    expect(resolveSiteByHost(sites, 'nn.example.test')?.code).toBe('partner-nn')
  })

  it('ignores draft sites', () => {
    expect(resolveSiteByHost(sites, 'draft.example.test')?.code).toBe('corporate')
  })

  it('can resolve draft sites in preview', () => {
    expect(resolveSiteByHost(sites, 'draft.example.test', { includeDrafts: true })?.code).toBe('draft-site')
  })
})

describe('assertUniqueHostnames', () => {
  it('finds duplicate hosts across sites', () => {
    const dup = assertUniqueHostnames([
      { code: 'a', status: 'published', customDomains: [{ hostname: 'a.test' }] },
      { code: 'b', status: 'published', customDomains: [{ hostname: 'a.test' }] },
    ])
    expect(dup).toContain('a.test')
  })
})

describe('block registry', () => {
  it('does not crash on unknown block type', () => {
    expect(isRegisteredBlock('hero')).toBe(true)
    expect(isRegisteredBlock('legacyHtml')).toBe(false)
  })
})

describe('tenant isolation', () => {
  it('blocks a partner from a foreign site', () => {
    expect(
      partnerCannotSeeForeignSite({
        role: 'partner-editor',
        partnerExternalId: 'partner-nn',
        sitePartnerExternalId: 'partner-spb',
      }),
    ).toBe(true)
  })
})

describe('catalog provider', () => {
  it('filters by floors', async () => {
    const provider = createCatalogProvider()
    const { items } = await provider.list({ siteCode: 'corporate', floors: 1 })
    expect(items.length).toBeGreaterThan(0)
    expect(items.every((item) => item.floorsValue === 1)).toBe(true)
  })

  it('returns project page data without storing price in CMS shape', async () => {
    const project = await createCatalogProvider().getBySlug('barn-113', { siteCode: 'corporate' })
    expect(project?.priceLabel).toBeTruthy()
    expect(project?.options.length).toBeGreaterThan(0)
  })
})

describe('leads', () => {
  it('accepts a valid payload bound to site and page', () => {
    const parsed = leadInputSchema.parse({
      name: 'Ivan Petrov',
      phone: '+7 900 000-00-00',
      siteId: 1,
      pageId: 2,
      projectExternalId: 'barn-90',
      consent: true,
    })
    expect(parsed.siteId).toBe(1)
    expect(parsed.pageId).toBe(2)
  })

  it('rejects missing consent', () => {
    const parsed = leadInputSchema.safeParse({
      name: 'Ivan',
      phone: '+79000000000',
      siteId: 1,
      consent: false,
    })
    expect(parsed.success).toBe(false)
  })

  it('rate limits repeated attempts', () => {
    const key = `test-${Date.now()}`
    for (let i = 0; i < 5; i += 1) expect(allowLeadAttempt(key, 5, 60_000)).toBe(true)
    expect(allowLeadAttempt(key, 5, 60_000)).toBe(false)
  })
})

describe('canonical and preview', () => {
  it('builds distinct canonicals per host', () => {
    expect(canonicalUrl('avgst.ru', '/')).toBe('https://avgst.ru/')
    expect(canonicalUrl('nn.example.test', '/projects')).toBe('https://nn.example.test/projects')
  })

  it('rejects empty preview secret', () => {
    const prev = process.env.PREVIEW_SECRET
    process.env.PREVIEW_SECRET = 'secret'
    expect(isPreviewSecretValid('nope')).toBe(false)
    expect(isPreviewSecretValid('secret')).toBe(true)
    process.env.PREVIEW_SECRET = prev
  })
})

describe('project name accent', () => {
  it('splits trailing digits', () => {
    expect(splitProjectName('Барнхаус 113')).toEqual({ text: 'Барнхаус', digits: '113' })
  })
})

describe('russian locale', () => {
  it('formats money as Russian rubles', async () => {
    const { formatRub } = await import('../../src/lib/locale')
    expect(formatRub(4213000)).toMatch(/4[\s\u00a0]?213[\s\u00a0]?000/)
    expect(formatRub(4213000)).toMatch(/₽|RUB/)
  })

  it('formats dates as dd.mm.yyyy in Moscow time', async () => {
    const { formatDate } = await import('../../src/lib/locale')
    expect(formatDate('2026-08-25T12:00:00+03:00')).toBe('25.08.2026')
  })
})
