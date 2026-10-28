export type Finding = {
  url: string; scenario: string; browser: string; device: string; category: string
  evidenceUrl?: string
  message: string; stack: string; severity: 'critical' | 'warning' | 'info'
  source: 'application' | 'third-party' | 'unknown'; component: string
  cause: 'confirmed' | 'unconfirmed'; fingerprint: string
}
export type DiagnosticRun = {
  scenario: string; browser: string; status: string; findings: Finding[]
  errors?: string[]; screenshot?: string; trace?: string
}
export const scenarioKey = (title: string) => title.replace(/\s+@\S+/g, '').trim()

/** The responsive CMS path introduced in b3b063b; local files remain pre-encoded. */
export function expectedCMSImageOptimization(requestUrl: string, origin: string): boolean {
  try {
    const request = new URL(requestUrl)
    if (request.origin !== origin || request.pathname !== '/_next/image') return false
    const query = request.searchParams
    if (Array.from(query.keys()).length !== 3 || !['url', 'w', 'q'].every(key => query.getAll(key).length === 1)) return false
    if (![32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1280, 1920, 2048, 2560, 3840].some(width => String(width) === query.get('w'))) return false
    if (![45, 60, 75, 80, 85, 90, 100].some(quality => String(quality) === query.get('q'))) return false
    const source = new URL(query.get('url') || '')
    return source.origin === 'https://cms.avgst.ru' && !source.username && !source.password && !source.search && !source.hash
      && source.pathname.startsWith('/api/media/file/') && /\.(?:jpe?g|png|webp|avif)$/i.test(source.pathname)
  } catch { return false }
}

/** Only an actual provider URL is evidence; message keywords are insufficient. */
export function captchaProviderSource(location: string) {
  try {
    const url = new URL(location)
    return url.protocol === 'https:' && ['smartcaptcha.cloud.yandex.ru', 'smartcaptcha.yandexcloud.net'].includes(url.hostname)
  } catch { return false }
}

export function runtimeSeverity(category: string, hydration: boolean, location: string, origin: string): Finding['severity'] {
  if (['scenario-failure', 'origin-escape', 'runtime-image-optimizer'].includes(category)) return 'critical'
  if (captchaProviderSource(location)) return 'warning'
  let application = false
  try { application = new URL(location).origin === origin } catch { /* Unknown remains critical for hydration. */ }
  if (hydration || (application && ['exception', 'console-error', 'script-failure', 'http-5xx'].includes(category))) return 'critical'
  if (['console-warning', 'console-error', 'navigation-fetch-cancelled'].includes(category) || (/^https?:/.test(location) && !application)) return 'warning'
  return 'info'
}
export const navigationCancellation = (message: string, navigating: boolean) =>
  navigating && /^(?:net::ERR_ABORTED|NS_BINDING_ABORTED|Load request cancelled)$/.test(message)

export const cancelledImageConsole = (browser: string, message: string, elapsedSinceCancellation?: number) =>
  browser.startsWith('firefox') && message.includes('Image corrupt or truncated.') &&
  elapsedSinceCancellation !== undefined && Math.abs(elapsedSinceCancellation) <= 500

export function webkitNavigationFetch(message: string, stack: string, browser: string, navigating: boolean, origin: string) {
  if (!navigating || !browser.startsWith('webkit') || !/due to access control checks\.$/.test(message)) return false
  const url = stack.match(/^Fetch API cannot load (https?:\/\/\S+) due to access control checks\./)?.[1]
  return Boolean(url && new URL(url).origin === origin)
}

export function groupFindings(runs: DiagnosticRun[]) {
  const groups = new Map<string, { finding: Finding; count: number; runs: Set<number>; screenshots: Set<string>; traces: Set<string> }>()
  runs.forEach((run, index) => run.findings.forEach(finding => {
    const normalized = { ...finding, scenario: scenarioKey(finding.scenario), browser: run.browser }
    const key = JSON.stringify([normalized.fingerprint, normalized.scenario, normalized.browser])
    const group = groups.get(key) ?? { finding: normalized, count: 0, runs: new Set<number>(), screenshots: new Set<string>(), traces: new Set<string>() }
    group.count++; group.runs.add(index)
    if (run.screenshot) group.screenshots.add(run.screenshot)
    if (run.trace) group.traces.add(run.trace)
    groups.set(key, group)
  }))
  return [...groups.values()].map(group => ({
    ...group.finding, reproductions: group.count, syntheticRuns: group.runs.size,
    syntheticFrequency: group.runs.size / runs.filter(run => scenarioKey(run.scenario) === group.finding.scenario && run.browser === group.finding.browser).length,
    screenshots: [...group.screenshots], traces: [...group.traces],
  }))
}
