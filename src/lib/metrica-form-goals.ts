import goals from './metrica-goals.json' with { type: 'json' }

type GoalParams = { form_id: string }
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
      // Сбой аналитики не меняет результат сохранения заявки.
    }
  }
}

/** Используем тот же счётчик, который сервер передал компоненту Метрики. */
export function bindMetricaFormGoals(sender: GoalSender): void {
  sendGoal = sender
  flushGoals()
}

/** Вызывать только после подтверждения сохранения заявки сервером. */
export function trackMetricaFormSuccess(receiptId: string, formId: string): void {
  const specific = goals.find(goal => goal.formIds.includes(formId)) ?? goals.find(goal => goal.event === 'lead_other')!
  for (const event of ['lead_success', specific.event]) {
    const key = `${receiptId}:${event}`
    if (!sent.has(key) && !queued.has(key)) queued.set(key, { event, params: { form_id: formId } })
  }
  flushGoals()
}
