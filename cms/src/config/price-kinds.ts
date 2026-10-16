// На сайт уходят только публичные типы. Спеццены и дилер остаются в панели.
export const priceKinds = [
  { value: 'msk', label: 'Москва', public: true },
  { value: 'nn', label: 'Нижний Новгород', public: true },
  { value: 'special', label: 'Спеццена НН', public: false },
  { value: 'special-msk', label: 'Спеццена МСК', public: false },
  { value: 'dealer', label: 'Дилер', public: false },
] as const

export type PriceKind = (typeof priceKinds)[number]['value']
export const isPriceKind = (value: unknown): value is PriceKind => priceKinds.some(kind => kind.value === value)
export const isPublicPriceKind = (value: unknown) => priceKinds.some(kind => kind.value === value && kind.public)
