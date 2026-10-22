import { mkdirSync, writeFileSync } from 'node:fs'
import { relative } from 'node:path'
import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter'
import type { Finding } from './probe'

type Run = {
  scenario: string
  browser: string
  status: string
  findings: Finding[]
  screenshot?: string
  trace?: string
}

class DiagnosticReporter implements Reporter {
  private runs: Run[] = []
  onTestEnd(test: TestCase, result: TestResult) {
    const attachment = result.attachments.find(item => item.name === 'browser-diagnostics')
    let findings: Finding[] = []
    try { findings = attachment?.body ? JSON.parse(attachment.body.toString()) : [] } catch { /* Retain test result. */ }
    this.runs.push({
      scenario: test.title,
      browser: test.parent.project()?.name || 'unknown',
      status: result.status,
      findings,
      screenshot: relativePath(result.attachments.find(item => item.name === 'failure-screenshot')?.path),
      trace: relativePath(result.attachments.find(item => item.name === 'trace')?.path),
    })
  }
  onEnd() {
    const grouped = new Map<string, { finding: Finding; count: number; runs: Set<number>; screenshots: string[]; traces: string[] }>()
    this.runs.forEach((run, index) => run.findings.forEach(finding => {
      const key = finding.fingerprint + '|' + finding.scenario + '|' + finding.browser
      const entry = grouped.get(key) || { finding, count: 0, runs: new Set<number>(), screenshots: [], traces: [] }
      entry.count++
      entry.runs.add(index)
      if (run.screenshot) entry.screenshots.push(run.screenshot)
      if (run.trace) entry.traces.push(run.trace)
      grouped.set(key, entry)
    }))
    const findings = [...grouped.values()].map(entry => ({
      ...entry.finding,
      reproductions: entry.count,
      syntheticRuns: entry.runs.size,
      syntheticFrequency: entry.runs.size / Math.max(1, this.runs.filter(run => run.scenario === entry.finding.scenario && run.browser === entry.finding.browser).length),
      screenshots: [...new Set(entry.screenshots)],
      traces: [...new Set(entry.traces)],
    }))
    mkdirSync('diagnostics-results', { recursive: true })
    writeFileSync('diagnostics-results/diagnostics.json', JSON.stringify({
      generatedAt: new Date().toISOString(),
      note: 'Synthetic runs only; frequencies are not Yandex Metrica visit rates.',
      runs: this.runs,
      findings,
    }, null, 2))
    const lines = [
      '# Browser diagnostics',
      '',
      `Runs: ${this.runs.length}; failed: ${this.runs.filter(run => run.status !== 'passed').length}; grouped findings: ${findings.length}.`,
      '',
      '| Severity | Browser | Scenario | Category | Count | Synthetic frequency | Message |',
      '|---|---|---|---|---:|---:|---|',
      ...findings.map(f => `| ${f.severity} | ${f.browser} | ${f.scenario.replace(/\|/g, '/')} | ${f.category} | ${f.reproductions} | ${Math.round(f.syntheticFrequency * 100)}% | ${f.message.replace(/\|/g, '/').replace(/\n/g, ' ').slice(0, 140)} |`),
    ]
    writeFileSync('diagnostics-results/summary.md', lines.join('\n'))
  }
}

function relativePath(path?: string) {
  return path ? relative(process.cwd(), path).replaceAll('\\', '/') : undefined
}

export default DiagnosticReporter
