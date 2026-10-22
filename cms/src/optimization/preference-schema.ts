import { sql } from '@payloadcms/db-postgres'
import { boolean, check, foreignKey, index, integer, jsonb, pgTable, text, timestamp, unique, uuid, varchar, type AnyPgColumn } from '@payloadcms/db-postgres/drizzle/pg-core'

const time = (name: string) => timestamp(name, { withTimezone: true, precision: 3, mode: 'date' })
export function preferenceTables(projectId: AnyPgColumn) {
  const baselines = pgTable('project_like_baselines', {
    projectId: integer('project_id').primaryKey(),
    baselineCount: integer('baseline_count').notNull(),
    newActiveCount: integer('new_active_count').notNull().default(0),
    retiredLegacyCount: integer('retired_legacy_count').notNull().default(0),
    evidenceHash: varchar('evidence_hash', { length: 64 }).notNull(),
    reconciliationVersion: text('reconciliation_version').notNull(),
    capturedAt: time('captured_at').notNull().defaultNow(),
  }, t => [
    foreignKey({ name: 'ao_like_baselines_project_fk', columns: [t.projectId], foreignColumns: [projectId] }).onDelete('cascade'),
    check('ao_like_baselines_counts_check', sql`${t.baselineCount} >= 0 AND ${t.newActiveCount} >= 0 AND ${t.retiredLegacyCount} BETWEEN 0 AND ${t.baselineCount}`),
  ])
  const likes = pgTable('project_likes', {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: integer('project_id').notNull(),
    subjectKey: varchar('subject_key', { length: 64 }).notNull(),
    liked: boolean('liked').notNull(),
    revision: integer('revision').notNull().default(0),
    contribution: text('contribution').notNull(),
    source: text('source').notNull(),
    migrationMarker: uuid('migration_marker'),
    updatedAt: time('updated_at').notNull().defaultNow(),
  }, t => [
    foreignKey({ name: 'ao_likes_project_fk', columns: [t.projectId], foreignColumns: [projectId] }).onDelete('cascade'),
    unique('ao_likes_subject_project_unique').on(t.projectId, t.subjectKey),
    check('ao_likes_revision_check', sql`${t.revision} >= 0`),
    check('ao_likes_contribution_check', sql`${t.contribution} IN ('new','legacy','pending')`),
    index('ao_likes_subject_active_idx').on(t.subjectKey, t.projectId).where(sql`${t.liked}`),
  ])
  const operations = pgTable('project_like_operations', {
    id: uuid('id').primaryKey().defaultRandom(),
    operationId: uuid('operation_id').notNull(),
    subjectKey: varchar('subject_key', { length: 64 }).notNull(),
    bodyHash: varchar('body_hash', { length: 64 }).notNull(),
    response: jsonb('response').notNull(),
    createdAt: time('created_at').notNull().defaultNow(),
  }, t => [unique('ao_like_operations_subject_unique').on(t.subjectKey, t.operationId)])
  const claims = pgTable('project_like_legacy_claims', {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: integer('project_id').notNull(),
    keyHash: varchar('key_hash', { length: 64 }).notNull(),
    subjectKey: varchar('subject_key', { length: 64 }).notNull(),
    claimedAt: time('claimed_at').notNull().defaultNow(),
  }, t => [
    foreignKey({ name: 'ao_like_claims_project_fk', columns: [t.projectId], foreignColumns: [projectId] }).onDelete('cascade'),
    unique('ao_like_claims_key_unique').on(t.projectId, t.keyHash),
  ])
  const batches = pgTable('project_like_migration_batches', {
    id: uuid('id').primaryKey().defaultRandom(),
    migrationId: uuid('migration_id').notNull(),
    subjectKey: varchar('subject_key', { length: 64 }).notNull(),
    bodyHash: varchar('body_hash', { length: 64 }).notNull(),
    response: jsonb('response').notNull(),
    createdAt: time('created_at').notNull().defaultNow(),
  }, t => [unique('ao_like_batches_subject_unique').on(t.subjectKey, t.migrationId)])
  return { project_like_baselines: baselines, project_likes: likes, project_like_operations: operations, project_like_legacy_claims: claims, project_like_migration_batches: batches }
}
