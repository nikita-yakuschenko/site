import { test, expect } from "@playwright/test";
import { annuityPayment, calculateMortgage, calculateMaxPropertyPrice, remainingPrincipal } from "../src/lib/mortgage/calc";
import { getMortgageProgram, subsidizedLimit } from "../src/lib/mortgage/programs";

test("family limits, initial payments and balances across regions and terms", () => {
  for (const region of ["nn", "msk"] as const) {
    for (const childrenCount of [1, 2, 3]) {
      const limit = (region === "nn" ? [6, 8, 10] : [12, 15, 18])[childrenCount - 1]! * 1e6;
      expect(subsidizedLimit(getMortgageProgram("family"), region, childrenCount)).toBe(limit);
      for (const termYears of [10, 15, 20, 25, 30]) {
        for (const downShare of [.2, .3, .5]) {
          for (const loan of [limit - 1e6, limit, limit + 1e6]) {
            const propertyPrice = loan / (1 - downShare);
            const result = calculateMortgage({ programId: "family", region, childrenCount, termYears, propertyPrice, downPayment: propertyPrice * downShare });
            expect(result.errors).toEqual([]);
            expect(result.parts[0]!.principal).toBeCloseTo(Math.min(loan, limit), 5);
            expect(result.parts[0]!.annualRate).toBe(.06);
            expect(result.isCombined).toBe(loan > limit);
            if (loan > limit) expect(result.parts[1]!.annualRate).toBe(.16);
            const expectedPayment = annuityPayment(Math.min(loan, limit), .06, termYears * 12) + annuityPayment(Math.max(0, loan - limit), .16, termYears * 12);
            expect(result.monthlyPayment).toBeCloseTo(expectedPayment, 6);
            let balance = loan;
            // Independent monthly amortization of each part checks the 180-month balance.
            balance = result.parts.reduce((sum, part) => {
              let owed = part.principal;
              for (let month = 0; month < Math.min(180, termYears * 12); month++) owed = owed * (1 + part.annualRate / 12) - part.monthlyPayment;
              return sum + Math.max(0, owed);
            }, 0);
            expect(result.remainingAfterSubsidy!).toBeCloseTo(balance, 4);
            expect(remainingPrincipal(loan, .06, termYears * 12, termYears * 12)).toBe(0);
            if (termYears > 15) { expect(result.totalPayment).toBeNull(); expect(result.overpayment).toBeNull(); }
            else { expect(result.remainingAfterSubsidy).toBe(0); expect(result.totalPayment).toBeCloseTo(expectedPayment * termYears * 12, 4); }
          }
        }
      }
    }
  }
});

test("family budget respects down payment, total cap and market split", () => {
  for (const region of ["nn", "msk"] as const) {
    for (const childrenCount of [1, 2, 3]) {
      const pack = calculateMaxPropertyPrice({ programId: "family", region, childrenCount, monthlyPayment: 250000, downPayment: 500000, termYears: 30 });
      expect(pack.maxPropertyPrice).toBeCloseTo(2500000, 4);
      expect(pack.result.downPaymentPercent).toBeGreaterThanOrEqual(.2);
      expect(pack.result.monthlyPayment).toBeLessThanOrEqual(250000);
      expect(pack.maxLoan).toBe(pack.result.loanAmount);
    }
    const capped = calculateMortgage({ programId: "family", region, childrenCount: 1, propertyPrice: 50e6, downPayment: 10e6, termYears: 30 });
    expect(capped.loanAmount).toBe(region === "nn" ? 15e6 : 30e6);
    expect(capped.errors).toContain("maxLoan");
    expect(capped.parts[1]!.annualRate).toBeGreaterThan(.06);
  }
});

test("other programs ignore children and keep fixed rates and terms", () => {
  for (const programId of ["it", "rural", "market"] as const) {
    const input = { programId, region: "nn" as const, propertyPrice: 8e6, downPayment: 2e6, termYears: 30 };
    expect(calculateMortgage({ ...input, childrenCount: 1 })).toEqual(calculateMortgage({ ...input, childrenCount: 3 }));
    const result = calculateMortgage(input);
    expect(result.subsidyMonths).toBeNull();
    expect(result.totalPayment).toBeCloseTo(result.monthlyPayment * result.termMonths, 4);
    expect(result.monthlyPayment).toBeCloseTo(annuityPayment(6e6, getMortgageProgram(programId).rate, result.termMonths), 6);
  }
});
