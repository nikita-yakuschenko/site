/** Сценарии из Roistat project 301529: «Подмена НН» и «Подмена МСК». */
const DEFAULT_SCRIPT_NN = '5'
const DEFAULT_SCRIPT_MSK = '2'

/** ID сценариев коллтрекинга Roistat по региону (цифра справа от названия в кабинете). */
export function roistatScriptIdForRegion(region: 'nn' | 'msk'): number | null {
  const raw = region === 'msk'
    ? (process.env.NEXT_PUBLIC_ROISTAT_SCRIPT_MSK?.trim() || DEFAULT_SCRIPT_MSK)
    : (process.env.NEXT_PUBLIC_ROISTAT_SCRIPT_NN?.trim() || DEFAULT_SCRIPT_NN)
  if (!/^\d{1,10}$/.test(raw)) return null
  return Number(raw)
}

type RoistatWindow = Window & {
  roistatCalltrackingScripts?: number[]
  roistatCallTrackingRefresh?: () => void
  roistat?: { setCallTrackingManualMode?: () => void }
}

function clearPhoneCookie(): void {
  document.cookie = 'roistat_phone_script_data=; Path=/; Max-Age=0'
  document.cookie = 'roistat_phone_script_data=; Path=/; Max-Age=0; SameSite=Lax'
}

/** Включает сценарий региона и заново запрашивает номер у Roistat. */
export function applyRegionCalltracking(region: 'nn' | 'msk'): void {
  if (typeof window === 'undefined') return
  const w = window as RoistatWindow
  const scriptId = roistatScriptIdForRegion(region)
  if (scriptId != null) w.roistatCalltrackingScripts = [scriptId]
  clearPhoneCookie()
  if (typeof w.roistatCallTrackingRefresh === 'function') w.roistatCallTrackingRefresh()
  window.dispatchEvent(new Event('avgst:roistat-phone'))
}
