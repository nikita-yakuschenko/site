/** ID сценариев коллтрекинга Roistat по региону (из настроек сценария справа от названия). */
export function roistatScriptIdForRegion(region: 'nn' | 'msk'): number | null {
  const raw = region === 'msk'
    ? process.env.NEXT_PUBLIC_ROISTAT_SCRIPT_MSK
    : process.env.NEXT_PUBLIC_ROISTAT_SCRIPT_NN
  if (!raw || !/^\d{1,10}$/.test(raw.trim())) return null
  return Number(raw.trim())
}

type RoistatWindow = Window & {
  roistatCalltrackingScripts?: number[]
  roistatCallTrackingRefresh?: () => void
}

/** Включает сценарий региона и заново запрашивает номер у Roistat. */
export function applyRegionCalltracking(region: 'nn' | 'msk'): void {
  if (typeof window === 'undefined') return
  const w = window as RoistatWindow
  const scriptId = roistatScriptIdForRegion(region)
  if (scriptId != null) w.roistatCalltrackingScripts = [scriptId]
  if (typeof w.roistatCallTrackingRefresh === 'function') w.roistatCallTrackingRefresh()
  window.dispatchEvent(new Event('avgst:roistat-phone'))
}
