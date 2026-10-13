'use client'
import { useFormFields } from '@payloadcms/ui'
export function ProjectMortgageSummary() {
  const fields = useFormFields(([fields]) => fields)
  const tiers = Object.entries(fields).filter(([path]) => /^configurations\.\d+\.key$/.test(path)).map(([path, field]) => {
    const prefix = path.slice(0, -3)
    return { key: field.value, name: fields[`${prefix}name`]?.value as string, price: fields[`${prefix}price`]?.value as number, mortgage: fields[`${prefix}mortgage`]?.value }
  })
  return <dl className="shadcn-surface grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm"><dt className="text-muted-foreground">Стоимость для расчёта</dt><dd>Региональный прайс — для региона, выбранного на сайте</dd><dt className="text-muted-foreground">Доступны в ипотеку</dt><dd>{tiers.filter(tier => tier.key !== 'start').map(tier => tier.name).join(', ') || 'Нет доступных комплектаций'}</dd></dl>
}
