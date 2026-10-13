'use client'
import { useSyncExternalStore } from 'react'
import { readRegionCode, readServerRegionCode, subscribeRegion } from '../lib/regions'
import { tiersForRegion, type PricedTier } from '../lib/catalog/tiers'
import { getMortgageProgram, monthlyPaymentForProject } from '../lib/mortgage'
import { formatRub } from '../lib/locale'
import { copy } from '../lib/copy'

export function ProjectHeroPayment({ tiers }: { tiers: PricedTier[] }) {
  const region = useSyncExternalStore(subscribeRegion, readRegionCode, readServerRegionCode)
  const prices = tiersForRegion(tiers, region).filter(tier => tier.mortgage && tier.price > 0).map(tier => tier.price)
  const payment = prices.length ? monthlyPaymentForProject({ propertyPrice: Math.min(...prices), region, combinedMarketRateOverride: getMortgageProgram('market').rate }) : null
  return <div className="project-hero__aside"><p className="project-hero__pay-label">{copy.paymentFrom}</p><strong className="project-hero__pay">{payment ? `${formatRub(payment)}${copy.perMonth}` : 'Стоимость уточняется'}</strong></div>
}
