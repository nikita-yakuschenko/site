export type Finding = {
  url: string; scenario: string; browser: string; device: string; category: string
  message: string; stack: string; severity: 'critical' | 'warning' | 'info'
  source: 'application' | 'third-party' | 'unknown'; component: string
  cause: 'confirmed' | 'unconfirmed'; fingerprint: string
}
export type DiagnosticRun = {
  scenario: string; browser: string; status: string; findings: Finding[]
  errors?: string[]; screenshot?: string; trace?: string
}
export const scenarioKey = (title: string) => title.replace(/\s+@\S+/g, '').trim()
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
