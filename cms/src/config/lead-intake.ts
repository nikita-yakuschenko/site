import { randomUUID } from 'node:crypto'
import type { LeadInput } from '../../../src/lib/leads'

type Receipt = { id: string | number; requestId: string }
type Result = { status: 'sent' | 'test' }
type Intake = {
  find: (requestId: string) => Promise<Receipt | undefined>
  save: (requestId: string) => Promise<Receipt>
  defer: (work: () => Promise<void>) => void
  deliver: (requestId: string) => Promise<Result>
  update: (id: Receipt['id'], result: Result | { status: 'failed' }) => Promise<unknown>
  report: (error: unknown) => void
}

/** Успех формы означает сохранённое обращение, а не скорость внешней CRM. */
export async function acceptLead(input: Pick<LeadInput, 'requestId'>, deps: Intake) {
  const requestId = input.requestId || randomUUID()
  const existing = await deps.find(requestId)
  if (existing) return { accepted: true, id: existing.requestId }
  let receipt: Receipt
  try {
    receipt = await deps.save(requestId)
  } catch (error) {
    // Две одновременные отправки с одним ключом упираются в UNIQUE requestId.
    const concurrent = await deps.find(requestId)
    if (concurrent) return { accepted: true, id: concurrent.requestId }
    throw error
  }
  deps.defer(async () => {
    let result: Result
    try {
      result = await deps.deliver(requestId)
    } catch (error) {
      deps.report(error)
      // Заявка уже сохранена. Сбой внешней передачи виден в CMS, но не
      // провоцирует повторное обращение и дубль сделки со стороны клиента.
      try { await deps.update(receipt.id, { status: 'failed' }) } catch (saveError) { deps.report(saveError) }
      return
    }
    try { await deps.update(receipt.id, result) } catch (error) { deps.report(error) }
  })
  return { accepted: true, id: receipt.requestId }
}
