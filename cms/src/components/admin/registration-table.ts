export type ParticipantRow = {
  id: number; name: string; email?: string | null; phone?: string | null; code?: string; eventSlug?: string
  status: string; confirmedAt?: string | null; createdAt: string
}
export const participantStatuses = { active: 'Активен', pending: 'Ожидает подтверждения', blocked: 'Заблокирован', confirmed: 'Подтверждено', cancelled: 'Отменено', attended: 'Посетил' }
export const registrationSorts = ['name', 'email', 'code', 'status', 'confirmedAt'] as const
export type RegistrationSort = typeof registrationSorts[number]
export function registrationState(params: { get: (key: string) => string | null }) {
  return {
    search: params.get('q') || '',
    statuses: (params.get('status') || '').split(',').filter(s => s in participantStatuses),
    events: (params.get('event') || '').split(',').filter(Boolean),
    sort: registrationSorts.includes(params.get('sort') as RegistrationSort) ? params.get('sort') as RegistrationSort : null,
    direction: params.get('direction') === 'desc' ? 'desc' as const : 'asc' as const,
  }
}
const collator = new Intl.Collator('ru', { numeric: true, sensitivity: 'base' })
export function registrationRows<T extends ParticipantRow>(rows: T[], state: ReturnType<typeof registrationState>) {
  const q = state.search.trim().toLocaleLowerCase('ru')
  return rows.filter(row => (!q || [row.name, row.email, row.phone, row.code].join(' ').toLocaleLowerCase('ru').includes(q)) && (!state.statuses.length || state.statuses.includes(row.status)) && (!state.events.length || state.events.includes(row.eventSlug || ''))).sort((a, b) => {
    if (!state.sort) return b.createdAt.localeCompare(a.createdAt) || a.id - b.id
    const result = collator.compare(String(a[state.sort] || ''), String(b[state.sort] || ''))
    return (state.direction === 'desc' ? -result : result) || a.id - b.id
  })
}
