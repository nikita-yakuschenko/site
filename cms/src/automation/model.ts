export type MailTemplate = { subject?: string | null; html?: string | null; text?: string | null }
export type AutomationConfig = {
  mail: { enabled: boolean; host: string; port: number; secure: boolean; user: string; from: string; replyTo: string }
  referral: { enabled: boolean; titleMatch: string; confirmedStage: string; emailConfirmedField: string; participantField: string; linkField: string; linkTemplate: string; rulesUrl: string; tokenTtlHours: number; confirmationEmail: MailTemplate; welcomeEmail: MailTemplate }
  dmp: { enabled: boolean; dryRun: boolean; domain: string; sourceCategory: number; sourceStage: string; sourceName: string; titlePrefix: string; targetCategory: number; targetStage: string; targetResponsible: number }
  crm: { domain: string }
}
export const defaultConfig: AutomationConfig = {
  mail: { enabled: false, host: '', port: 587, secure: false, user: '', from: '', replyTo: '' },
  referral: { enabled: false, titleMatch: 'Реферальная программа', confirmedStage: 'UC_L2W4L1', emailConfirmedField: '', participantField: 'UF_CRM_1787908414223', linkField: 'UF_CRM_1787908433785', linkTemplate: 'https://avgst.ru/?ref={code}', rulesUrl: 'https://avgst.ru/referral', tokenTtlHours: 72, confirmationEmail: { subject: 'Подтвердите email — Авангард Строй', html: '<p>Здравствуйте, {{name}}!</p><p><a href="{{confirm_url}}">Подтвердить регистрацию в реферальной программе</a></p>' }, welcomeEmail: { subject: 'Ваш код участника — Авангард Строй', html: '<p>Здравствуйте, {{name}}!</p><p>Код участника: <strong>{{code}}</strong></p><p><a href="{{referral_url}}">Ваша реферальная ссылка</a></p>' } },
  dmp: { enabled: false, dryRun: true, domain: 'avgstroy.bitrix24.ru', sourceCategory: 0, sourceStage: 'NEW', sourceName: 'DMP', titlePrefix: 'DMP | Лид |', targetCategory: 77, targetStage: '', targetResponsible: 907 },
  crm: { domain: 'avgstroy.bitrix24.ru' },
}
export function mergeConfig(raw: unknown): AutomationConfig {
  const data = raw && typeof raw === 'object' ? raw as Partial<AutomationConfig> : {}
  return { mail: { ...defaultConfig.mail, ...data.mail }, referral: { ...defaultConfig.referral, ...data.referral }, dmp: { ...defaultConfig.dmp, ...data.dmp }, crm: { ...defaultConfig.crm, ...data.crm } }
}
export function escapeHtml(value: unknown) { return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!) }
export function renderTemplate(template: string, values: Record<string, unknown>, html = true) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => html ? escapeHtml(values[key]) : String(values[key] ?? ''))
}
export function dmpMatches(deal: Record<string, unknown>, settings: AutomationConfig['dmp'], sourceId: string) {
  const prefix = settings.titlePrefix.trim().split(/\s*\|\s*/).map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*\\|\\s*')
  return String(deal.CATEGORY_ID) === String(settings.sourceCategory) && deal.STAGE_ID === settings.sourceStage && String(deal.SOURCE_ID) === sourceId && new RegExp('^' + prefix).test(String(deal.TITLE || ''))
}
export function normalizeEmail(value: unknown) { return String(value || '').trim().toLowerCase() }
