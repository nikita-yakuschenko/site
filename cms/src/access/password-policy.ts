import { createHash } from 'node:crypto'
import { ValidationError } from 'payload'

// Only the first five SHA-1 characters leave the server (HIBP k-anonymity).
// No password or complete digest is logged or sent to a third party.
export async function checkStaffPassword(value: unknown, send: typeof fetch = fetch): Promise<void> {
  const reject = (message: string): never => { throw new ValidationError({ collection: 'users', errors: [{ path: 'password', message }] }) }
  if (typeof value !== 'string' || value.length < 16 || value.length > 128) reject('Пароль должен содержать от 16 до 128 символов.')
  const digest = createHash('sha1').update(value as string, 'utf8').digest('hex').toUpperCase()
  let response: Response
  try {
    response = await send(`https://api.pwnedpasswords.com/range/${digest.slice(0, 5)}`, { headers: { 'Add-Padding': 'true' }, signal: AbortSignal.timeout(5000), cache: 'no-store' })
    if (!response.ok) throw new Error('unavailable')
    const text = await response.text()
    if (text.length > 2_000_000 || !/^[A-F0-9]{35}:\d+/m.test(text)) throw new Error('invalid-response')
    if (text.split(/\r?\n/).some(row => { const [suffix, count] = row.trim().split(':'); return suffix === digest.slice(5) && Number(count) > 0 })) reject('Этот пароль найден в базах утечек. Выберите другой пароль.')
  } catch (error) {
    if (error instanceof ValidationError) throw error
    reject('Проверка пароля временно недоступна. Попробуйте сохранить позднее.')
  }
}
