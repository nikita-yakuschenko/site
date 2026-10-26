import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'
import { detectLeadType } from '../config/lead-classification'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_lead_submissions_lead_type" AS ENUM ('work', 'test', 'spam');
    CREATE TYPE "public"."enum_lead_submissions_type_source" AS ENUM ('auto', 'manual');
    ALTER TABLE "lead_submissions" ADD COLUMN "lead_type" "enum_lead_submissions_lead_type" DEFAULT 'work';
    ALTER TABLE "lead_submissions" ADD COLUMN "type_source" "enum_lead_submissions_type_source" DEFAULT 'auto';
    ALTER TABLE "lead_submissions" ADD COLUMN "type_reason" varchar;
  `)
  const existing = await db.execute(sql`SELECT id, payload FROM lead_submissions`)
  for (const row of existing.rows as { id: number; payload: unknown }[]) {
    const classification = detectLeadType(row.payload)
    await db.execute(sql`UPDATE lead_submissions SET lead_type = ${classification.leadType}, type_reason = ${classification.typeReason} WHERE id = ${row.id}`)
  }
}
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "lead_submissions" DROP COLUMN "lead_type", DROP COLUMN "type_source", DROP COLUMN "type_reason";
    DROP TYPE "public"."enum_lead_submissions_lead_type";
    DROP TYPE "public"."enum_lead_submissions_type_source";
  `)
}
