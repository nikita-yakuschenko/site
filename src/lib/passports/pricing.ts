import { configurationKeys, mortgageAllowed, type ConfigurationKey } from '../catalog/configuration-rules'
import { tiersForRegion, type PricedTier } from '../catalog/tiers'
import type { CatalogTechnology } from '../catalog/types'
import { formatRub } from '../locale'
import { calculateMortgage, monthlyPaymentForProject } from '../mortgage/calc'
import { getMortgageProgram } from '../mortgage/programs'
import type { RegionCode } from '../regions'
import { PassportDataError, type PassportPricing, type PassportTier } from './types'

export function passportPricing(tiers: readonly PricedTier[], technology: CatalogTechnology, region: RegionCode): PassportPricing {
  if (region !== 'nn' && region !== 'msk') throw new PassportDataError('region', 'Unknown passport region')
  const keys = configurationKeys(technology === 'modular')
  if (tiers.length !== 3 || keys.some(key => tiers.filter(tier => tier.id === key).length !== 1)) {
    throw new PassportDataError('tiers', 'Exactly three technology-specific configurations are required')
  }
  const regional = tiersForRegion(tiers, region)
  const normalized = keys.map((key: ConfigurationKey): PassportTier => {
    const tier = regional.find(item => item.id === key)!
    if (!tier.name?.trim() || !Number.isSafeInteger(tier.price) || tier.price <= 0) {
      throw new PassportDataError('price', `Missing ordinary ${region} price or name for ${key}`)
    }
    const displayedPrice = tier.price
    /* Hero и CTA считают семейную 3,9% от той же базовой цены комплектации. */
    const program = getMortgageProgram('family39')
    const mortgage = mortgageAllowed(key) && tier.mortgage !== false ? calculateMortgage({
      programId: program.id, region, propertyPrice: tier.price,
      downPayment: tier.price * program.minDownPaymentPercent, termYears: program.maxTermYears,
    }) : null
    const payment = mortgage && !mortgage.errors.length && !mortgage.cappedByMaxLoan && mortgage.monthlyPayment > 0
      ? monthlyPaymentForProject({ propertyPrice: tier.price, programId: program.id, region }) : null
    return { mortgagePaymentLabel: payment === null ? null : `${formatRub(payment)}/мес.`, key, name: tier.name, priceLabel: formatRub(displayedPrice),
      special: false, regularPrice: tier.price, specialPrice: null, displayedPrice }
  }) as PassportPricing['tiers']
  const standardMortgageBasePrice = normalized.find(tier => tier.key === 'standard')!.regularPrice
  const program = getMortgageProgram('family39')
  const result = calculateMortgage({ programId: program.id, region, propertyPrice: standardMortgageBasePrice,
    downPayment: standardMortgageBasePrice * program.minDownPaymentPercent, termYears: program.maxTermYears })
  const monthlyMortgagePayment = result.errors.length || result.cappedByMaxLoan || !Number.isFinite(result.monthlyPayment) || result.monthlyPayment <= 0 ? null : monthlyPaymentForProject({ propertyPrice: standardMortgageBasePrice, programId: program.id, region })
  return { tiers: normalized, standardMortgageBasePrice, monthlyMortgagePayment,
    mortgagePaymentLabel: monthlyMortgagePayment === null ? null : `${formatRub(monthlyMortgagePayment)}/мес.`,
    mortgageNote: monthlyMortgagePayment === null ? 'Ипотечный платёж не может быть корректно рассчитан.' :
      `${program.label}. Первоначальный взнос ${program.minDownPaymentPercent * 100}%, срок ${program.maxTermYears} лет. Ставка ${(program.rate * 100).toFixed(1).replace('.', ',')}% на весь срок. Расчёт от обычной стоимости стандартной комплектации. Условия предоставления определяет банк.` }
}

export const resolvePassportPricing = passportPricing
