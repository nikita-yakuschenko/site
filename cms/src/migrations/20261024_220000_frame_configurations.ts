import { sql, type MigrateUpArgs, type MigrateDownArgs } from '@payloadcms/db-postgres'
import { randomUUID } from 'node:crypto'
import { defaultConfigurationTemplates } from '../../../src/lib/catalog/configuration-content'

export async function up({ db }: MigrateUpArgs) {
  await db.execute(sql`
CREATE TABLE "cfg_f_start_inc" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );

CREATE TABLE "cfg_f_start_gift" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );

CREATE TABLE "cfg_f_start_dtl_itm" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );

CREATE TABLE "cfg_f_start_grp_itm" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );

CREATE TABLE "cfg_f_start_grp" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar
  );

CREATE TABLE "cfg_f_start_dtl" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"lead" varchar
  );

CREATE TABLE "cfg_f_standard_inc" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );

CREATE TABLE "cfg_f_standard_gift" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );

CREATE TABLE "cfg_f_standard_dtl_itm" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );

CREATE TABLE "cfg_f_standard_grp_itm" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );

CREATE TABLE "cfg_f_standard_grp" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar
  );

CREATE TABLE "cfg_f_standard_dtl" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"lead" varchar
  );

CREATE TABLE "cfg_f_project_inc" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );

CREATE TABLE "cfg_f_project_gift" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );

CREATE TABLE "cfg_f_project_dtl_itm" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );

CREATE TABLE "cfg_f_project_grp_itm" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );

CREATE TABLE "cfg_f_project_grp" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar
  );

CREATE TABLE "cfg_f_project_dtl" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"lead" varchar
  );

ALTER TABLE "cfg_f_start_inc" ADD CONSTRAINT "cfg_f_start_inc_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "cfg_f_start_gift" ADD CONSTRAINT "cfg_f_start_gift_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "cfg_f_start_dtl_itm" ADD CONSTRAINT "cfg_f_start_dtl_itm_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cfg_f_start_dtl"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "cfg_f_start_grp_itm" ADD CONSTRAINT "cfg_f_start_grp_itm_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cfg_f_start_grp"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "cfg_f_start_grp" ADD CONSTRAINT "cfg_f_start_grp_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cfg_f_start_dtl"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "cfg_f_start_dtl" ADD CONSTRAINT "cfg_f_start_dtl_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "cfg_f_standard_inc" ADD CONSTRAINT "cfg_f_standard_inc_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "cfg_f_standard_gift" ADD CONSTRAINT "cfg_f_standard_gift_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "cfg_f_standard_dtl_itm" ADD CONSTRAINT "cfg_f_standard_dtl_itm_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cfg_f_standard_dtl"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "cfg_f_standard_grp_itm" ADD CONSTRAINT "cfg_f_standard_grp_itm_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cfg_f_standard_grp"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "cfg_f_standard_grp" ADD CONSTRAINT "cfg_f_standard_grp_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cfg_f_standard_dtl"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "cfg_f_standard_dtl" ADD CONSTRAINT "cfg_f_standard_dtl_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "cfg_f_project_inc" ADD CONSTRAINT "cfg_f_project_inc_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "cfg_f_project_gift" ADD CONSTRAINT "cfg_f_project_gift_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "cfg_f_project_dtl_itm" ADD CONSTRAINT "cfg_f_project_dtl_itm_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cfg_f_project_dtl"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "cfg_f_project_grp_itm" ADD CONSTRAINT "cfg_f_project_grp_itm_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cfg_f_project_grp"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "cfg_f_project_grp" ADD CONSTRAINT "cfg_f_project_grp_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cfg_f_project_dtl"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "cfg_f_project_dtl" ADD CONSTRAINT "cfg_f_project_dtl_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX "cfg_f_start_inc_order_idx" ON "cfg_f_start_inc" USING btree ("_order");

CREATE INDEX "cfg_f_start_inc_parent_id_idx" ON "cfg_f_start_inc" USING btree ("_parent_id");

CREATE INDEX "cfg_f_start_gift_order_idx" ON "cfg_f_start_gift" USING btree ("_order");

CREATE INDEX "cfg_f_start_gift_parent_id_idx" ON "cfg_f_start_gift" USING btree ("_parent_id");

CREATE INDEX "cfg_f_start_dtl_itm_order_idx" ON "cfg_f_start_dtl_itm" USING btree ("_order");

CREATE INDEX "cfg_f_start_dtl_itm_parent_id_idx" ON "cfg_f_start_dtl_itm" USING btree ("_parent_id");

CREATE INDEX "cfg_f_start_grp_itm_order_idx" ON "cfg_f_start_grp_itm" USING btree ("_order");

CREATE INDEX "cfg_f_start_grp_itm_parent_id_idx" ON "cfg_f_start_grp_itm" USING btree ("_parent_id");

CREATE INDEX "cfg_f_start_grp_order_idx" ON "cfg_f_start_grp" USING btree ("_order");

CREATE INDEX "cfg_f_start_grp_parent_id_idx" ON "cfg_f_start_grp" USING btree ("_parent_id");

CREATE INDEX "cfg_f_start_dtl_order_idx" ON "cfg_f_start_dtl" USING btree ("_order");

CREATE INDEX "cfg_f_start_dtl_parent_id_idx" ON "cfg_f_start_dtl" USING btree ("_parent_id");

CREATE INDEX "cfg_f_standard_inc_order_idx" ON "cfg_f_standard_inc" USING btree ("_order");

CREATE INDEX "cfg_f_standard_inc_parent_id_idx" ON "cfg_f_standard_inc" USING btree ("_parent_id");

CREATE INDEX "cfg_f_standard_gift_order_idx" ON "cfg_f_standard_gift" USING btree ("_order");

CREATE INDEX "cfg_f_standard_gift_parent_id_idx" ON "cfg_f_standard_gift" USING btree ("_parent_id");

CREATE INDEX "cfg_f_standard_dtl_itm_order_idx" ON "cfg_f_standard_dtl_itm" USING btree ("_order");

CREATE INDEX "cfg_f_standard_dtl_itm_parent_id_idx" ON "cfg_f_standard_dtl_itm" USING btree ("_parent_id");

CREATE INDEX "cfg_f_standard_grp_itm_order_idx" ON "cfg_f_standard_grp_itm" USING btree ("_order");

CREATE INDEX "cfg_f_standard_grp_itm_parent_id_idx" ON "cfg_f_standard_grp_itm" USING btree ("_parent_id");

CREATE INDEX "cfg_f_standard_grp_order_idx" ON "cfg_f_standard_grp" USING btree ("_order");

CREATE INDEX "cfg_f_standard_grp_parent_id_idx" ON "cfg_f_standard_grp" USING btree ("_parent_id");

CREATE INDEX "cfg_f_standard_dtl_order_idx" ON "cfg_f_standard_dtl" USING btree ("_order");

CREATE INDEX "cfg_f_standard_dtl_parent_id_idx" ON "cfg_f_standard_dtl" USING btree ("_parent_id");

CREATE INDEX "cfg_f_project_inc_order_idx" ON "cfg_f_project_inc" USING btree ("_order");

CREATE INDEX "cfg_f_project_inc_parent_id_idx" ON "cfg_f_project_inc" USING btree ("_parent_id");

CREATE INDEX "cfg_f_project_gift_order_idx" ON "cfg_f_project_gift" USING btree ("_order");

CREATE INDEX "cfg_f_project_gift_parent_id_idx" ON "cfg_f_project_gift" USING btree ("_parent_id");

CREATE INDEX "cfg_f_project_dtl_itm_order_idx" ON "cfg_f_project_dtl_itm" USING btree ("_order");

CREATE INDEX "cfg_f_project_dtl_itm_parent_id_idx" ON "cfg_f_project_dtl_itm" USING btree ("_parent_id");

CREATE INDEX "cfg_f_project_grp_itm_order_idx" ON "cfg_f_project_grp_itm" USING btree ("_order");

CREATE INDEX "cfg_f_project_grp_itm_parent_id_idx" ON "cfg_f_project_grp_itm" USING btree ("_parent_id");

CREATE INDEX "cfg_f_project_grp_order_idx" ON "cfg_f_project_grp" USING btree ("_order");

CREATE INDEX "cfg_f_project_grp_parent_id_idx" ON "cfg_f_project_grp" USING btree ("_parent_id");

CREATE INDEX "cfg_f_project_dtl_order_idx" ON "cfg_f_project_dtl" USING btree ("_order");

CREATE INDEX "cfg_f_project_dtl_parent_id_idx" ON "cfg_f_project_dtl" USING btree ("_parent_id");

ALTER TABLE "blocks" ADD COLUMN "configuration_templates_frame_start_lead" varchar DEFAULT 'Заводская точность, свобода дальнейших решений.';

ALTER TABLE "blocks" ADD COLUMN "configuration_templates_frame_start_includes_title" varchar DEFAULT 'Всё необходимое для начала:';

ALTER TABLE "blocks" ADD COLUMN "configuration_templates_frame_standard_lead" varchar DEFAULT 'Готовый снаружи, ваш замысел внутри.';

ALTER TABLE "blocks" ADD COLUMN "configuration_templates_frame_standard_includes_title" varchar DEFAULT 'Дополнительно к Стартовой комплектации вы получаете:';

ALTER TABLE "blocks" ADD COLUMN "configuration_templates_frame_project_lead" varchar DEFAULT 'Архитектура дома раскрыта в деталях.';

ALTER TABLE "blocks" ADD COLUMN "configuration_templates_frame_project_includes_title" varchar DEFAULT 'Дополнительно к Стандартной комплектации вы получаете:';
`)
  // Write exclusively to the new frame tables. Saving the whole block through
  // Payload would also rewrite unrelated technology arrays and their ordering.
  const blocks = await db.execute(sql`SELECT id FROM blocks WHERE key='ProjectConfig'`)
  const textRows = async (table: string, parent: number | string, rows: { text: string }[] = []) => {
    for (const [index, row] of rows.entries()) await db.execute(sql`INSERT INTO ${sql.identifier(table)} ("_order", "_parent_id", "id", "text") VALUES (${index + 1}, ${parent}, ${randomUUID()}, ${row.text})`)
  }
  for (const block of blocks.rows as { id: number }[]) for (const [key, tier] of Object.entries(defaultConfigurationTemplates().frame)) {
    const prefix = `cfg_f_${key}`
    await textRows(`${prefix}_inc`, block.id, tier.includes)
    await textRows(`${prefix}_gift`, block.id, tier.gifts)
    for (const [index, detail] of tier.details.entries()) {
      const id = randomUUID()
      await db.execute(sql`INSERT INTO ${sql.identifier(`${prefix}_dtl`)} ("_order", "_parent_id", "id", "title", "lead") VALUES (${index + 1}, ${block.id}, ${id}, ${detail.title}, ${detail.lead ?? null})`)
      await textRows(`${prefix}_dtl_itm`, id, detail.items)
      for (const [groupIndex, group] of (detail.groups || []).entries()) {
        const groupID = randomUUID()
        await db.execute(sql`INSERT INTO ${sql.identifier(`${prefix}_grp`)} ("_order", "_parent_id", "id", "title") VALUES (${groupIndex + 1}, ${id}, ${groupID}, ${group.title})`)
        await textRows(`${prefix}_grp_itm`, groupID, group.items)
      }
    }
  }
}

