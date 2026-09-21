import type { RegionCode } from "../regions";
import type { MortgageProgram, MortgageProgramId } from "./programs";
import {
  getMortgageProgram,
  maxLoanAmount,
  subsidizedLimit,
} from "./programs";

export type LoanPart = {
  kind: "subsidized" | "market";
  principal: number;
  annualRate: number;
  monthlyPayment: number;
};

export type MortgageCalcResult = {
  propertyPrice: number;
  downPayment: number;
  downPaymentPercent: number;
  loanAmount: number;
  termMonths: number;
  monthlyPayment: number;
  totalPayment: number;
  overpayment: number;
  /** Ориентировочный доход семьи (~40% платёж / доход). */
  indicativeIncome: number;
  isCombined: boolean;
  parts: LoanPart[];
  cappedByMaxLoan: boolean;
  errors: string[];
};

/** Аннуитетный платёж. Внутренняя точность без округления. */
export function annuityPayment(
  principal: number,
  annualRate: number,
  termMonths: number,
): number {
  if (principal <= 0 || termMonths <= 0) return 0;
  if (annualRate <= 0) return principal / termMonths;
  const r = annualRate / 12;
  const factor = (1 + r) ** termMonths;
  return (principal * r * factor) / (factor - 1);
}

/** Максимальный кредит при заданном аннуитетном платеже. */
export function maxPrincipalFromPayment(
  monthlyPayment: number,
  annualRate: number,
  termMonths: number,
): number {
  if (monthlyPayment <= 0 || termMonths <= 0) return 0;
  if (annualRate <= 0) return monthlyPayment * termMonths;
  const r = annualRate / 12;
  const factor = (1 + r) ** termMonths;
  return (monthlyPayment * (factor - 1)) / (r * factor);
}

function buildParts(
  loanAmount: number,
  program: MortgageProgram,
  region: RegionCode,
  termMonths: number,
  /* Ставка, заданная вручную. Нужна там, где государственной ставки нет
     и её называет банк: человек приходит с конкретным предложением на
     руках и хочет посчитать по нему, а не по средней цифре с витрины.
     У программ с льготной частью не применяется — там ставка не его. */
  rateOverride?: number,
): { parts: LoanPart[]; isCombined: boolean } {
  const limit = subsidizedLimit(program, region);
  const useSplit =
    program.allowCombined &&
    limit != null &&
    loanAmount > limit;

  if (!useSplit) {
    const rate = rateOverride ?? program.rate;
    return {
      isCombined: false,
      parts: [
        {
          kind: "subsidized",
          principal: loanAmount,
          annualRate: rate,
          monthlyPayment: annuityPayment(loanAmount, rate, termMonths),
        },
      ],
    };
  }

  const subsidizedPrincipal = limit!;
  const marketPrincipal = loanAmount - subsidizedPrincipal;
  const subPay = annuityPayment(
    subsidizedPrincipal,
    program.rate,
    termMonths,
  );
  const mktPay = annuityPayment(
    marketPrincipal,
    program.marketRate,
    termMonths,
  );
  return {
    isCombined: true,
    parts: [
      {
        kind: "subsidized",
        principal: subsidizedPrincipal,
        annualRate: program.rate,
        monthlyPayment: subPay,
      },
      {
        kind: "market",
        principal: marketPrincipal,
        annualRate: program.marketRate,
        monthlyPayment: mktPay,
      },
    ],
  };
}

export type CalculateMortgageInput = {
  programId: MortgageProgramId;
  region: RegionCode;
  propertyPrice: number;
  downPayment: number;
  termYears: number;
  /** Годовая ставка долей (0.163 = 16,3%), если её задал человек. */
  rateOverride?: number;
};

export function calculateMortgage(
  input: CalculateMortgageInput,
): MortgageCalcResult {
  const program = getMortgageProgram(input.programId);
  const errors: string[] = [];
  const termYears = clamp(
    Math.round(input.termYears),
    program.minTermYears,
    program.maxTermYears,
  );
  const termMonths = termYears * 12;

  const propertyPrice = Math.max(0, input.propertyPrice);
  let downPayment = Math.max(0, input.downPayment);

  if (propertyPrice <= 0) errors.push("propertyPrice");
  const minDown = propertyPrice * program.minDownPaymentPercent;
  if (downPayment < minDown - 0.5) errors.push("downPayment");
  if (downPayment >= propertyPrice && propertyPrice > 0) {
    errors.push("downPaymentGePrice");
    downPayment = Math.min(downPayment, propertyPrice - 1);
  }

  let loanAmount = Math.max(0, propertyPrice - downPayment);
  const maxLoan = maxLoanAmount(program, input.region);
  let cappedByMaxLoan = false;
  if (loanAmount > maxLoan) {
    loanAmount = maxLoan;
    cappedByMaxLoan = true;
    errors.push("maxLoan");
  }

  const { parts, isCombined } = buildParts(
    loanAmount,
    program,
    input.region,
    termMonths,
    input.rateOverride,
  );
  const monthlyPayment = parts.reduce((s, p) => s + p.monthlyPayment, 0);
  const totalPayment = monthlyPayment * termMonths;
  const overpayment = Math.max(0, totalPayment - loanAmount);

  return {
    propertyPrice,
    downPayment,
    downPaymentPercent:
      propertyPrice > 0 ? downPayment / propertyPrice : 0,
    loanAmount,
    termMonths,
    monthlyPayment,
    totalPayment,
    overpayment,
    indicativeIncome: monthlyPayment > 0 ? monthlyPayment / 0.4 : 0,
    isCombined,
    parts,
    cappedByMaxLoan,
    errors,
  };
}

