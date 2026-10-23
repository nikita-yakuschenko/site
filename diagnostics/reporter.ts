import { mkdirSync, writeFileSync } from 'node:fs'
import { relative } from 'node:path'
import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter'
import { groupFindings, scenarioKey, type DiagnosticRun, type Finding } from './model'

class DiagnosticReporter implements Reporter {
  private runs: DiagnosticRun[] = []
  onTestEnd(test: TestCase, result: TestResult) {
    const attachment = result.attachments.find(item => item.name === 'browser-diagnostics')
    let findings: Finding[] = []
    try { findings = attachment?.body ? JSON.parse(attachment.body.toString()) : [] } catch { /* Retain test result. */ }
    this.runs.push({
      scenario: scenarioKey(test.title),
      browser: test.parent.project()?.name || 'unknown',
      status: result.status,
      findings,
      errors: result.errors.map(error => (error.message || '').slice(0, 3000)),
      screenshot: relativePath(result.attachments.find(item => item.name === 'failure-screenshot')?.path),
      trace: relativePath(result.attachments.find(item => item.name === 'trace')?.path),
    })
  }
  onEnd() {
    const findings = groupFindings(this.runs)
    mkdirSync('diagnostics-results', { recursive: true })
    writeFileSync('diagnostics-results/diagnostics.json', JSON.stringify({
      generatedAt: new Date().toISOString(),
      revision: process.env.GITHUB_SHA || 'local',
      target: process.env.DIAG_TARGET || 'local',
      captcha: process.env.DIAG_TARGET === 'production' ? 'real-provider' : 'browser-fixture',
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
