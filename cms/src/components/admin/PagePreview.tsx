'use client'
import { useDocumentInfo } from '@payloadcms/ui'
import { useEffect, useRef, useState } from 'react'
import { IconExternalLink, IconRefresh, IconDeviceDesktop, IconDeviceMobile, IconDeviceTablet, IconMaximize } from '@tabler/icons-react'
import { Button } from '../ui/button'
const devices = [
  { key: 'desktop', label: 'Десктоп', width: 1920, height: 1080, icon: IconDeviceDesktop },
  { key: 'tablet-landscape', label: 'Планшет горизонтально', width: 1180, height: 820, icon: IconDeviceTablet },
  { key: 'tablet-portrait', label: 'Планшет вертикально', width: 820, height: 1180, icon: IconDeviceTablet },
  { key: 'mobile', label: 'Телефон', width: 390, height: 844, icon: IconDeviceMobile },
] as const
export function PagePreview({ siteUrl, project = false }: { siteUrl: string; project?: boolean }) {
  const { data } = useDocumentInfo()
  const [deviceKey, setDeviceKey] = useState<string>('desktop')
  const [revision, setRevision] = useState(0)
  const [fit, setFit] = useState(true)
  const [available, setAvailable] = useState({ width: 0, height: 0 })
  const stage = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLElement>(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const [selected, setSelected] = useState<{ path: string; key: string; title: string } | null>(null)
  const [missing, setMissing] = useState(false)
  const currentOrder = useRef<string[] | null>(null)
  const origin = new URL(siteUrl).origin
  useEffect(() => {
    const receive = (event: Event) => {
      const order = (event as CustomEvent<string[]>).detail
      currentOrder.current = order
      frame.current?.contentWindow?.postMessage({ type: 'avgst:preview-order', order }, origin)
    }
    window.addEventListener('avgst:preview-order', receive)
    return () => window.removeEventListener('avgst:preview-order', receive)
  }, [origin])
  useEffect(() => {
    const receive = (event: Event) => {
      const detail = (event as CustomEvent).detail
      setSelected(current => detail.closed ? current?.path === detail.path ? null : current : detail)
    }
    window.addEventListener('avgst:preview-selection', receive)
    return () => window.removeEventListener('avgst:preview-selection', receive)
  }, [])
  useEffect(() => {
    frame.current?.contentWindow?.postMessage({ type: 'avgst:preview-block', key: selected?.key ?? null }, origin)
    const receive = (event: MessageEvent) => {
      if (event.source === frame.current?.contentWindow && event.origin === origin && event.data?.type === 'avgst:preview-ready') {
        frame.current?.contentWindow?.postMessage({ type: 'avgst:preview-block', key: selected?.key ?? null }, origin)
        if (currentOrder.current) frame.current?.contentWindow?.postMessage({ type: 'avgst:preview-order', order: currentOrder.current }, origin)
      }
      if (event.source === frame.current?.contentWindow && event.origin === origin && event.data?.type === 'avgst:preview-block-status' && event.data.key === (selected?.key ?? null)) setMissing(!event.data.found)
    }
    window.addEventListener('message', receive)
    return () => window.removeEventListener('message', receive)
  }, [selected, origin])
  const route = project ? (typeof data?.slug === 'string' ? `/catalog/${data.slug}` : null) : typeof data?.route === 'string' ? data.route : null
  const validRoute = Boolean(route && !route.includes('['))
  useEffect(() => {
    const element = stage.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setAvailable({ width: entry.contentRect.width, height: entry.contentRect.height }))
    observer.observe(element)
    return () => observer.disconnect()
  }, [validRoute])
  if (!validRoute) return <p className="text-sm text-muted-foreground">Для превью нужен адрес конкретной страницы сайта.</p>
  const device = devices.find(item => item.key === deviceKey) ?? devices[0]
  const scale = fit ? Math.min(1, available.width / device.width, available.height / device.height) : 1
  const url = `${siteUrl}${route}`
  const frameURL = `${url}${url.includes('?') ? '&' : '?'}cmsPreview=1`
  return <section ref={panel} className="shadcn-surface page-preview" aria-label="Превью страницы">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
      <div><h2 className="text-sm font-medium">{selected ? selected.title : 'Превью страницы'}</h2><p className="mt-1 text-xs text-muted-foreground">{selected ? 'Блок отдельно' : 'Текущая версия сайта'}</p></div>
      <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Устройство">
        {devices.map(item => <Button key={item.key} type="button" size="icon" variant={item.key === device.key ? 'secondary' : 'ghost'} title={item.label} aria-label={item.label} aria-pressed={item.key === device.key} onClick={() => setDeviceKey(item.key)}><item.icon className={`size-4 ${item.key === 'tablet-landscape' ? 'rotate-90' : ''}`} /></Button>)}
        <Button type="button" size="icon" variant="ghost" title="Обновить превью" aria-label="Обновить превью" onClick={() => setRevision(value => value + 1)}><IconRefresh className="size-4" /></Button>
        <Button type="button" size="icon" variant="ghost" title="Развернуть превью" aria-label="Развернуть превью" onClick={() => { if (document.fullscreenElement) void document.exitFullscreen(); else void panel.current?.requestFullscreen() }}><IconMaximize className="size-4" /></Button>
        <Button size="icon" variant="ghost" asChild><a href={url} target="_blank" rel="noreferrer" title="Открыть страницу сайта" aria-label="Открыть страницу сайта"><IconExternalLink className="size-4" /></a></Button>
      </div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2 text-xs">
      <span className="text-muted-foreground">{device.label} · {device.width} × {device.height} px</span>
      {selected && <Button type="button" size="sm" variant="ghost" onClick={() => setSelected(null)}>Вся страница</Button>}
      <Button type="button" size="sm" variant="ghost" aria-label="Переключить масштаб превью" onClick={() => setFit(value => !value)}>{fit ? `Вписать · ${Math.round(scale * 100)}%` : '100%'}</Button>
    </div>
    <div ref={stage} className="page-preview__stage">
      {available.width > 0 && <div className="page-preview__screen" style={{ width: device.width * scale, height: device.height * scale }}>
        {missing && selected && <p className="absolute inset-0 z-10 flex items-center justify-center bg-card p-6 text-sm">Этот компонент ещё не подключён к изолированному превью.</p>}
        <iframe ref={frame} onLoad={() => frame.current?.contentWindow?.postMessage({ type: 'avgst:preview-block', key: selected?.key ?? null }, origin)} key={`${url}:${revision}`} title={`Превью ${route}: ${device.label}`} src={frameURL} style={{ position: 'absolute', top: 0, left: 0, width: device.width, height: device.height, transform: `scale(${scale})`, transformOrigin: 'top left', maxWidth: 'none', border: 0, display: 'block', background: '#fff' }} />
      </div>}
    </div>
  </section>
}
