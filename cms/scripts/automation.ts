/** Run inside the CMS release container. Secrets arrive on stdin, never argv or logs. */
process.env.CMS_MAINTENANCE = '1'
process.env.CMS_SEED = '0'
process.env.PAYLOAD_DB_PUSH = 'false'
export {}
const { getPayload } = await import('payload')
const { default: config } = await import('../src/payload.config')
const { settings, saveSettings, enqueue } = await import('../src/automation/store')
const { mergeConfig } = await import('../src/automation/model')
const { seedOpenDay } = await import('../src/automation/seed')
const { importCrm } = await import('../src/automation/import')
const payload = await getPayload({ config })
try {
  const action = process.argv[2]
  if (action === 'bootstrap') {
    let input = ''; for await (const part of process.stdin) input += part
    const data = JSON.parse(input)
    const current = await settings(payload)
    await saveSettings(payload, mergeConfig(data.config), data.secrets, { ...(current.cutover as Record<string, unknown> || {}), active: false, importedSettingsAt: new Date().toISOString() })
    await seedOpenDay(payload)
    console.log(JSON.stringify({ settingsImported: true, secrets: Object.keys(data.secrets || {}), active: false }))
  } else if (action === 'import') console.log(JSON.stringify(await importCrm(payload)))
  else if (action === 'activate' || action === 'pause') {
    const saved = await settings(payload)
    await saveSettings(payload, saved.config, {}, { ...(saved.cutover as Record<string, unknown> || {}), active: action === 'activate', changedAt: new Date().toISOString() })
    console.log(JSON.stringify({ active: action === 'activate' }))
  } else if (action === 'queue-import') {
    let input = ''; for await (const part of process.stdin) input += part
    const rows = JSON.parse(input) as { id: number; deal: number; attempts: number; due: number; failed: number }[]
    for (const row of rows) {
      const job = await enqueue(payload, 'dmp', { dealId: String(row.deal), legacyJobId: row.id }, `legacy-dmp:${row.id}`, new Date(Math.max(0, row.due * 1000)).toISOString())
      if (job.status !== 'completed') await payload.update({ collection: 'automation-jobs', id: job.id, data: { attempts: row.attempts, status: row.failed ? 'failed' : 'queued', ...(row.failed ? { lastError: 'Перенесено из старой очереди DMP после исчерпания попыток' } : {}) }, overrideAccess: true })
    }
    console.log(JSON.stringify({ imported: rows.length }))
  } else if (action === 'status') {
    const saved = await settings(payload)
    const counts = await Promise.all((['referral-participants', 'events', 'event-registrations', 'automation-jobs'] as const).map(async collection => [collection, (await payload.count({ collection, overrideAccess: true })).totalDocs]))
    console.log(JSON.stringify({ cutover: saved.cutover, counts: Object.fromEntries(counts), configured: Object.keys(saved.vault) }))
  } else if (action === 'verify') {
    const { crm } = await import('../src/automation/bitrix')
    const { default: nodemailer } = await import('nodemailer')
    const saved = await settings(payload), api = await crm(payload, true)
    const stages = await api.call<{ NAME: string; STATUS_ID: string }[]>('crm.status.list', { filter: { ENTITY_ID: `DEAL_STAGE_${saved.config.dmp.targetCategory}` } })
    const found = stages.filter(s => saved.config.dmp.targetStage ? s.STATUS_ID === saved.config.dmp.targetStage : s.NAME.toLowerCase() === 'новая')
    if (found.length !== 1) throw new Error('Не найден однозначный целевой этап DMP')
    let responsibleCheck = 'verified'
    try {
      const users = await api.call<{ ID: string }[]>('user.get', { ID: saved.config.dmp.targetResponsible })
      if (!users.some(user => String(user.ID) === String(saved.config.dmp.targetResponsible))) throw new Error('Не найден ответственный DMP')
    } catch (error) {
      // A CRM-only webhook can assign deals but cannot enumerate employees.
      // Preserve its existing production assignee without requesting broader rights.
      if (!(error instanceof Error) || !error.message.includes('insufficient_scope')) throw error
      responsibleCheck = 'preserved-source-setting; employee-directory-scope-unavailable'
    }
    const transport = nodemailer.createTransport({ host: saved.config.mail.host, port: saved.config.mail.port, secure: saved.config.mail.secure, auth: saved.config.mail.user ? { user: saved.config.mail.user, pass: saved.secret('smtpPassword') } : undefined, connectionTimeout: 15000, socketTimeout: 30000 })
    try { await transport.verify() } finally { transport.close() }
    await saveSettings(payload, { ...saved.config, dmp: { ...saved.config.dmp, targetStage: found[0].STATUS_ID } })
    console.log(JSON.stringify({ smtp: 'verified-without-sending', dmpStage: found[0].STATUS_ID, responsible: saved.config.dmp.targetResponsible, responsibleCheck }))
  } else throw new Error('bootstrap | import | activate | pause | queue-import | status')
} finally { await payload.destroy() }
process.exit(0)
