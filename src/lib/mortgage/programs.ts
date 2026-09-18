import type { RegionCode } from "../regions";

/** Идентификаторы программ — расширение без переписывания UI. */
export type MortgageProgramId = "family" | "it" | "rural" | "market";

export type MortgageProgram = {
  id: MortgageProgramId;
  label: string;
  /** Годовая ставка льготной части, доля (0.06 = 6%). */
  rate: number;
  /** Минимальный ПВ, доля от стоимости. */
  minDownPaymentPercent: number;
  minTermYears: number;
  maxTermYears: number;
  /** Льготный лимит по региону (₽). null — без льготного потолка. */
  subsidizedLimitByRegion: Record<RegionCode, number> | null;
  /** Максимальная сумма кредита (весь кредит) по региону. */
  maxLoanByRegion: Record<RegionCode, number>;
  /** Ставка сверх льготного лимита. */
  marketRate: number;
  allowCombined: boolean;
};

/**
 * Числовая модель программ.
 * Маркетинговые тексты остаются в copy.familyMortgage;
 * ставки/лимиты для формул — здесь (единый источник для калькулятора и CTA проектов).
 */
export const MORTGAGE_PROGRAMS: readonly MortgageProgram[] = [
  {
    id: "family",
    label: "Семейная",
    rate: 0.06,
    minDownPaymentPercent: 0.2,
    minTermYears: 1,
    maxTermYears: 30,
    subsidizedLimitByRegion: { nn: 6_000_000, msk: 12_000_000 },
    maxLoanByRegion: { nn: 15_000_000, msk: 30_000_000 },
    marketRate: 0.185,
    allowCombined: true,
  },
  {
    id: "it",
    label: "IT",
    rate: 0.06,
    minDownPaymentPercent: 0.2,
    minTermYears: 1,
    maxTermYears: 30,
    /* Лимит один на всю страну: в отличие от семейной, где столица и
       область считаются отдельно, у IT льготная часть 9 млн и в Нижнем, и
       в Подмосковье. Здесь стояли семейные цифры — 6 и 12 млн. */
    subsidizedLimitByRegion: { nn: 9_000_000, msk: 9_000_000 },
    maxLoanByRegion: { nn: 18_000_000, msk: 18_000_000 },
    marketRate: 0.185,
    allowCombined: true,
  },
  {
    id: "rural",
    label: "Сельская",
    rate: 0.03,
    minDownPaymentPercent: 0.2,
    minTermYears: 1,
    /* Двадцать пять лет, а не тридцать: у сельской свой потолок срока, и
       общий тридцатилетний давал платёж, которого по программе не бывает. */
    maxTermYears: 25,
    subsidizedLimitByRegion: { nn: 6_000_000, msk: 6_000_000 },
    maxLoanByRegion: { nn: 6_000_000, msk: 6_000_000 },
    marketRate: 0.185,
    allowCombined: false,
  },
  {
    id: "market",
    label: "Рыночная",
    rate: 0.16,
    minDownPaymentPercent: 0.2,
    minTermYears: 1,
    maxTermYears: 30,
    subsidizedLimitByRegion: null,
    maxLoanByRegion: { nn: 30_000_000, msk: 50_000_000 },
    marketRate: 0.16,
    allowCombined: false,
  },
] as const;

export function getMortgageProgram(
  id: MortgageProgramId,
): MortgageProgram {
  const found = MORTGAGE_PROGRAMS.find((p) => p.id === id);
  if (!found) return MORTGAGE_PROGRAMS[0]!;
  return found;
}

export function subsidizedLimit(
  program: MortgageProgram,
  region: RegionCode,
): number | null {
  if (!program.subsidizedLimitByRegion) return null;
  return program.subsidizedLimitByRegion[region];
}

export function maxLoanAmount(
  program: MortgageProgram,
  region: RegionCode,
): number {
  return program.maxLoanByRegion[region];
}
