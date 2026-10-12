import config from '@payload-config'
import { generatePageMetadata, RootPage } from '@payloadcms/next/views'
import { importMap } from '../importMap'

type Args = { params: Promise<{ segments: string[] }>; searchParams: Promise<Record<string, string | string[]>> }
export const dynamic = 'force-dynamic'
export const generateMetadata = async ({ params, searchParams }: Args) => ({
  ...await generatePageMetadata({ config, params, searchParams }),
  title: 'Панель управления | avgst.ru',
})
export default function Page({ params, searchParams }: Args) {
  return RootPage({ config, params, searchParams, importMap })
}
