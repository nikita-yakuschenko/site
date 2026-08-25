import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'
import { revalidatePath } from 'next/cache'

function revalidateSafe(path: string): void {
  try {
    revalidatePath(path)
    revalidatePath('/sitemap.xml')
    revalidatePath('/robots.txt')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('static generation store missing')) return
    throw error
  }
}

export const revalidatePage: CollectionAfterChangeHook = ({
  doc,
  previousDoc,
  req: { context, payload },
}) => {
  if (context.disableRevalidate) return doc
  const path = String(doc.fullPath || '/')
  if (doc._status === 'published') {
    payload.logger.info(`Revalidating page ${path}`)
    revalidateSafe(path)
  }
  if (previousDoc?._status === 'published' && doc._status !== 'published') {
    const oldPath = String(previousDoc.fullPath || path)
    payload.logger.info(`Revalidating unpublished page ${oldPath}`)
    revalidateSafe(oldPath)
  }
  return doc
}

export const revalidatePageDelete: CollectionAfterDeleteHook = ({ doc, req: { context } }) => {
  if (context.disableRevalidate) return doc
  revalidateSafe(String(doc?.fullPath || '/'))
  return doc
}
