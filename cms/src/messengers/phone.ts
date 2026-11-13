export const messengerChannels = ['whatsapp', 'telegram', 'max'] as const
export type MessengerChannel = (typeof messengerChannels)[number]
export type AccountStatus = 'off' | 'qr' | 'password' | 'on' | 'error'
export type AccountView = { channel: MessengerChannel, title: string, status: AccountStatus, phone: string, qr: string, hint: string }

export const messengerTitles: Record<MessengerChannel, string> = { whatsapp: 'WhatsApp', telegram: 'Telegram', max: 'MAX' }

export function isMessengerChannel(value: string): value is MessengerChannel {
  return value === 'whatsapp' || value === 'telegram' || value === 'max'
}

// Российский номер из 10 цифр и номер с 8 приводим к виду 7XXXXXXXXXX. Остальные международные номера оставляем как есть.
export function nationalPhone(value: string) {
  let digits = value.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('8')) digits = `7${digits.slice(1)}`
  else if (digits.length === 10) digits = `7${digits}`
  return /^\d{10,15}$/.test(digits) ? digits : ''
}

export function chatAddress(channel: MessengerChannel, phone: string) {
  const national = nationalPhone(phone)
  return national ? `${channel}:${national}` : ''
}

export function readChat(chatId: string) {
  const split = chatId.indexOf(':')
  const channel = split > 0 ? chatId.slice(0, split) : ''
  const id = split > 0 ? chatId.slice(split + 1) : ''
  if (!isMessengerChannel(channel)) return { channel: '' as const, phone: '', id: '' }
  return { channel, phone: nationalPhone(id), id }
}

export function readablePhone(phone: string) {
  const national = nationalPhone(phone)
  return national ? `+${national}` : ''
}
