import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  CREATE TYPE "public"."enum_blocks_parts_action" AS ENUM('link', 'form');
  CREATE TYPE "public"."enum_forms_parts_action" AS ENUM('link', 'form');
  ALTER TABLE "blocks_parts" ADD COLUMN "action" "enum_blocks_parts_action" DEFAULT 'form';
  ALTER TABLE "blocks_parts" ADD COLUMN "link" varchar;
  ALTER TABLE "blocks_parts" ADD COLUMN "form_id" integer;
  ALTER TABLE "forms_parts" ADD COLUMN "action" "enum_forms_parts_action" DEFAULT 'form';
  ALTER TABLE "forms_parts" ADD COLUMN "link" varchar;
  ALTER TABLE "forms_parts" ADD COLUMN "form_id" integer;
  ALTER TABLE "blocks_parts" ADD CONSTRAINT "blocks_parts_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "forms_parts" ADD CONSTRAINT "forms_parts_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "blocks_parts_form_idx" ON "blocks_parts" USING btree ("form_id");
  CREATE INDEX "forms_parts_form_idx" ON "forms_parts" USING btree ("form_id");
  UPDATE "blocks_parts" SET "action" = 'form' WHERE "key" LIKE 'hero.promo.%' AND "action" IS NULL;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "blocks_parts" DROP CONSTRAINT "blocks_parts_form_id_forms_id_fk";
  ALTER TABLE "forms_parts" DROP CONSTRAINT "forms_parts_form_id_forms_id_fk";
  DROP INDEX "blocks_parts_form_idx";
  DROP INDEX "forms_parts_form_idx";
  ALTER TABLE "blocks_parts" DROP COLUMN "action";
  ALTER TABLE "blocks_parts" DROP COLUMN "link";
  ALTER TABLE "blocks_parts" DROP COLUMN "form_id";
  ALTER TABLE "forms_parts" DROP COLUMN "action";
  ALTER TABLE "forms_parts" DROP COLUMN "link";
  ALTER TABLE "forms_parts" DROP COLUMN "form_id";
  DROP TYPE "public"."enum_blocks_parts_action";
  DROP TYPE "public"."enum_forms_parts_action";`)
}
