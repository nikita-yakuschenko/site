import 'server-only'
import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react'
import { headers } from 'next/headers'
import { readCMSContent } from '../lib/cms/content'
import { bindReactContent, findCMSContentRecord } from '../lib/cms/react-content'
import { CMSContentBlock } from './cms-content'

async function resolveServerContent(node: ReactNode): Promise<ReactNode> {
  if (Array.isArray(node)) return Promise.all(node.map(async (child, index) => {
    const next = await resolveServerContent(child)
    return isValidElement(next) && next.key == null ? cloneElement(next, { key: index }) : next
  }))
  if (!isValidElement(node)) return node
  const element = node as ReactElement<Record<string, unknown>>
  if (typeof element.type === 'function' && !('$$typeof' in element.type)) {
    const render = element.type as (props: Record<string, unknown>) => ReactNode | Promise<ReactNode>
    const resolved = await resolveServerContent(await render(element.props))
    return isValidElement(resolved) && element.key != null ? cloneElement(resolved, { key: element.key }) : resolved
  }
  if (!('children' in element.props) || element.props.cmsBlockKey) return node
  return cloneElement(element, { children: await resolveServerContent(element.props.children as ReactNode) })
}

export async function CMSStaticBlock({ cmsBlockKey, scope, children }: { cmsBlockKey: string; scope?: string; children: ReactNode }) {
  const records = await readCMSContent()
  const requestHeaders = await headers()
  const editing = requestHeaders.get('x-cms-editor') === '1'
  const record = findCMSContentRecord(records, cmsBlockKey, scope ?? requestHeaders.get('x-cms-page-route') ?? '/')
  const key = record?.key || cmsBlockKey
  const resolved = await resolveServerContent(children)
  const { content, fields } = bindReactContent(key, resolved, record?.parts, editing)
  const marked = isValidElement(content) && typeof content.type === 'string' ? cloneElement(content as ReactElement<Record<string, unknown>>, { 'data-cms-block': key, 'data-cms-content-root': '' }) : <div data-cms-block={key} data-cms-content-root="" style={{ display: 'contents' }}>{content}</div>
  // Public content is already bound on the server. Only the CMS editor needs
  // field metadata and a second, interactive binding pass for live drafts.
  return editing ? <CMSContentBlock cmsBlockKey={cmsBlockKey} initialFields={fields}>{marked}</CMSContentBlock> : marked
}
