import type { Payload } from 'payload'
import { forgetSecret, saveSettings, settings } from '../automation/store'
import { isMessengerChannel, messengerTitles, type MessengerChannel } from './phone'

export function bindingUpdate(line: number, channel: MessengerChannel, current: { lineForChannel: number, channelForLine: MessengerChannel | '' }) {
  const set: Record<string, string> = {
    [`messengerLineChannel:${line}`]: channel,
    [`messengerChannelLine:${channel}`]: String(line),
  }
  const clear: string[] = []
  if (current.lineForChannel > 0 && current.lineForChannel !== line) clear.push(`messengerLineChannel:${current.lineForChannel}`)
  if (current.channelForLine && current.channelForLine !== channel) clear.push(`messengerChannelLine:${current.channelForLine}`)
  return { set, clear }
}

export async function lineChannel(payload: Payload, line: number): Promise<MessengerChannel | ''> {
  if (!line) return ''
  const value = (await settings(payload)).secret(`messengerLineChannel:${line}`)
  return isMessengerChannel(value) ? value : ''
}

export async function channelLine(payload: Payload, channel: MessengerChannel) {
  const line = Number((await settings(payload)).secret(`messengerChannelLine:${channel}`))
  return Number.isInteger(line) && line > 0 ? line : 0
}

export async function bindLine(payload: Payload, line: number, channel: MessengerChannel) {
  const saved = await settings(payload)
  const lineForChannel = Number(saved.secret(`messengerChannelLine:${channel}`)) || 0
  const previous = saved.secret(`messengerLineChannel:${line}`)
  const update = bindingUpdate(line, channel, { lineForChannel, channelForLine: isMessengerChannel(previous) ? previous : '' })
  await saveSettings(payload, saved.config, update.set)
  for (const key of update.clear) await forgetSecret(payload, key)
  return lineForChannel > 0 && lineForChannel !== line ? `${messengerTitles[channel]} перенесён с линии ${lineForChannel} на эту.` : ''
}

export async function unbindLine(payload: Payload, line: number) {
  const channel = await lineChannel(payload, line)
  await forgetSecret(payload, `messengerLineChannel:${line}`)
  if (channel && await channelLine(payload, channel) === line) await forgetSecret(payload, `messengerChannelLine:${channel}`)
}
