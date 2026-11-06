import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "lead_delivery" ADD COLUMN "max_enabled" boolean DEFAULT true;
  ALTER TABLE "lead_delivery" ADD COLUMN "max_url" varchar;
  ALTER TABLE "lead_delivery" ADD COLUMN "telegram_enabled" boolean DEFAULT true;
  ALTER TABLE "lead_delivery" ADD COLUMN "telegram_url" varchar;
  ALTER TABLE "lead_delivery" ADD COLUMN "whatsapp_enabled" boolean DEFAULT true;
  ALTER TABLE "lead_delivery" ADD COLUMN "whatsapp_phone" varchar;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "lead_delivery" DROP COLUMN "max_enabled";
  ALTER TABLE "lead_delivery" DROP COLUMN "max_url";
  ALTER TABLE "lead_delivery" DROP COLUMN "telegram_enabled";
  ALTER TABLE "lead_delivery" DROP COLUMN "telegram_url";
  ALTER TABLE "lead_delivery" DROP COLUMN "whatsapp_enabled";
  ALTER TABLE "lead_delivery" DROP COLUMN "whatsapp_phone";`)
}
