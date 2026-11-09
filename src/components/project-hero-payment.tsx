'use client'
import { useRegionCode } from './region-bootstrap'
import { tiersForRegion, type PricedTier } from '../lib/catalog/tiers'
import { getMortgageProgram, monthlyPaymentForProject } from '../lib/mortgage'
import { formatRub } from '../lib/locale'
import { copy } from '../lib/copy'
import { LeadDialogButton } from './lead-dialog'

export function ProjectHeroPayment({ tiers, projectName }: { tiers: PricedTier[]; projectName?: string }) {
  const region = useRegionCode()
  const prices = tiersForRegion(tiers, region).filter(tier => tier.mortgage && tier.price > 0).map(tier => tier.price)
  const payment = prices.length ? monthlyPaymentForProject({ propertyPrice: Math.min(...prices), region, combinedMarketRateOverride: getMortgageProgram('market').rate }) : null
  const amount = payment ? `${formatRub(payment)}${copy.perMonth}` : 'Стоимость уточняется'
  return <div className="project-hero__aside">
    <div className="project-hero__pay-copy">
      <p className="project-hero__pay-label">{copy.paymentFrom}</p>
      <strong className="project-hero__pay">{amount}</strong>
    </div>
    <LeadDialogButton
      className="btn btn-yellow project-hero__quote"
      label="Получить расчёт"
      heading="Получить расчёт"
      body="Оставьте контакты - подготовим расчёт по этому проекту и перезвоним."
      submitLabel="Получить расчёт"
      formId="project-hero-quote"
      meta={{ ...(projectName ? { project: projectName } : {}), ...(payment ? { payment: amount } : {}) }}
    />
  </div>
}
