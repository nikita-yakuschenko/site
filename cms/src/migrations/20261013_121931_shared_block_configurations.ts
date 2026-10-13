import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'
import { defaultConfigurationTemplates } from '../../../src/lib/catalog/configuration-content'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "cfg_p_start_inc" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "text" varchar
  );

  CREATE TABLE "cfg_p_start_gift" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "text" varchar
  );

  CREATE TABLE "cfg_p_start_dtl_itm" (
    "_order" integer NOT NULL,
    "_parent_id" varchar NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "text" varchar
  );

  CREATE TABLE "cfg_p_start_grp_itm" (
    "_order" integer NOT NULL,
    "_parent_id" varchar NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "text" varchar
  );

  CREATE TABLE "cfg_p_start_grp" (
    "_order" integer NOT NULL,
    "_parent_id" varchar NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "title" varchar
  );

  CREATE TABLE "cfg_p_start_dtl" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "title" varchar,
    "lead" varchar
  );

  CREATE TABLE "cfg_p_standard_inc" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "text" varchar
  );

  CREATE TABLE "cfg_p_standard_gift" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "text" varchar
  );

  CREATE TABLE "cfg_p_standard_dtl_itm" (
    "_order" integer NOT NULL,
    "_parent_id" varchar NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "text" varchar
  );

  CREATE TABLE "cfg_p_standard_grp_itm" (
    "_order" integer NOT NULL,
    "_parent_id" varchar NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "text" varchar
  );

  CREATE TABLE "cfg_p_standard_grp" (
    "_order" integer NOT NULL,
    "_parent_id" varchar NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "title" varchar
  );

  CREATE TABLE "cfg_p_standard_dtl" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "title" varchar,
    "lead" varchar
  );

  CREATE TABLE "cfg_p_project_inc" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "text" varchar
  );

  CREATE TABLE "cfg_p_project_gift" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "text" varchar
  );

  CREATE TABLE "cfg_p_project_dtl_itm" (
    "_order" integer NOT NULL,
    "_parent_id" varchar NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "text" varchar
  );

  CREATE TABLE "cfg_p_project_grp_itm" (
    "_order" integer NOT NULL,
    "_parent_id" varchar NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "text" varchar
  );

  CREATE TABLE "cfg_p_project_grp" (
    "_order" integer NOT NULL,
    "_parent_id" varchar NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "title" varchar
  );

  CREATE TABLE "cfg_p_project_dtl" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "title" varchar,
    "lead" varchar
  );

  CREATE TABLE "cfg_m_standard_inc" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "text" varchar
  );

  CREATE TABLE "cfg_m_standard_gift" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "text" varchar
  );

  CREATE TABLE "cfg_m_standard_dtl_itm" (
    "_order" integer NOT NULL,
    "_parent_id" varchar NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "text" varchar
  );

  CREATE TABLE "cfg_m_standard_grp_itm" (
    "_order" integer NOT NULL,
    "_parent_id" varchar NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "text" varchar
  );

  CREATE TABLE "cfg_m_standard_grp" (
    "_order" integer NOT NULL,
    "_parent_id" varchar NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "title" varchar
  );

  CREATE TABLE "cfg_m_standard_dtl" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "title" varchar,
    "lead" varchar
  );

  CREATE TABLE "cfg_m_project_inc" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "text" varchar
  );

  CREATE TABLE "cfg_m_project_gift" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "text" varchar
  );

  CREATE TABLE "cfg_m_project_dtl_itm" (
    "_order" integer NOT NULL,
    "_parent_id" varchar NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "text" varchar
  );

  CREATE TABLE "cfg_m_project_grp_itm" (
    "_order" integer NOT NULL,
    "_parent_id" varchar NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "text" varchar
  );

  CREATE TABLE "cfg_m_project_grp" (
    "_order" integer NOT NULL,
    "_parent_id" varchar NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "title" varchar
  );

  CREATE TABLE "cfg_m_project_dtl" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "title" varchar,
    "lead" varchar
  );

  CREATE TABLE "cfg_m_turnkey_inc" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "text" varchar
  );

  CREATE TABLE "cfg_m_turnkey_gift" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "text" varchar
  );

  CREATE TABLE "cfg_m_turnkey_dtl_itm" (
    "_order" integer NOT NULL,
    "_parent_id" varchar NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "text" varchar
  );

  CREATE TABLE "cfg_m_turnkey_grp_itm" (
    "_order" integer NOT NULL,
    "_parent_id" varchar NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "text" varchar
  );

  CREATE TABLE "cfg_m_turnkey_grp" (
    "_order" integer NOT NULL,
    "_parent_id" varchar NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "title" varchar
  );

  CREATE TABLE "cfg_m_turnkey_dtl" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "title" varchar,
    "lead" varchar
  );

  ALTER TABLE "blocks_parts" ALTER COLUMN "key" DROP NOT NULL;
  ALTER TABLE "blocks_parts" ALTER COLUMN "title" DROP NOT NULL;
  ALTER TABLE "blocks" ALTER COLUMN "key" DROP NOT NULL;
  ALTER TABLE "blocks" ALTER COLUMN "source" DROP NOT NULL;
  ALTER TABLE "forms_parts" ALTER COLUMN "key" DROP NOT NULL;
  ALTER TABLE "forms_parts" ALTER COLUMN "title" DROP NOT NULL;
  ALTER TABLE "forms" ALTER COLUMN "key" DROP NOT NULL;
  ALTER TABLE "forms" ALTER COLUMN "source" DROP NOT NULL;
  ALTER TABLE "blocks" ADD COLUMN "configuration_templates_panel_start_lead" varchar DEFAULT 'Основа дома. Силовой каркас с утеплением из сухой строганой доски. Изготавливаем на своём производстве.';
  ALTER TABLE "blocks" ADD COLUMN "configuration_templates_panel_standard_lead" varchar DEFAULT 'Завершённый образ дома. Силовой каркас, кровля, окна и входные двери, наружная отделка.';
  ALTER TABLE "blocks" ADD COLUMN "configuration_templates_panel_project_lead" varchar DEFAULT 'Архитектура дома выполнена согласно проекту: большие окна, терраса и внутренняя отделка стен.';
  ALTER TABLE "blocks" ADD COLUMN "configuration_templates_modular_standard_lead" varchar DEFAULT 'Завершённый образ дома. Силовой каркас, кровля, окна и входные двери, наружная отделка.';
  ALTER TABLE "blocks" ADD COLUMN "configuration_templates_modular_project_lead" varchar DEFAULT 'Архитектура дома выполнена согласно проекту: большие окна, терраса и внутренняя отделка стен.';
  ALTER TABLE "blocks" ADD COLUMN "configuration_templates_modular_turnkey_lead" varchar DEFAULT 'Чистовая отделка стен, потолков и пола, в ванной — керамогранит, подключены инженерные коммуникации и электрика. Вам остаётся только выбрать мебель.';
  ALTER TABLE "cfg_p_start_inc" ADD CONSTRAINT "cfg_p_start_inc_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_p_start_gift" ADD CONSTRAINT "cfg_p_start_gift_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_p_start_dtl_itm" ADD CONSTRAINT "cfg_p_start_dtl_itm_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cfg_p_start_dtl"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_p_start_grp_itm" ADD CONSTRAINT "cfg_p_start_grp_itm_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cfg_p_start_grp"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_p_start_grp" ADD CONSTRAINT "cfg_p_start_grp_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cfg_p_start_dtl"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_p_start_dtl" ADD CONSTRAINT "cfg_p_start_dtl_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_p_standard_inc" ADD CONSTRAINT "cfg_p_standard_inc_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_p_standard_gift" ADD CONSTRAINT "cfg_p_standard_gift_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_p_standard_dtl_itm" ADD CONSTRAINT "cfg_p_standard_dtl_itm_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cfg_p_standard_dtl"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_p_standard_grp_itm" ADD CONSTRAINT "cfg_p_standard_grp_itm_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cfg_p_standard_grp"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_p_standard_grp" ADD CONSTRAINT "cfg_p_standard_grp_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cfg_p_standard_dtl"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_p_standard_dtl" ADD CONSTRAINT "cfg_p_standard_dtl_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_p_project_inc" ADD CONSTRAINT "cfg_p_project_inc_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_p_project_gift" ADD CONSTRAINT "cfg_p_project_gift_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_p_project_dtl_itm" ADD CONSTRAINT "cfg_p_project_dtl_itm_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cfg_p_project_dtl"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_p_project_grp_itm" ADD CONSTRAINT "cfg_p_project_grp_itm_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cfg_p_project_grp"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_p_project_grp" ADD CONSTRAINT "cfg_p_project_grp_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cfg_p_project_dtl"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_p_project_dtl" ADD CONSTRAINT "cfg_p_project_dtl_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_m_standard_inc" ADD CONSTRAINT "cfg_m_standard_inc_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_m_standard_gift" ADD CONSTRAINT "cfg_m_standard_gift_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_m_standard_dtl_itm" ADD CONSTRAINT "cfg_m_standard_dtl_itm_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cfg_m_standard_dtl"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_m_standard_grp_itm" ADD CONSTRAINT "cfg_m_standard_grp_itm_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cfg_m_standard_grp"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_m_standard_grp" ADD CONSTRAINT "cfg_m_standard_grp_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cfg_m_standard_dtl"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_m_standard_dtl" ADD CONSTRAINT "cfg_m_standard_dtl_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_m_project_inc" ADD CONSTRAINT "cfg_m_project_inc_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_m_project_gift" ADD CONSTRAINT "cfg_m_project_gift_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_m_project_dtl_itm" ADD CONSTRAINT "cfg_m_project_dtl_itm_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cfg_m_project_dtl"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_m_project_grp_itm" ADD CONSTRAINT "cfg_m_project_grp_itm_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cfg_m_project_grp"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_m_project_grp" ADD CONSTRAINT "cfg_m_project_grp_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cfg_m_project_dtl"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_m_project_dtl" ADD CONSTRAINT "cfg_m_project_dtl_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_m_turnkey_inc" ADD CONSTRAINT "cfg_m_turnkey_inc_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_m_turnkey_gift" ADD CONSTRAINT "cfg_m_turnkey_gift_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_m_turnkey_dtl_itm" ADD CONSTRAINT "cfg_m_turnkey_dtl_itm_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cfg_m_turnkey_dtl"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_m_turnkey_grp_itm" ADD CONSTRAINT "cfg_m_turnkey_grp_itm_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cfg_m_turnkey_grp"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_m_turnkey_grp" ADD CONSTRAINT "cfg_m_turnkey_grp_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cfg_m_turnkey_dtl"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_m_turnkey_dtl" ADD CONSTRAINT "cfg_m_turnkey_dtl_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "cfg_p_start_inc_order_idx" ON "cfg_p_start_inc" USING btree ("_order");
  CREATE INDEX "cfg_p_start_inc_parent_id_idx" ON "cfg_p_start_inc" USING btree ("_parent_id");
  CREATE INDEX "cfg_p_start_gift_order_idx" ON "cfg_p_start_gift" USING btree ("_order");
  CREATE INDEX "cfg_p_start_gift_parent_id_idx" ON "cfg_p_start_gift" USING btree ("_parent_id");
  CREATE INDEX "cfg_p_start_dtl_itm_order_idx" ON "cfg_p_start_dtl_itm" USING btree ("_order");
  CREATE INDEX "cfg_p_start_dtl_itm_parent_id_idx" ON "cfg_p_start_dtl_itm" USING btree ("_parent_id");
  CREATE INDEX "cfg_p_start_grp_itm_order_idx" ON "cfg_p_start_grp_itm" USING btree ("_order");
  CREATE INDEX "cfg_p_start_grp_itm_parent_id_idx" ON "cfg_p_start_grp_itm" USING btree ("_parent_id");
  CREATE INDEX "cfg_p_start_grp_order_idx" ON "cfg_p_start_grp" USING btree ("_order");
  CREATE INDEX "cfg_p_start_grp_parent_id_idx" ON "cfg_p_start_grp" USING btree ("_parent_id");
  CREATE INDEX "cfg_p_start_dtl_order_idx" ON "cfg_p_start_dtl" USING btree ("_order");
  CREATE INDEX "cfg_p_start_dtl_parent_id_idx" ON "cfg_p_start_dtl" USING btree ("_parent_id");
  CREATE INDEX "cfg_p_standard_inc_order_idx" ON "cfg_p_standard_inc" USING btree ("_order");
  CREATE INDEX "cfg_p_standard_inc_parent_id_idx" ON "cfg_p_standard_inc" USING btree ("_parent_id");
  CREATE INDEX "cfg_p_standard_gift_order_idx" ON "cfg_p_standard_gift" USING btree ("_order");
  CREATE INDEX "cfg_p_standard_gift_parent_id_idx" ON "cfg_p_standard_gift" USING btree ("_parent_id");
  CREATE INDEX "cfg_p_standard_dtl_itm_order_idx" ON "cfg_p_standard_dtl_itm" USING btree ("_order");
  CREATE INDEX "cfg_p_standard_dtl_itm_parent_id_idx" ON "cfg_p_standard_dtl_itm" USING btree ("_parent_id");
  CREATE INDEX "cfg_p_standard_grp_itm_order_idx" ON "cfg_p_standard_grp_itm" USING btree ("_order");
  CREATE INDEX "cfg_p_standard_grp_itm_parent_id_idx" ON "cfg_p_standard_grp_itm" USING btree ("_parent_id");
  CREATE INDEX "cfg_p_standard_grp_order_idx" ON "cfg_p_standard_grp" USING btree ("_order");
  CREATE INDEX "cfg_p_standard_grp_parent_id_idx" ON "cfg_p_standard_grp" USING btree ("_parent_id");
  CREATE INDEX "cfg_p_standard_dtl_order_idx" ON "cfg_p_standard_dtl" USING btree ("_order");
  CREATE INDEX "cfg_p_standard_dtl_parent_id_idx" ON "cfg_p_standard_dtl" USING btree ("_parent_id");
  CREATE INDEX "cfg_p_project_inc_order_idx" ON "cfg_p_project_inc" USING btree ("_order");
  CREATE INDEX "cfg_p_project_inc_parent_id_idx" ON "cfg_p_project_inc" USING btree ("_parent_id");
  CREATE INDEX "cfg_p_project_gift_order_idx" ON "cfg_p_project_gift" USING btree ("_order");
  CREATE INDEX "cfg_p_project_gift_parent_id_idx" ON "cfg_p_project_gift" USING btree ("_parent_id");
  CREATE INDEX "cfg_p_project_dtl_itm_order_idx" ON "cfg_p_project_dtl_itm" USING btree ("_order");
  CREATE INDEX "cfg_p_project_dtl_itm_parent_id_idx" ON "cfg_p_project_dtl_itm" USING btree ("_parent_id");
  CREATE INDEX "cfg_p_project_grp_itm_order_idx" ON "cfg_p_project_grp_itm" USING btree ("_order");
  CREATE INDEX "cfg_p_project_grp_itm_parent_id_idx" ON "cfg_p_project_grp_itm" USING btree ("_parent_id");
  CREATE INDEX "cfg_p_project_grp_order_idx" ON "cfg_p_project_grp" USING btree ("_order");
  CREATE INDEX "cfg_p_project_grp_parent_id_idx" ON "cfg_p_project_grp" USING btree ("_parent_id");
  CREATE INDEX "cfg_p_project_dtl_order_idx" ON "cfg_p_project_dtl" USING btree ("_order");
  CREATE INDEX "cfg_p_project_dtl_parent_id_idx" ON "cfg_p_project_dtl" USING btree ("_parent_id");
  CREATE INDEX "cfg_m_standard_inc_order_idx" ON "cfg_m_standard_inc" USING btree ("_order");
  CREATE INDEX "cfg_m_standard_inc_parent_id_idx" ON "cfg_m_standard_inc" USING btree ("_parent_id");
  CREATE INDEX "cfg_m_standard_gift_order_idx" ON "cfg_m_standard_gift" USING btree ("_order");
  CREATE INDEX "cfg_m_standard_gift_parent_id_idx" ON "cfg_m_standard_gift" USING btree ("_parent_id");
  CREATE INDEX "cfg_m_standard_dtl_itm_order_idx" ON "cfg_m_standard_dtl_itm" USING btree ("_order");
  CREATE INDEX "cfg_m_standard_dtl_itm_parent_id_idx" ON "cfg_m_standard_dtl_itm" USING btree ("_parent_id");
  CREATE INDEX "cfg_m_standard_grp_itm_order_idx" ON "cfg_m_standard_grp_itm" USING btree ("_order");
  CREATE INDEX "cfg_m_standard_grp_itm_parent_id_idx" ON "cfg_m_standard_grp_itm" USING btree ("_parent_id");
  CREATE INDEX "cfg_m_standard_grp_order_idx" ON "cfg_m_standard_grp" USING btree ("_order");
  CREATE INDEX "cfg_m_standard_grp_parent_id_idx" ON "cfg_m_standard_grp" USING btree ("_parent_id");
  CREATE INDEX "cfg_m_standard_dtl_order_idx" ON "cfg_m_standard_dtl" USING btree ("_order");
  CREATE INDEX "cfg_m_standard_dtl_parent_id_idx" ON "cfg_m_standard_dtl" USING btree ("_parent_id");
  CREATE INDEX "cfg_m_project_inc_order_idx" ON "cfg_m_project_inc" USING btree ("_order");
  CREATE INDEX "cfg_m_project_inc_parent_id_idx" ON "cfg_m_project_inc" USING btree ("_parent_id");
  CREATE INDEX "cfg_m_project_gift_order_idx" ON "cfg_m_project_gift" USING btree ("_order");
  CREATE INDEX "cfg_m_project_gift_parent_id_idx" ON "cfg_m_project_gift" USING btree ("_parent_id");
  CREATE INDEX "cfg_m_project_dtl_itm_order_idx" ON "cfg_m_project_dtl_itm" USING btree ("_order");
  CREATE INDEX "cfg_m_project_dtl_itm_parent_id_idx" ON "cfg_m_project_dtl_itm" USING btree ("_parent_id");
  CREATE INDEX "cfg_m_project_grp_itm_order_idx" ON "cfg_m_project_grp_itm" USING btree ("_order");
  CREATE INDEX "cfg_m_project_grp_itm_parent_id_idx" ON "cfg_m_project_grp_itm" USING btree ("_parent_id");
  CREATE INDEX "cfg_m_project_grp_order_idx" ON "cfg_m_project_grp" USING btree ("_order");
  CREATE INDEX "cfg_m_project_grp_parent_id_idx" ON "cfg_m_project_grp" USING btree ("_parent_id");
  CREATE INDEX "cfg_m_project_dtl_order_idx" ON "cfg_m_project_dtl" USING btree ("_order");
  CREATE INDEX "cfg_m_project_dtl_parent_id_idx" ON "cfg_m_project_dtl" USING btree ("_parent_id");
  CREATE INDEX "cfg_m_turnkey_inc_order_idx" ON "cfg_m_turnkey_inc" USING btree ("_order");
  CREATE INDEX "cfg_m_turnkey_inc_parent_id_idx" ON "cfg_m_turnkey_inc" USING btree ("_parent_id");
  CREATE INDEX "cfg_m_turnkey_gift_order_idx" ON "cfg_m_turnkey_gift" USING btree ("_order");
  CREATE INDEX "cfg_m_turnkey_gift_parent_id_idx" ON "cfg_m_turnkey_gift" USING btree ("_parent_id");
  CREATE INDEX "cfg_m_turnkey_dtl_itm_order_idx" ON "cfg_m_turnkey_dtl_itm" USING btree ("_order");
  CREATE INDEX "cfg_m_turnkey_dtl_itm_parent_id_idx" ON "cfg_m_turnkey_dtl_itm" USING btree ("_parent_id");
  CREATE INDEX "cfg_m_turnkey_grp_itm_order_idx" ON "cfg_m_turnkey_grp_itm" USING btree ("_order");
  CREATE INDEX "cfg_m_turnkey_grp_itm_parent_id_idx" ON "cfg_m_turnkey_grp_itm" USING btree ("_parent_id");
  CREATE INDEX "cfg_m_turnkey_grp_order_idx" ON "cfg_m_turnkey_grp" USING btree ("_order");
  CREATE INDEX "cfg_m_turnkey_grp_parent_id_idx" ON "cfg_m_turnkey_grp" USING btree ("_parent_id");
  CREATE INDEX "cfg_m_turnkey_dtl_order_idx" ON "cfg_m_turnkey_dtl" USING btree ("_order");
  CREATE INDEX "cfg_m_turnkey_dtl_parent_id_idx" ON "cfg_m_turnkey_dtl" USING btree ("_parent_id");`)
  const found = await payload.find({ collection: 'blocks', where: { key: { equals: 'ProjectConfig' } }, limit: 1, depth: 0, req, overrideAccess: true })
  const data = { title: 'Комплектации', key: 'ProjectConfig', source: 'src/components/project-config.tsx', exportName: 'ProjectConfig', configurationTemplates: defaultConfigurationTemplates() }
  if (found.docs[0]) await payload.update({ collection: 'blocks', id: found.docs[0].id, data: { configurationTemplates: data.configurationTemplates }, req, overrideAccess: true })
  else await payload.create({ collection: 'blocks', data, req, overrideAccess: true })
  const projects = await payload.find({ collection: 'projects', pagination: false, depth: 0, req, overrideAccess: true })
  for (const project of projects.docs) {
    if (project.recordType !== 'ready-home') await payload.update({ collection: 'projects', id: project.id, data: { configurations: project.configurations || [], technologyBadge: project.technologyBadge }, req, overrideAccess: true })
  }
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cfg_p_start_inc" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cfg_p_start_gift" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cfg_p_start_dtl_itm" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cfg_p_start_grp_itm" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cfg_p_start_grp" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cfg_p_start_dtl" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cfg_p_standard_inc" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cfg_p_standard_gift" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cfg_p_standard_dtl_itm" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cfg_p_standard_grp_itm" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cfg_p_standard_grp" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cfg_p_standard_dtl" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cfg_p_project_inc" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cfg_p_project_gift" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cfg_p_project_dtl_itm" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cfg_p_project_grp_itm" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cfg_p_project_grp" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cfg_p_project_dtl" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cfg_m_standard_inc" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cfg_m_standard_gift" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cfg_m_standard_dtl_itm" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cfg_m_standard_grp_itm" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cfg_m_standard_grp" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cfg_m_standard_dtl" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cfg_m_project_inc" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cfg_m_project_gift" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cfg_m_project_dtl_itm" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cfg_m_project_grp_itm" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cfg_m_project_grp" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cfg_m_project_dtl" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cfg_m_turnkey_inc" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cfg_m_turnkey_gift" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cfg_m_turnkey_dtl_itm" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cfg_m_turnkey_grp_itm" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cfg_m_turnkey_grp" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cfg_m_turnkey_dtl" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "cfg_p_start_inc" CASCADE;
  DROP TABLE "cfg_p_start_gift" CASCADE;
  DROP TABLE "cfg_p_start_dtl_itm" CASCADE;
  DROP TABLE "cfg_p_start_grp_itm" CASCADE;
  DROP TABLE "cfg_p_start_grp" CASCADE;
  DROP TABLE "cfg_p_start_dtl" CASCADE;
  DROP TABLE "cfg_p_standard_inc" CASCADE;
  DROP TABLE "cfg_p_standard_gift" CASCADE;
  DROP TABLE "cfg_p_standard_dtl_itm" CASCADE;
  DROP TABLE "cfg_p_standard_grp_itm" CASCADE;
  DROP TABLE "cfg_p_standard_grp" CASCADE;
  DROP TABLE "cfg_p_standard_dtl" CASCADE;
  DROP TABLE "cfg_p_project_inc" CASCADE;
  DROP TABLE "cfg_p_project_gift" CASCADE;
  DROP TABLE "cfg_p_project_dtl_itm" CASCADE;
  DROP TABLE "cfg_p_project_grp_itm" CASCADE;
  DROP TABLE "cfg_p_project_grp" CASCADE;
  DROP TABLE "cfg_p_project_dtl" CASCADE;
  DROP TABLE "cfg_m_standard_inc" CASCADE;
  DROP TABLE "cfg_m_standard_gift" CASCADE;
  DROP TABLE "cfg_m_standard_dtl_itm" CASCADE;
  DROP TABLE "cfg_m_standard_grp_itm" CASCADE;
  DROP TABLE "cfg_m_standard_grp" CASCADE;
  DROP TABLE "cfg_m_standard_dtl" CASCADE;
  DROP TABLE "cfg_m_project_inc" CASCADE;
  DROP TABLE "cfg_m_project_gift" CASCADE;
  DROP TABLE "cfg_m_project_dtl_itm" CASCADE;
  DROP TABLE "cfg_m_project_grp_itm" CASCADE;
  DROP TABLE "cfg_m_project_grp" CASCADE;
  DROP TABLE "cfg_m_project_dtl" CASCADE;
  DROP TABLE "cfg_m_turnkey_inc" CASCADE;
  DROP TABLE "cfg_m_turnkey_gift" CASCADE;
  DROP TABLE "cfg_m_turnkey_dtl_itm" CASCADE;
  DROP TABLE "cfg_m_turnkey_grp_itm" CASCADE;
  DROP TABLE "cfg_m_turnkey_grp" CASCADE;
  DROP TABLE "cfg_m_turnkey_dtl" CASCADE;
  ALTER TABLE "blocks_parts" ALTER COLUMN "key" SET NOT NULL;
  ALTER TABLE "blocks_parts" ALTER COLUMN "title" SET NOT NULL;
  ALTER TABLE "blocks" ALTER COLUMN "key" SET NOT NULL;
  ALTER TABLE "blocks" ALTER COLUMN "source" SET NOT NULL;
  ALTER TABLE "forms_parts" ALTER COLUMN "key" SET NOT NULL;
  ALTER TABLE "forms_parts" ALTER COLUMN "title" SET NOT NULL;
  ALTER TABLE "forms" ALTER COLUMN "key" SET NOT NULL;
  ALTER TABLE "forms" ALTER COLUMN "source" SET NOT NULL;
  ALTER TABLE "blocks" DROP COLUMN "configuration_templates_panel_start_lead";
  ALTER TABLE "blocks" DROP COLUMN "configuration_templates_panel_standard_lead";
  ALTER TABLE "blocks" DROP COLUMN "configuration_templates_panel_project_lead";
  ALTER TABLE "blocks" DROP COLUMN "configuration_templates_modular_standard_lead";
  ALTER TABLE "blocks" DROP COLUMN "configuration_templates_modular_project_lead";
  ALTER TABLE "blocks" DROP COLUMN "configuration_templates_modular_turnkey_lead";`)
}
