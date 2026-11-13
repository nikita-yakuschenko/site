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
      const sender = await event.message.getSender().catch(() => null) as { phone?: string, username?: string, firstName?: string, lastName?: string } | null
      const phone = nationalPhone(sender?.phone || '')
      const text = event.message.message || ''
      const name = [sender?.firstName, sender?.lastName].filter(Boolean).join(' ')
      const peer = String(event.message.senderId || '')
      if ((phone || sender?.username || peer) && text) hooks.onMessage(phone, text, { name, username: sender?.username || '', peer }, `${event.message.chatId}:${event.message.id}`)
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
      if (!(await client.isUserAuthorized())) throw new Error('Telegram ещё не подключён')
      if (/^peer:\d+$/.test(address)) {
        const id = address.slice(5)
        const peer = await client.getInputEntity(bigInt(id)).catch(async () => {
          for await (const dialog of client.iterDialogs({})) {
            if (String(dialog.id) === id) return dialog.inputEntity
          }
          throw new Error('Не найден исходный диалог Telegram')
        })
        await client.sendMessage(peer, { message: text })
        return
      }
      if (address.startsWith('@')) { await client.sendMessage(address, { message: text }); return }
      const phone = nationalPhone(address)
      if (!phone) throw new Error('Telegram ещё не подключён')
      const user = await resolveTelegramPhone(client, phone)
      if (!user) throw new Error('В Telegram нет пользователя с этим номером')
      await client.sendMessage(user, { message: text })
    },
    lookup: async phone => {
      if (!(await client.isUserAuthorized())) throw new Error('Telegram не подключён')
      const national = nationalPhone(phone)
      if (!national) throw new Error('Некорректный номер')
      const user = await resolveTelegramPhone(client, national)
      return user ? 'found' : 'missing'
    },
    stop: async () => { await client.disconnect() },
  }
}

async function resolveTelegramPhone(client: TelegramClient, phone: string) {
  const imported = await client.invoke(new Api.contacts.ImportContacts({
    contacts: [new Api.InputPhoneContact({ clientId: bigInt(1), phone: `+${phone}`, firstName: 'Клиент', lastName: '' })],
  }))
  return imported.users[0] || null
}
