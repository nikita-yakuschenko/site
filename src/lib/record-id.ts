const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const digits = '0123456789'

// 8 uppercase Latin characters: exactly 6 letters and 2 digits in any positions
export const recordIdPattern = /^(?=(?:[^0-9]*[0-9]){2}[^0-9]*$)[A-Z0-9]{8}$/

export const isRecordId = (value: unknown): value is string => typeof value === 'string' && recordIdPattern.test(value)

// Bias of modulo over 2^32 is negligible for ranges up to 26
const randomInt = (max: number) => globalThis.crypto.getRandomValues(new Uint32Array(1))[0]! % max

export function generateRecordId(): string {
  const first = randomInt(8)
  const second = (first + 1 + randomInt(7)) % 8
  return Array.from({ length: 8 }, (_, index) => index === first || index === second ? digits[randomInt(10)] : letters[randomInt(26)]).join('')
}
