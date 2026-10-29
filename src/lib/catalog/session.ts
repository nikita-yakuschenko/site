export const CATALOG_SESSION_COOKIE = 'avgst_catalog_session'
export const CATALOG_SESSION_HEADER = 'x-avgst-catalog-session'

/** A session-only functional token; no visitor identity or persistent storage. */
export function catalogSessionSeed(value?: string, create = () => crypto.randomUUID()): string {
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ? value.toLowerCase() : create()
}
