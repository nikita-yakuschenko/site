import type { Media } from '../payload-types'
export const validRoomArea = (value: unknown) => typeof value === 'string' && /^\d+(?:[.,]\d+)?(?:\s*м[²2])?$/.test(value.trim()) && Number.parseFloat(value.replace(',', '.')) > 0

type Room = { name: string; area: string; id?: string | null }
type Floor = { label?: string | null; image?: string | null; photo?: string | Media | null; rooms?: Room[] | null; id?: string | null }
type Variant = { label?: string | null; image?: string | null; rooms?: Room[] | null; floors?: Floor[] | null; id?: string | null }
export function normalizePlans(plans: Variant[]) {
  return plans.map(variant => {
    const floors = variant.floors?.length ? variant.floors : variant.image ? [{ image: variant.image, rooms: variant.rooms || [] }] : []
    return { ...variant, label: null, image: null, rooms: [], floors: floors.map(floor => ({ ...floor, label: floor.label?.trim() || null, image: floor.photo ? null : floor.image, rooms: floor.rooms || [] })) }
  })
}
// Names are positional: variants follow the Russian alphabet, floors are numbered.
const variantLetters = 'АБВГДЕЁЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ'
export const variantName = (index: number) => `Вариант ${variantLetters[index] ?? index + 1}`
export const floorName = (label: string | null | undefined, index: number) => label?.trim() || `${index + 1} этаж`
