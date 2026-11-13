import { createRequire } from 'node:module'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions'
import { NewMessage } from 'telegram/events'
import { Api } from 'telegram'
import bigInt from 'big-integer'
import { nationalPhone } from './phone'
import type { LinkHandle, LinkHooks } from './whatsapp-link'

const require = createRequire(import.meta.url)
const qrCode = require('qrcode') as { toDataURL: (text: string) => Promise<string> }

export async function startTelegram(directory: string, hooks: LinkHooks & { password: () => Promise<string> }): Promise<LinkHandle> {
  const apiId = Number(process.env.TELEGRAM_API_ID)
  const apiHash = process.env.TELEGRAM_API_HASH || ''
  if (!apiId || !apiHash) throw new Error('Для Telegram укажите TELEGRAM_API_ID и TELEGRAM_API_HASH в окружении CMS. Ключи берутся один раз на my.telegram.org.')
  const file = path.join(directory, 'session.txt')
  const saved = await readFile(file, 'utf8').catch(() => '')
  const client = new TelegramClient(new StringSession(saved.trim()), apiId, apiHash, { connectionRetries: 2 })
  await client.connect()
  const finish = async () => {
    await writeFile(file, (client.session as unknown as { save: () => string }).save())
    hooks.onSaved()
    const me = await client.getMe()
    hooks.onConnected(nationalPhone((me as { phone?: string }).phone || ''))
    client.addEventHandler(async event => {
      if (!event.isPrivate || event.message.out) return
      const sender = await event.message.getSender().catch(() => null) as { phone?: string } | null
      const phone = nationalPhone(sender?.phone || '')
      const text = event.message.message || ''
      if (phone && text) hooks.onMessage(phone, text)
    }, new NewMessage({}))
  }
  if (await client.isUserAuthorized()) await finish()
  else {
    void client.signInUserWithQrCode({ apiId, apiHash }, {
      qrCode: async code => { hooks.onQr(await qrCode.toDataURL(`tg://login?token=${Buffer.from(code.token).toString('base64url')}`)) },
      password: () => hooks.password(),
      onError: async error => { hooks.onError(error.message || 'Telegram не подтвердил вход'); return false },
    }).then(finish).catch(error => hooks.onError(error instanceof Error ? error.message : 'Telegram не подтвердил вход'))
  }
  return {
    send: async (address, text) => {
      const phone = nationalPhone(address)
      if (!phone || !(await client.isUserAuthorized())) throw new Error('Telegram ещё не подключён')
      const imported = await client.invoke(new Api.contacts.ImportContacts({
        contacts: [new Api.InputPhoneContact({ clientId: bigInt(1), phone: `+${phone}`, firstName: 'Клиент', lastName: '' })],
      }))
      const user = imported.users[0]
      if (!user) throw new Error('В Telegram нет пользователя с этим номером')
      await client.sendMessage(user, { message: text })
    },
    stop: async () => { await client.disconnect() },
  }
}
