import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "lead_delivery" ADD COLUMN "delivery_enabled" boolean DEFAULT true;
  ALTER TABLE "lead_delivery" ADD COLUMN "roistat_webhook_url" varchar;
  ALTER TABLE "lead_delivery" ADD COLUMN "roistat_counters" jsonb;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "lead_delivery" DROP COLUMN "delivery_enabled";
  ALTER TABLE "lead_delivery" DROP COLUMN "roistat_webhook_url";
  ALTER TABLE "lead_delivery" DROP COLUMN "roistat_counters";`)
}
