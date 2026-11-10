import goals from './metrica-goals.json' with { type: 'json' }

type GoalParams = Record<string, string>
type GoalSender = (event: string, params: GoalParams) => void
const queued = new Map<string, { event: string; params: GoalParams }>()
const sent = new Set<string>()
let sendGoal: GoalSender | undefined

function flushGoals(): void {
  if (!sendGoal) return
  for (const [key, goal] of queued) {
    try {
      sendGoal(goal.event, goal.params)
      sent.add(key)
      queued.delete(key)
    } catch {
      // Сбой аналитики не меняет результат действия на сайте.
    }
  }
}

/** Используем тот же счётчик, который сервер передал компоненту Метрики. */
export function bindMetricaFormGoals(sender: GoalSender): void {
  sendGoal = sender
  flushGoals()
}

const mortgageEvents: Record<string, string> = {
  it: 'lead_mortgage_it',
  family: 'lead_mortgage_family',
  market: 'lead_mortgage_market',
}

/** Калькулятор и консультация общие для трёх программ, цель выбирается по программе в заявке. */
function specificGoal(formId: string, meta?: Record<string, unknown>) {
  const program = typeof meta?.program === 'string' ? meta.program : ''
  if (formId === 'mortgage-consultation' || formId === 'mortgage-calculator') {
    const event = mortgageEvents[program]
    const match = event ? goals.find(goal => goal.event === event) : undefined
    if (match) return match
  }
  return goals.find(goal => goal.formIds.includes(formId)) ?? goals.find(goal => goal.event === 'lead_other')!
}

/** Вызывать только после подтверждения сохранения заявки сервером. */
export function trackMetricaFormSuccess(receiptId: string, formId: string, meta?: Record<string, unknown>): void {
  const specific = specificGoal(formId, meta)
  const params: GoalParams = { form_id: formId }
  if (typeof meta?.program === 'string' && mortgageEvents[meta.program]) params.program = meta.program
  for (const event of ['lead_success', specific.event]) {
    const key = `${receiptId}:${event}`
    if (!sent.has(key) && !queued.has(key)) queued.set(key, { event, params })
  }
  flushGoals()
}

/** Клик или просмотр. Каждое действие отправляется отдельно, без дедупликации заявки. */
export function trackMetricaAction(event: string, params: GoalParams = {}): void {
  const key = `action:${event}:${crypto.randomUUID()}`
  queued.set(key, { event, params })
  flushGoals()
}