export async function down({ db }: MigrateDownArgs) {
  await db.execute(sql`
DROP TABLE IF EXISTS "cfg_f_project_dtl" CASCADE;
DROP TABLE IF EXISTS "cfg_f_project_grp" CASCADE;
DROP TABLE IF EXISTS "cfg_f_project_grp_itm" CASCADE;
DROP TABLE IF EXISTS "cfg_f_project_dtl_itm" CASCADE;
DROP TABLE IF EXISTS "cfg_f_project_gift" CASCADE;
DROP TABLE IF EXISTS "cfg_f_project_inc" CASCADE;
DROP TABLE IF EXISTS "cfg_f_standard_dtl" CASCADE;
DROP TABLE IF EXISTS "cfg_f_standard_grp" CASCADE;
DROP TABLE IF EXISTS "cfg_f_standard_grp_itm" CASCADE;
DROP TABLE IF EXISTS "cfg_f_standard_dtl_itm" CASCADE;
DROP TABLE IF EXISTS "cfg_f_standard_gift" CASCADE;
DROP TABLE IF EXISTS "cfg_f_standard_inc" CASCADE;
DROP TABLE IF EXISTS "cfg_f_start_dtl" CASCADE;
DROP TABLE IF EXISTS "cfg_f_start_grp" CASCADE;
DROP TABLE IF EXISTS "cfg_f_start_grp_itm" CASCADE;
DROP TABLE IF EXISTS "cfg_f_start_dtl_itm" CASCADE;
DROP TABLE IF EXISTS "cfg_f_start_gift" CASCADE;
DROP TABLE IF EXISTS "cfg_f_start_inc" CASCADE;
ALTER TABLE "blocks" DROP COLUMN IF EXISTS "configuration_templates_frame_start_lead";
ALTER TABLE "blocks" DROP COLUMN IF EXISTS "configuration_templates_frame_start_includes_title";
ALTER TABLE "blocks" DROP COLUMN IF EXISTS "configuration_templates_frame_standard_lead";
ALTER TABLE "blocks" DROP COLUMN IF EXISTS "configuration_templates_frame_standard_includes_title";
ALTER TABLE "blocks" DROP COLUMN IF EXISTS "configuration_templates_frame_project_lead";
ALTER TABLE "blocks" DROP COLUMN IF EXISTS "configuration_templates_frame_project_includes_title";
`)
}
