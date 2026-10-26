import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_lead_submissions_lead_type" AS ENUM ('work', 'test', 'spam');
    CREATE TYPE "public"."enum_lead_submissions_type_source" AS ENUM ('auto', 'manual');
    ALTER TABLE "lead_submissions" ADD COLUMN "lead_type" "enum_lead_submissions_lead_type" DEFAULT 'work';
    ALTER TABLE "lead_submissions" ADD COLUMN "type_source" "enum_lead_submissions_type_source" DEFAULT 'auto';
    ALTER TABLE "lead_submissions" ADD COLUMN "type_reason" varchar;
  `)
}
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "lead_submissions" DROP COLUMN "lead_type", DROP COLUMN "type_source", DROP COLUMN "type_reason";
    DROP TYPE "public"."enum_lead_submissions_lead_type";
    DROP TYPE "public"."enum_lead_submissions_type_source";
  `)
}
