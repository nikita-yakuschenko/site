import type { PostgresAdapterArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'
import { check, foreignKey, index, integer, jsonb, pgTable, smallint, text, timestamp, unique, uuid, varchar, type AnyPgColumn } from '@payloadcms/db-postgres/drizzle/pg-core'
import { preferenceTables } from './preference-schema'

const time = (name: string) => timestamp(name, { withTimezone: true, precision: 3, mode: 'date' })

/** Register with Payload's actual Drizzle schema so migration drift sees owned tables. */
export function optimizationTables(projectId: AnyPgColumn) {
  const configVersions = pgTable('optimization_config_versions', {
    id: uuid('id').primaryKey(),
    createdAt: time('created_at').notNull().defaultNow(),
    contentHash: varchar('content_hash', { length: 64 }).notNull(),
    config: jsonb('config').notNull(),
  })
  const decisions = pgTable('optimization_decisions', {
    id: uuid('id').primaryKey(),
    subjectKey: text('subject_key'),
    sessionKey: text('session_key'),
    region: text('region').notNull(),
    mode: text('mode').notNull(),
    configVersion: uuid('config_version').notNull(),
    policyVersion: text('policy_version').notNull(),
    modelVersion: text('model_version').notNull(),
    candidateSetHash: varchar('candidate_set_hash', { length: 64 }).notNull(),
    candidateSnapshot: jsonb('candidate_snapshot').notNull(),
    assignedAt: time('assigned_at').notNull(),
    expiresAt: time('expires_at').notNull(),
    invalidatedAt: time('invalidated_at'),
  }, table => [
    foreignKey({ name: 'ao_decisions_config_fk', columns: [table.configVersion], foreignColumns: [configVersions.id] }),
    check('ao_decisions_region_check', sql`${table.region} IN ('nn','msk')`),
    check('ao_decisions_mode_check', sql`${table.mode} IN ('manual','hybrid','automatic')`),
    check('ao_decisions_expiry_check', sql`${table.expiresAt} > ${table.assignedAt}`),
    index('ao_decisions_context_idx').on(table.subjectKey, table.region, table.expiresAt),
  ])
  const heads = pgTable('optimization_assignment_heads', {
    id: uuid('id').primaryKey().defaultRandom(),
    subjectKey: text('subject_key').notNull(),
    region: text('region').notNull(),
    scope: text('scope').notNull(),
    currentDecisionId: uuid('current_decision_id'),
    revision: integer('revision').notNull().default(0),
  }, table => [
    unique('ao_heads_context_unique').on(table.subjectKey, table.region, table.scope),
    foreignKey({ name: 'ao_heads_decision_fk', columns: [table.currentDecisionId], foreignColumns: [decisions.id] }).onDelete('set null'),
    check('ao_heads_region_check', sql`${table.region} IN ('nn','msk')`),
    check('ao_heads_revision_check', sql`${table.revision} >= 0`),
  ])
  const items = pgTable('optimization_decision_items', {
    id: uuid('id').primaryKey().defaultRandom(),
    decisionId: uuid('decision_id').notNull(),
    projectId: integer('project_id'),
    projectCode: varchar('project_code', { length: 8 }).notNull(),
    position: smallint('slot_position').notNull(),
    origin: text('origin').notNull(),
    samplingTrace: jsonb('sampling_trace').notNull(),
  }, table => [
    unique('ao_items_position_unique').on(table.decisionId, table.position),
    foreignKey({ name: 'ao_items_decision_fk', columns: [table.decisionId], foreignColumns: [decisions.id] }),
    foreignKey({ name: 'ao_items_project_fk', columns: [table.projectId], foreignColumns: [projectId] }).onDelete('set null'),
    unique('ao_items_project_unique').on(table.decisionId, table.projectId),
    unique('ao_items_code_unique').on(table.decisionId, table.projectCode),
    unique('ao_items_exposure_key').on(table.decisionId, table.projectCode, table.position),
    check('ao_items_position_check', sql`${table.position} BETWEEN 1 AND 6`),
    check('ao_items_origin_check', sql`${table.origin} IN ('manual','exploration','posterior','fallback')`),
    check('ao_items_code_check', sql`${table.projectCode} ~ '^[A-Z0-9]{8}$' AND length(regexp_replace(${table.projectCode}, '[^0-9]', '', 'g')) = 2`),
  ])
  const exposures = pgTable('optimization_exposures', {
    id: uuid('id').primaryKey(),
    decisionId: uuid('decision_id').notNull(),
    projectCode: varchar('project_code', { length: 8 }).notNull(),
    position: smallint('position').notNull(),
    scopeKey: text('scope_key').notNull(),
    region: text('region').notNull(),
    visibleAt: time('visible_at').notNull(),
    receivedAt: time('received_at').notNull().defaultNow(),
    visibilityRuleVersion: text('visibility_rule_version').notNull(),
  }, table => [
    foreignKey({ name: 'ao_exposures_item_fk', columns: [table.decisionId, table.projectCode, table.position], foreignColumns: [items.decisionId, items.projectCode, items.position] }),
    unique('ao_exposures_scope_unique').on(table.decisionId, table.projectCode, table.position, table.scopeKey),
    check('ao_exposures_region_check', sql`${table.region} IN ('nn','msk')`),
    index('ao_exposures_time_idx').on(table.visibleAt),
  ])
  const events = pgTable('optimization_events', {
    eventId: uuid('event_id').primaryKey(),
    payloadHash: varchar('payload_hash', { length: 64 }).notNull(),
    eventType: text('event_type').notNull(),
    schemaVersion: smallint('schema_version').notNull(),
    occurredAt: time('occurred_at').notNull(),
    receivedAt: time('received_at').notNull().defaultNow(),
    projectId: integer('project_id'),
    projectCode: varchar('project_code', { length: 8 }),
    decisionId: uuid('decision_id'),
    exposureId: uuid('exposure_id'),
    subjectKey: text('subject_key'),
    sessionKey: text('session_key'),
    region: text('region').notNull(),
    placement: text('placement'),
    component: text('component'),
    position: smallint('position'),
    payload: jsonb('payload').notNull(),
  }, table => [
    foreignKey({ name: 'ao_events_project_fk', columns: [table.projectId], foreignColumns: [projectId] }).onDelete('set null'),
    foreignKey({ name: 'ao_events_decision_fk', columns: [table.decisionId], foreignColumns: [decisions.id] }),
    foreignKey({ name: 'ao_events_exposure_fk', columns: [table.exposureId], foreignColumns: [exposures.id] }),
    check('ao_events_version_check', sql`${table.schemaVersion} = 1`),
    check('ao_events_region_check', sql`${table.region} IN ('nn','msk')`),
    check('ao_events_position_check', sql`${table.position} IS NULL OR ${table.position} BETWEEN 1 AND 6`),
    check('ao_events_type_check', sql`${table.eventType} IN ('ranking_assigned','project_impression','project_opened','project_liked','project_unliked','project_shared','form_opened','lead_accepted','lead_delivery_updated','regional_context_changed')`),
    index('ao_events_type_time_idx').on(table.eventType, table.occurredAt),
    index('ao_events_project_time_idx').on(table.projectId, table.occurredAt),
    index('ao_events_decision_time_idx').on(table.decisionId, table.occurredAt),
    index('ao_events_context_time_idx').on(table.subjectKey, table.sessionKey, table.occurredAt),
  ])
  return { optimization_config_versions: configVersions, optimization_decisions: decisions, optimization_assignment_heads: heads, optimization_decision_items: items, optimization_exposures: exposures, optimization_events: events }
}

export const registerOptimizationSchema: NonNullable<PostgresAdapterArgs['afterSchemaInit']>[number] = ({ schema }) => {
  const projectId = schema.tables.projects?.id as AnyPgColumn | undefined
  if (!projectId) throw new Error('Optimization schema requires projects.id')
  const tables = { ...optimizationTables(projectId), ...preferenceTables(projectId) }
  for (const name of Object.keys(tables)) if (schema.tables[name]) throw new Error(`Optimization table already registered: ${name}`)
  return { ...schema, tables: { ...schema.tables, ...tables } }
}
