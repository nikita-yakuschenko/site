'use client'
import { useRowLabel } from '@payloadcms/ui'
export function ConfigurationRowLabel() {
  const { data } = useRowLabel<{ name?: string; price?: number; key?: string }>()
  const name = data.name || ({ start: 'Стартовая', standard: 'Стандартная', project: 'Проектная', turnkey: 'Под ключ' } as Record<string, string>)[data.key || ''] || 'Комплектация'
  return <span className="flex w-full items-center justify-between gap-3"><span>{name}</span>{typeof data.price === 'number' && <span className="text-muted-foreground tabular-nums">{data.price.toLocaleString('ru-RU')} ₽</span>}</span>
}
