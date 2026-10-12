import type { Access, FieldAccess, PayloadRequest } from 'payload'

export const roles = ['super-admin', 'admin', 'editor', 'viewer'] as const
export type StaffRole = typeof roles[number]

// Always fetch the current record: a JWT issued before blocking or demotion
// must not keep the old privileges. Local callers must also use overrideAccess:false.
export async function activeStaff(req: PayloadRequest) {
  if (req.user?.collection !== 'users') return null
  const user = await req.payload.findByID({ collection: 'users', id: req.user.id, depth: 0, overrideAccess: true })
  return user.isBlocked || !roles.includes(user.role) ? null : user
}

export const authenticated = async ({ req }: { req: PayloadRequest }): Promise<boolean> => Boolean(await activeStaff(req))
export const superAdmin: Access = async ({ req }) => (await activeStaff(req))?.role === 'super-admin'
export const privilegedField: FieldAccess = async ({ req }) => (await activeStaff(req))?.role === 'super-admin'
export const ownAccountOrSuper: Access = async ({ req }) => {
  const user = await activeStaff(req)
  if (!user) return false
  return user.role === 'super-admin' ? true : { id: { equals: user.id } }
}
export const contentWriter: Access = async ({ req }) => {
  const user = await activeStaff(req)
  return Boolean(user && ['super-admin', 'admin', 'editor'].includes(user.role))
}
export const contentManager: Access = async ({ req }) => {
  const user = await activeStaff(req)
  return Boolean(user && ['super-admin', 'admin'].includes(user.role))
}
