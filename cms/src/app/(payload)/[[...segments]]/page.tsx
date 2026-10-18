import config from '@payload-config'
import { generatePageMetadata, RootPage } from '@payloadcms/next/views'
import { importMap } from '../importMap'

type Args = { params: Promise<{ segments: string[] }>; searchParams: Promise<Record<string, string | string[]>> }
const prettyCollections = new Set(['blocks', 'forms', 'media', 'users'])

async function adminParams(params: Args['params']) {
  const resolved = await params
  const [first, ...rest] = resolved.segments ?? []
  if (first && prettyCollections.has(first)) return { segments: ['collections', first, ...rest] }
  return resolved
}

export const dynamic = 'force-dynamic'
export const generateMetadata = async ({ params, searchParams }: Args) => ({
  ...await generatePageMetadata({ config, params: Promise.resolve(await adminParams(params)), searchParams }),
  title: 'Панель управления | avgst.ru',
})
export default async function Page({ params, searchParams }: Args) {
  return RootPage({ config, params: Promise.resolve(await adminParams(params)), searchParams, importMap })
}
