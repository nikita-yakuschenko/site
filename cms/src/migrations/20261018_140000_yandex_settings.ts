import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "lead_delivery" ADD COLUMN "metrica_enabled" boolean DEFAULT true;
  ALTER TABLE "lead_delivery" ADD COLUMN "metrica_counter_id" varchar;
  ALTER TABLE "lead_delivery" ADD COLUMN "metrica_connected_at" varchar;
  ALTER TABLE "lead_delivery" ADD COLUMN "maps_enabled" boolean DEFAULT true;
  ALTER TABLE "lead_delivery" ADD COLUMN "maps_api_key" varchar;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "lead_delivery" DROP COLUMN "metrica_enabled";
  ALTER TABLE "lead_delivery" DROP COLUMN "metrica_counter_id";
  ALTER TABLE "lead_delivery" DROP COLUMN "metrica_connected_at";
  ALTER TABLE "lead_delivery" DROP COLUMN "maps_enabled";
  ALTER TABLE "lead_delivery" DROP COLUMN "maps_api_key";`)
}
