// На сайт уходят только публичные типы. Спеццены и дилер остаются в панели.
// Порядок значений совпадает с enum в базе. Экран проекта показывает другой порядок.
export const priceKinds = [
  { value: 'msk', label: 'Москва', public: true },
  { value: 'nn', label: 'Нижний Новгород', public: true },
  { value: 'special', label: 'Спеццена НН', public: false },
  { value: 'special-msk', label: 'Спеццена МСК', public: false },
  { value: 'dealer', label: 'Дилер', public: false },
  { value: 'special-dealer', label: 'Спеццена дилер', public: false },
] as const

export type PriceKind = (typeof priceKinds)[number]['value']
const priceKindFormOrder = ['nn', 'special', 'msk', 'special-msk', 'dealer', 'special-dealer'] as const satisfies readonly PriceKind[]
export const priceKindsInForm = priceKindFormOrder.map(value => priceKinds.find(kind => kind.value === value)!)

export const isPriceKind = (value: unknown): value is PriceKind => priceKinds.some(kind => kind.value === value)
export const isPublicPriceKind = (value: unknown) => priceKinds.some(kind => kind.value === value && kind.public)

// В сводной таблице городские цены — стандартная комплектация. У дилера в файле одна колонка «Старт».
export const summaryConfiguration = (kind: PriceKind) => kind === 'dealer' || kind === 'special-dealer' ? 'start' : 'standard'
