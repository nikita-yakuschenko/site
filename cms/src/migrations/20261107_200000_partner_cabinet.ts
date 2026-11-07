import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "projects" ADD COLUMN "partner_cabinet_length_m" numeric;
  ALTER TABLE "projects" ADD COLUMN "partner_cabinet_width_m" numeric;
  ALTER TABLE "projects" ADD COLUMN "partner_cabinet_passport_url" varchar;
  ALTER TABLE "projects" ADD COLUMN "partner_cabinet_passport_note" varchar;
  ALTER TABLE "projects" ADD COLUMN "partner_cabinet_spec_url" varchar;
  ALTER TABLE "projects" ADD COLUMN "partner_cabinet_spec_note" varchar;
  ALTER TABLE "projects" ADD COLUMN "partner_cabinet_plan_url" varchar;
  ALTER TABLE "projects" ADD COLUMN "partner_cabinet_plan_note" varchar;
  ALTER TABLE "projects" ADD COLUMN "partner_cabinet_manual_url" varchar;
  ALTER TABLE "projects" ADD COLUMN "partner_cabinet_manual_note" varchar;
  ALTER TABLE "projects" ADD COLUMN "partner_cabinet_cargo_modules" varchar;
  ALTER TABLE "projects" ADD COLUMN "partner_cabinet_cargo_dimensions" varchar;
  ALTER TABLE "projects" ADD COLUMN "partner_cabinet_cargo_weight" varchar;
  ALTER TABLE "projects" ADD COLUMN "partner_cabinet_cargo_packing" varchar;
  ALTER TABLE "projects" ADD COLUMN "partner_cabinet_transport_method" varchar;
  ALTER TABLE "projects" ADD COLUMN "partner_cabinet_transport_lead" varchar;
  ALTER TABLE "projects" ADD COLUMN "partner_cabinet_transport_delivery" varchar;
  ALTER TABLE "projects" ADD COLUMN "partner_cabinet_transport_unloading" varchar;
  ALTER TABLE "projects" ADD COLUMN "partner_cabinet_transport_mounting" varchar;
  ALTER TABLE "_projects_v" ADD COLUMN "version_partner_cabinet_length_m" numeric;
  ALTER TABLE "_projects_v" ADD COLUMN "version_partner_cabinet_width_m" numeric;
  ALTER TABLE "_projects_v" ADD COLUMN "version_partner_cabinet_passport_url" varchar;
  ALTER TABLE "_projects_v" ADD COLUMN "version_partner_cabinet_passport_note" varchar;
  ALTER TABLE "_projects_v" ADD COLUMN "version_partner_cabinet_spec_url" varchar;
  ALTER TABLE "_projects_v" ADD COLUMN "version_partner_cabinet_spec_note" varchar;
  ALTER TABLE "_projects_v" ADD COLUMN "version_partner_cabinet_plan_url" varchar;
  ALTER TABLE "_projects_v" ADD COLUMN "version_partner_cabinet_plan_note" varchar;
  ALTER TABLE "_projects_v" ADD COLUMN "version_partner_cabinet_manual_url" varchar;
  ALTER TABLE "_projects_v" ADD COLUMN "version_partner_cabinet_manual_note" varchar;
  ALTER TABLE "_projects_v" ADD COLUMN "version_partner_cabinet_cargo_modules" varchar;
  ALTER TABLE "_projects_v" ADD COLUMN "version_partner_cabinet_cargo_dimensions" varchar;
  ALTER TABLE "_projects_v" ADD COLUMN "version_partner_cabinet_cargo_weight" varchar;
  ALTER TABLE "_projects_v" ADD COLUMN "version_partner_cabinet_cargo_packing" varchar;
  ALTER TABLE "_projects_v" ADD COLUMN "version_partner_cabinet_transport_method" varchar;
  ALTER TABLE "_projects_v" ADD COLUMN "version_partner_cabinet_transport_lead" varchar;
  ALTER TABLE "_projects_v" ADD COLUMN "version_partner_cabinet_transport_delivery" varchar;
  ALTER TABLE "_projects_v" ADD COLUMN "version_partner_cabinet_transport_unloading" varchar;
  ALTER TABLE "_projects_v" ADD COLUMN "version_partner_cabinet_transport_mounting" varchar;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "projects" DROP COLUMN "partner_cabinet_length_m";
  ALTER TABLE "projects" DROP COLUMN "partner_cabinet_width_m";
  ALTER TABLE "projects" DROP COLUMN "partner_cabinet_passport_url";
  ALTER TABLE "projects" DROP COLUMN "partner_cabinet_passport_note";
  ALTER TABLE "projects" DROP COLUMN "partner_cabinet_spec_url";
  ALTER TABLE "projects" DROP COLUMN "partner_cabinet_spec_note";
  ALTER TABLE "projects" DROP COLUMN "partner_cabinet_plan_url";
  ALTER TABLE "projects" DROP COLUMN "partner_cabinet_plan_note";
  ALTER TABLE "projects" DROP COLUMN "partner_cabinet_manual_url";
  ALTER TABLE "projects" DROP COLUMN "partner_cabinet_manual_note";
  ALTER TABLE "projects" DROP COLUMN "partner_cabinet_cargo_modules";
  ALTER TABLE "projects" DROP COLUMN "partner_cabinet_cargo_dimensions";
  ALTER TABLE "projects" DROP COLUMN "partner_cabinet_cargo_weight";
  ALTER TABLE "projects" DROP COLUMN "partner_cabinet_cargo_packing";
  ALTER TABLE "projects" DROP COLUMN "partner_cabinet_transport_method";
  ALTER TABLE "projects" DROP COLUMN "partner_cabinet_transport_lead";
  ALTER TABLE "projects" DROP COLUMN "partner_cabinet_transport_delivery";
  ALTER TABLE "projects" DROP COLUMN "partner_cabinet_transport_unloading";
  ALTER TABLE "projects" DROP COLUMN "partner_cabinet_transport_mounting";
  ALTER TABLE "_projects_v" DROP COLUMN "version_partner_cabinet_length_m";
  ALTER TABLE "_projects_v" DROP COLUMN "version_partner_cabinet_width_m";
  ALTER TABLE "_projects_v" DROP COLUMN "version_partner_cabinet_passport_url";
  ALTER TABLE "_projects_v" DROP COLUMN "version_partner_cabinet_passport_note";
  ALTER TABLE "_projects_v" DROP COLUMN "version_partner_cabinet_spec_url";
  ALTER TABLE "_projects_v" DROP COLUMN "version_partner_cabinet_spec_note";
  ALTER TABLE "_projects_v" DROP COLUMN "version_partner_cabinet_plan_url";
  ALTER TABLE "_projects_v" DROP COLUMN "version_partner_cabinet_plan_note";
  ALTER TABLE "_projects_v" DROP COLUMN "version_partner_cabinet_manual_url";
  ALTER TABLE "_projects_v" DROP COLUMN "version_partner_cabinet_manual_note";
  ALTER TABLE "_projects_v" DROP COLUMN "version_partner_cabinet_cargo_modules";
  ALTER TABLE "_projects_v" DROP COLUMN "version_partner_cabinet_cargo_dimensions";
  ALTER TABLE "_projects_v" DROP COLUMN "version_partner_cabinet_cargo_weight";
  ALTER TABLE "_projects_v" DROP COLUMN "version_partner_cabinet_cargo_packing";
  ALTER TABLE "_projects_v" DROP COLUMN "version_partner_cabinet_transport_method";
  ALTER TABLE "_projects_v" DROP COLUMN "version_partner_cabinet_transport_lead";
  ALTER TABLE "_projects_v" DROP COLUMN "version_partner_cabinet_transport_delivery";
  ALTER TABLE "_projects_v" DROP COLUMN "version_partner_cabinet_transport_unloading";
  ALTER TABLE "_projects_v" DROP COLUMN "version_partner_cabinet_transport_mounting";`)
}
