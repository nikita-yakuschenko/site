// User-provided illustrative monthly take-home rates, including target bonus.
export const PAYROLL_RATES = {
  procurement: 105_000,
  logistics: 95_000,
  design: 135_000,
  control: 150_000,
  supervisor: 155_000,
  combined: 105_000,
  contractorCrew: 750_000,
} as const;

export function calculateBusinessPayroll(loads: readonly number[], crews: number, supervisors: number) {
  const [procurement, logistics, design, control] = loads;
  const staffCount = (load: number) => Math.ceil(load / 50);
  const combined = procurement! + logistics! < 50;
  const roles = [
    ...(combined
      ? [{ title: "Закупки и логистика", count: 1, rate: PAYROLL_RATES.combined }]
      : [
          { title: "Менеджер по закупкам", count: staffCount(procurement!), rate: PAYROLL_RATES.procurement },
          { title: "Логист", count: staffCount(logistics!), rate: PAYROLL_RATES.logistics },
        ]),
    { title: "Инженер-проектировщик", count: staffCount(design!), rate: PAYROLL_RATES.design },
    { title: "Инженер технадзора", count: staffCount(control!), rate: PAYROLL_RATES.control },
    { title: "Прораб", count: supervisors, rate: PAYROLL_RATES.supervisor },
  ].map(role => ({ ...role, total: role.count * role.rate }));
  const payroll = roles.reduce((sum, role) => sum + role.total, 0);
  const contractors = crews * PAYROLL_RATES.contractorCrew;
  return { roles, payroll, contractors, total: payroll + contractors, combined };
}
