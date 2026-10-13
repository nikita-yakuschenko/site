// Only public kinds are sent to the site; special and dealer prices stay inside the admin.
export const priceKinds = [
  { value: 'msk', label: 'Москва', public: true },
  { value: 'nn', label: 'Нижний Новгород', public: true },
  { value: 'special', label: 'Спеццена', public: false },
  { value: 'dealer', label: 'Дилер', public: false },
] as const

export type PriceKind = (typeof priceKinds)[number]['value']
export const isPriceKind = (value: unknown): value is PriceKind => priceKinds.some(kind => kind.value === value)
export const isPublicPriceKind = (value: unknown) => priceKinds.some(kind => kind.value === value && kind.public)
