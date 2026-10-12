import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_projects_ready_home_sections_tone" AS ENUM('quality', 'place');
  CREATE TYPE "public"."enum_projects_record_type" AS ENUM('project', 'ready-home');
  CREATE TYPE "public"."enum_projects_technology_badge" AS ENUM('Панельно-каркасный', 'Модульный');
  CREATE TYPE "public"."enum_projects_series" AS ENUM('panel', 'barn', 'classic', 'modular');
  CREATE TYPE "public"."enum_projects_built_tour_video_provider" AS ENUM('kinescope', 'vk');
  CREATE TABLE "projects_exteriors" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image" varchar NOT NULL
  );
  
  CREATE TABLE "projects_floor_plans" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image" varchar NOT NULL
  );
  
  CREATE TABLE "projects_plans_rooms" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"area" varchar NOT NULL
  );
  
  CREATE TABLE "projects_plans_floors_rooms" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"area" varchar NOT NULL
  );
  
  CREATE TABLE "projects_plans_floors" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"image" varchar NOT NULL
  );
  
  CREATE TABLE "projects_plans" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"image" varchar
  );
  
  CREATE TABLE "projects_interiors" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image" varchar NOT NULL
  );
  
  CREATE TABLE "projects_built" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image" varchar NOT NULL,
  	"caption" varchar
  );
  
  CREATE TABLE "projects_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"name" varchar NOT NULL,
  	"price" numeric NOT NULL,
  	"default_selected" boolean
  );
  
  CREATE TABLE "projects_ready_home_configuration" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "projects_ready_home_sections_points_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "projects_ready_home_sections_points" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL
  );
  
  CREATE TABLE "projects_ready_home_sections" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"tone" "enum_projects_ready_home_sections_tone" NOT NULL
  );
  
  CREATE TABLE "projects_about" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"text" varchar NOT NULL,
  	"image" varchar
  );
  
  UPDATE "projects" SET "technology_badge" = CASE WHEN "series" = 'modular' THEN 'Модульный' ELSE 'Панельно-каркасный' END WHERE "technology_badge" = 'Готовый дом';
  ALTER TABLE "projects" ALTER COLUMN "technology_badge" SET DATA TYPE "public"."enum_projects_technology_badge" USING "technology_badge"::"public"."enum_projects_technology_badge";
  ALTER TABLE "projects" ALTER COLUMN "series" SET DATA TYPE "public"."enum_projects_series" USING "series"::"public"."enum_projects_series";
  ALTER TABLE "projects" ADD COLUMN "record_type" "enum_projects_record_type" DEFAULT 'project' NOT NULL;
  ALTER TABLE "projects" ADD COLUMN "built_tour_title" varchar;
  ALTER TABLE "projects" ADD COLUMN "built_tour_cover" varchar;
  ALTER TABLE "projects" ADD COLUMN "built_tour_video_provider" "enum_projects_built_tour_video_provider";
  ALTER TABLE "projects" ADD COLUMN "built_tour_video_oid" numeric;
  ALTER TABLE "projects" ADD COLUMN "ready_home_location" varchar;
  ALTER TABLE "projects" ADD COLUMN "ready_home_location_prepositional" varchar;
  ALTER TABLE "projects" ADD COLUMN "ready_home_sale_price" numeric;
  ALTER TABLE "projects" ADD COLUMN "ready_home_configuration_lead" varchar;
  ALTER TABLE "projects" ADD COLUMN "ready_home_visit_image" varchar;
  ALTER TABLE "projects" ADD COLUMN "content_imported" boolean;
  ALTER TABLE "projects_exteriors" ADD CONSTRAINT "projects_exteriors_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_floor_plans" ADD CONSTRAINT "projects_floor_plans_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_plans_rooms" ADD CONSTRAINT "projects_plans_rooms_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects_plans"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_plans_floors_rooms" ADD CONSTRAINT "projects_plans_floors_rooms_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects_plans_floors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_plans_floors" ADD CONSTRAINT "projects_plans_floors_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects_plans"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_plans" ADD CONSTRAINT "projects_plans_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_interiors" ADD CONSTRAINT "projects_interiors_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_built" ADD CONSTRAINT "projects_built_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_options" ADD CONSTRAINT "projects_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_ready_home_configuration" ADD CONSTRAINT "projects_ready_home_configuration_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_ready_home_sections_points_items" ADD CONSTRAINT "projects_ready_home_sections_points_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects_ready_home_sections_points"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_ready_home_sections_points" ADD CONSTRAINT "projects_ready_home_sections_points_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects_ready_home_sections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_ready_home_sections" ADD CONSTRAINT "projects_ready_home_sections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_about" ADD CONSTRAINT "projects_about_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "projects_exteriors_order_idx" ON "projects_exteriors" USING btree ("_order");
  CREATE INDEX "projects_exteriors_parent_id_idx" ON "projects_exteriors" USING btree ("_parent_id");
  CREATE INDEX "projects_floor_plans_order_idx" ON "projects_floor_plans" USING btree ("_order");
  CREATE INDEX "projects_floor_plans_parent_id_idx" ON "projects_floor_plans" USING btree ("_parent_id");
  CREATE INDEX "projects_plans_rooms_order_idx" ON "projects_plans_rooms" USING btree ("_order");
  CREATE INDEX "projects_plans_rooms_parent_id_idx" ON "projects_plans_rooms" USING btree ("_parent_id");
  CREATE INDEX "projects_plans_floors_rooms_order_idx" ON "projects_plans_floors_rooms" USING btree ("_order");
  CREATE INDEX "projects_plans_floors_rooms_parent_id_idx" ON "projects_plans_floors_rooms" USING btree ("_parent_id");
  CREATE INDEX "projects_plans_floors_order_idx" ON "projects_plans_floors" USING btree ("_order");
  CREATE INDEX "projects_plans_floors_parent_id_idx" ON "projects_plans_floors" USING btree ("_parent_id");
  CREATE INDEX "projects_plans_order_idx" ON "projects_plans" USING btree ("_order");
  CREATE INDEX "projects_plans_parent_id_idx" ON "projects_plans" USING btree ("_parent_id");
  CREATE INDEX "projects_interiors_order_idx" ON "projects_interiors" USING btree ("_order");
  CREATE INDEX "projects_interiors_parent_id_idx" ON "projects_interiors" USING btree ("_parent_id");
  CREATE INDEX "projects_built_order_idx" ON "projects_built" USING btree ("_order");
  CREATE INDEX "projects_built_parent_id_idx" ON "projects_built" USING btree ("_parent_id");
  CREATE INDEX "projects_options_order_idx" ON "projects_options" USING btree ("_order");
  CREATE INDEX "projects_options_parent_id_idx" ON "projects_options" USING btree ("_parent_id");
  CREATE INDEX "projects_ready_home_configuration_order_idx" ON "projects_ready_home_configuration" USING btree ("_order");
  CREATE INDEX "projects_ready_home_configuration_parent_id_idx" ON "projects_ready_home_configuration" USING btree ("_parent_id");
  CREATE INDEX "projects_ready_home_sections_points_items_order_idx" ON "projects_ready_home_sections_points_items" USING btree ("_order");
  CREATE INDEX "projects_ready_home_sections_points_items_parent_id_idx" ON "projects_ready_home_sections_points_items" USING btree ("_parent_id");
  CREATE INDEX "projects_ready_home_sections_points_order_idx" ON "projects_ready_home_sections_points" USING btree ("_order");
  CREATE INDEX "projects_ready_home_sections_points_parent_id_idx" ON "projects_ready_home_sections_points" USING btree ("_parent_id");
  CREATE INDEX "projects_ready_home_sections_order_idx" ON "projects_ready_home_sections" USING btree ("_order");
  CREATE INDEX "projects_ready_home_sections_parent_id_idx" ON "projects_ready_home_sections" USING btree ("_parent_id");
  CREATE INDEX "projects_about_order_idx" ON "projects_about" USING btree ("_order");
  CREATE INDEX "projects_about_parent_id_idx" ON "projects_about" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "projects_exteriors" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "projects_floor_plans" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "projects_plans_rooms" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "projects_plans_floors_rooms" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "projects_plans_floors" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "projects_plans" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "projects_interiors" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "projects_built" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "projects_options" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "projects_ready_home_configuration" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "projects_ready_home_sections_points_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "projects_ready_home_sections_points" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "projects_ready_home_sections" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "projects_about" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "projects_exteriors" CASCADE;
  DROP TABLE "projects_floor_plans" CASCADE;
  DROP TABLE "projects_plans_rooms" CASCADE;
  DROP TABLE "projects_plans_floors_rooms" CASCADE;
  DROP TABLE "projects_plans_floors" CASCADE;
  DROP TABLE "projects_plans" CASCADE;
  DROP TABLE "projects_interiors" CASCADE;
  DROP TABLE "projects_built" CASCADE;
  DROP TABLE "projects_options" CASCADE;
  DROP TABLE "projects_ready_home_configuration" CASCADE;
  DROP TABLE "projects_ready_home_sections_points_items" CASCADE;
  DROP TABLE "projects_ready_home_sections_points" CASCADE;
  DROP TABLE "projects_ready_home_sections" CASCADE;
  DROP TABLE "projects_about" CASCADE;
  ALTER TABLE "projects" ALTER COLUMN "technology_badge" SET DATA TYPE varchar;
  ALTER TABLE "projects" ALTER COLUMN "series" SET DATA TYPE varchar;
  ALTER TABLE "projects" DROP COLUMN "record_type";
  ALTER TABLE "projects" DROP COLUMN "built_tour_title";
  ALTER TABLE "projects" DROP COLUMN "built_tour_cover";
  ALTER TABLE "projects" DROP COLUMN "built_tour_video_provider";
  ALTER TABLE "projects" DROP COLUMN "built_tour_video_oid";
  ALTER TABLE "projects" DROP COLUMN "ready_home_location";
  ALTER TABLE "projects" DROP COLUMN "ready_home_location_prepositional";
  ALTER TABLE "projects" DROP COLUMN "ready_home_sale_price";
  ALTER TABLE "projects" DROP COLUMN "ready_home_configuration_lead";
  ALTER TABLE "projects" DROP COLUMN "ready_home_visit_image";
  ALTER TABLE "projects" DROP COLUMN "content_imported";
  DROP TYPE "public"."enum_projects_ready_home_sections_tone";
  DROP TYPE "public"."enum_projects_record_type";
  DROP TYPE "public"."enum_projects_technology_badge";
  DROP TYPE "public"."enum_projects_series";
  DROP TYPE "public"."enum_projects_built_tour_video_provider";`)
}
