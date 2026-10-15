import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { checkRepositoryMigrations, devMarkerDecision, migrationNames, rollbackViolations, upBody } from '../scripts/migration-policy.mjs'

const migrationsDir = path.resolve('src/migrations')
const namesSource = readFileSync(new URL('../src/config/required-migrations.ts', import.meta.url), 'utf8')
const requiredMigrations = [...namesSource.matchAll(/'([0-9]{8}_[^']+)'/g)].map((match) => match[1])

test('repository migrations stay rollback-safe and match the ready list', () => {
  const { names, problems } = checkRepositoryMigrations()
  assert.deepEqual(problems, [])
  assert.deepEqual(requiredMigrations, names)
  assert.deepEqual(migrationNames(readFileSync(path.join(migrationsDir, 'index.ts'), 'utf8')), names)
})

test('the promo migration only adds nullable columns, a new foreign key and a null backfill', () => {
  const promo = upBody(readFileSync(path.join(migrationsDir, '20261015_093000_promo_slot_action.ts'), 'utf8'))
  assert.deepEqual(rollbackViolations(promo), [])
})

test('constraint, type and existing-column changes are rejected', () => {
  assert.ok(rollbackViolations('ALTER TABLE "pages" ALTER COLUMN "title" DROP NOT NULL').length > 0)
  assert.ok(rollbackViolations('ALTER TABLE "pages" ADD CONSTRAINT "pages_fk" FOREIGN KEY ("id") REFERENCES "pages"("id") ON DELETE cascade').length > 0)
  assert.ok(rollbackViolations('ALTER TABLE "blocks_parts" ADD COLUMN "action" varchar NOT NULL').length > 0)
  assert.ok(rollbackViolations('ALTER TABLE "projects" ALTER COLUMN "code" SET DEFAULT \'x\'').length > 0)
  assert.ok(rollbackViolations('CREATE UNIQUE INDEX "projects_code_idx" ON "projects" ("code")').length > 0)
  assert.ok(rollbackViolations('CREATE TABLE "audit" ("id" serial PRIMARY KEY)').length > 0)
  assert.ok(rollbackViolations('UPDATE "pages" SET "title" = \'x\' WHERE "title" IS NULL').length > 0)
  assert.ok(rollbackViolations('ALTER TABLE "blocks_parts" DROP COLUMN "action"').length > 0)
})

test('a nullable column with a default can be rolled back to the previous CMS', () => {
  const sql = `
    CREATE TYPE "public"."enum_demo" AS ENUM('a');
    ALTER TABLE "blocks_parts" ADD COLUMN "action" "enum_demo" DEFAULT 'a';
    ALTER TABLE "blocks_parts" ADD COLUMN "form_id" integer;
    ALTER TABLE "blocks_parts" ADD CONSTRAINT "blocks_parts_form_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE set null;
    CREATE INDEX "blocks_parts_form_idx" ON "blocks_parts" USING btree ("form_id");
    UPDATE "blocks_parts" SET "action" = 'a' WHERE "key" LIKE 'hero.%' AND "action" IS NULL;
  `
  assert.deepEqual(rollbackViolations(sql), [])
})

test('dev marker is not an automatic release action', () => {
  const files = ['20261014_074208_initial_record_ids', '20261015_093000_promo_slot_action']
  assert.equal(devMarkerDecision([{ name: 'dev', batch: -1 }, { name: files[0], batch: 1 }], files).action, 'remove-marker')
  assert.equal(devMarkerDecision([{ name: files[0], batch: 1 }], files).action, 'none')
  assert.equal(devMarkerDecision([{ name: 'dev', batch: -1 }, { name: 'unknown', batch: 1 }], files).action, 'blocked')
  assert.equal(devMarkerDecision([{ name: 'other', batch: -1 }], files).action, 'blocked')
  assert.equal(devMarkerDecision([{ name: 'dev', batch: -1 }, { name: 'dev', batch: -1 }], files).action, 'blocked')
})
