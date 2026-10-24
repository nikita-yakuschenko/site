import { mergeConfig, type AutomationConfig } from './model'
export function validateSettings(input: unknown): AutomationConfig {
  const config = mergeConfig(input)
  if (!/^[a-z0-9.-]+\.bitrix24\.(ru|com|by|kz|eu|de)$/.test(config.crm.domain)) throw new Error('Проверьте домен Битрикс24')
  for (const value of [config.dmp.sourceCategory, config.dmp.targetCategory, config.dmp.targetResponsible]) if (!Number.isSafeInteger(value) || value < 0) throw new Error('Категории и ответственный должны быть целыми числами')
  if (config.dmp.enabled && (!config.dmp.sourceStage || !config.dmp.sourceName || !config.dmp.titlePrefix || !config.dmp.targetResponsible)) throw new Error('Заполните критерии DMP и ответственного')
  if (!Number.isFinite(config.referral.tokenTtlHours) || config.referral.tokenTtlHours < 1 || config.referral.tokenTtlHours > 720) throw new Error('Срок ссылки: от 1 до 720 часов')
  if (!/^https:\/\//.test(config.referral.linkTemplate) || !config.referral.linkTemplate.includes('{code}')) throw new Error('Реферальная ссылка должна содержать {code} и начинаться с https://')
  if (!Number.isInteger(config.mail.port) || config.mail.port < 1 || config.mail.port > 65535) throw new Error('Проверьте порт SMTP')
  if (config.mail.enabled && (!config.mail.host || !config.mail.from)) throw new Error('Заполните сервер и отправителя SMTP')
  // Keep settings bounded; template HTML is editable only by a verified administrator.
  if (JSON.stringify(config).length > 150000) throw new Error('Настройки слишком велики')
  return config
}