/**
 * Обратный расчёт: комфортный платёж → макс. кредит → макс. стоимость дома.
 * Учитывает комбинированную ставку (бинарный поиск по сумме кредита).
 */
export function calculateMaxPropertyPrice(input: {
  programId: MortgageProgramId;
  region: RegionCode;
  monthlyPayment: number;
  downPayment: number;
  termYears: number;
  rateOverride?: number;
}): {
  maxLoan: number;
  maxPropertyPrice: number;
  result: MortgageCalcResult;
} {
  const program = getMortgageProgram(input.programId);
  const termYears = clamp(
    Math.round(input.termYears),
    program.minTermYears,
    program.maxTermYears,
  );
  const termMonths = termYears * 12;
  const downPayment = Math.max(0, input.downPayment);
  const payment = Math.max(0, input.monthlyPayment);
  const hardCap = maxLoanAmount(program, input.region);

  let lo = 0;
  let hi = hardCap;
  for (let i = 0; i < 48; i += 1) {
    const mid = (lo + hi) / 2;
    const pay = paymentForLoan(
      mid,
      program,
      input.region,
      termMonths,
      input.rateOverride,
    );
    if (pay <= payment) lo = mid;
    else hi = mid;
  }

  const maxLoan = Math.min(lo, hardCap);
  // ПВ ≥ min% от цены → price = down / min%  и  price = loan + down
  // Итог: price = loan + down, но down ≥ price * min% ⇒ loan ≤ price*(1-min%)
  // ⇒ price ≤ loan / (1-min%)  и  price = loan + down ⇒ берём min согласованных.
  const fromLoanAndDown = maxLoan + downPayment;
  const fromMinDownShare =
    program.minDownPaymentPercent > 0 &&
    program.minDownPaymentPercent < 1
      ? maxLoan / (1 - program.minDownPaymentPercent)
      : fromLoanAndDown;
  // Если заданный ПВ больше минимального — цена = кредит + ПВ.
  // Если ПВ мал относительно кредита — цена ограничена долей ПВ.
  let maxPropertyPrice = fromLoanAndDown;
  if (downPayment < fromLoanAndDown * program.minDownPaymentPercent) {
    maxPropertyPrice = fromMinDownShare;
  }

  const result = calculateMortgage({
    programId: input.programId,
    region: input.region,
    rateOverride: input.rateOverride,
    propertyPrice: maxPropertyPrice,
    downPayment: Math.min(
      downPayment,
      maxPropertyPrice * (1 - 1e-9),
    ),
    termYears,
  });

  return { maxLoan, maxPropertyPrice, result };
}

function paymentForLoan(
  loanAmount: number,
  program: MortgageProgram,
  region: RegionCode,
  termMonths: number,
  rateOverride?: number,
): number {
  const { parts } = buildParts(
    loanAmount,
    program,
    region,
    termMonths,
    rateOverride,
  );
  return parts.reduce((s, p) => s + p.monthlyPayment, 0);
}

/**
 * Ежемесячный платёж для CTA на карточке проекта.
 * Возвращает null, если цену/параметры нельзя посчитать.
 */
export function monthlyPaymentForProject(input: {
  propertyPrice: number;
  programId?: MortgageProgramId;
  region: RegionCode;
  downPaymentPercent?: number;
  termYears?: number;
}): number | null {
  if (!(input.propertyPrice > 0)) return null;
  const programId = input.programId ?? "family";
  const program = getMortgageProgram(programId);
  const downPct = input.downPaymentPercent ?? program.minDownPaymentPercent;
  const termYears = input.termYears ?? program.maxTermYears;
  const downPayment = input.propertyPrice * downPct;
  const result = calculateMortgage({
    programId,
    region: input.region,
    propertyPrice: input.propertyPrice,
    downPayment,
    termYears,
  });
  if (!Number.isFinite(result.monthlyPayment) || result.monthlyPayment <= 0) {
    return null;
  }
  return result.monthlyPayment;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
