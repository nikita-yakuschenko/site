import type { Access, FieldAccess, PayloadRequest, Where } from 'payload'

const HQ_ROLES = new Set(['super-admin', 'hq-admin', 'hq-editor'])
const PARTNER_ROLES = new Set(['partner-owner', 'partner-editor'])

type AuthedUser = {
  role?: string | null
  partnerExternalId?: string | null
}

function authed(user: unknown): AuthedUser | null {
  return (user as AuthedUser | null) ?? null
}

export function isHqRole(role: string | null | undefined): boolean {
  return Boolean(role && HQ_ROLES.has(role))
}

export function isPartnerRole(role: string | null | undefined): boolean {
  return Boolean(role && PARTNER_ROLES.has(role))
}

export const anyone: Access = () => true

export const authenticated: Access = ({ req }) => Boolean(req.user)

export const hqOnly: Access = ({ req }) => isHqRole(authed(req.user)?.role)

export const publishedOrAuthenticated: Access = ({ req }) => {
  if (req.user) return true
  const where: Where = { _status: { equals: 'published' } }
  return where
}

export const isLoggedIn = ({ req }: { req: PayloadRequest }): boolean => Boolean(req.user)

async function siteIdsForPartner(req: PayloadRequest, partnerExternalId: string): Promise<number[]> {
  const sites = await req.payload.find({
    collection: 'sites',
    where: { partnerExternalId: { equals: partnerExternalId } },
    limit: 200,
    depth: 0,
    overrideAccess: true,
  })
  return sites.docs.map((doc) => Number(doc.id))
}

function none(): Where {
  const where: Where = { id: { equals: -1 } }
  return where
}

export const siteRead: Access = ({ req }) => {
  const user = authed(req.user)
  if (!user) {
    const where: Where = { status: { equals: 'published' } }
    return where
  }
  if (isHqRole(user.role)) return true
  if (user.partnerExternalId) {
    const where: Where = { partnerExternalId: { equals: user.partnerExternalId } }
    return where
  }
  return false
}

export const siteWrite: Access = ({ req }) => {
  const user = authed(req.user)
  if (!user) return false
  if (isHqRole(user.role)) return true
  if (isPartnerRole(user.role) && user.partnerExternalId) {
    const where: Where = { partnerExternalId: { equals: user.partnerExternalId } }
    return where
  }
  return false
}

export const pageRead: Access = async ({ req }) => {
  const user = authed(req.user)
  if (!user) {
    const where: Where = { _status: { equals: 'published' } }
    return where
  }
  if (isHqRole(user.role)) return true
  if (isPartnerRole(user.role) && user.partnerExternalId) {
    const ids = await siteIdsForPartner(req, user.partnerExternalId)
    if (!ids.length) return none()
    const where: Where = { site: { in: ids } }
    return where
  }
  return false
}

export const pageWrite: Access = async ({ req }) => {
  const user = authed(req.user)
  if (!user) return false
  if (isHqRole(user.role)) return true
  if (isPartnerRole(user.role) && user.partnerExternalId) {
    const ids = await siteIdsForPartner(req, user.partnerExternalId)
    if (!ids.length) return none()
    const where: Where = { site: { in: ids } }
    return where
  }
  return false
}

export const leadRead: Access = async ({ req }) => {
  const user = authed(req.user)
  if (!user) return false
  if (isHqRole(user.role)) return true
  if (isPartnerRole(user.role) && user.partnerExternalId) {
    const ids = await siteIdsForPartner(req, user.partnerExternalId)
    if (!ids.length) return none()
    const where: Where = { site: { in: ids } }
    return where
  }
  return false
}

export const fieldHqOnly: FieldAccess = ({ req }) => isHqRole(authed(req.user)?.role)

export const usersCreate: Access = ({ req }) => {
  if (!req.user) return true
  return isHqRole(authed(req.user)?.role)
}

export function partnerCannotSeeForeignSite(args: {
  role: string
  partnerExternalId: string
  sitePartnerExternalId: string
}): boolean {
  if (isHqRole(args.role)) return false
  return args.sitePartnerExternalId !== args.partnerExternalId
}
