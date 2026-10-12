import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_projects_configurations_key" AS ENUM('start', 'standard', 'project');
  CREATE TABLE "projects_configurations_includes" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "projects_configurations_gifts" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "projects_configurations_details_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "projects_configurations_details_groups_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "projects_configurations_details_groups" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL
  );
  
  CREATE TABLE "projects_configurations_details" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"lead" varchar
  );
  
  CREATE TABLE "projects_configurations" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" "enum_projects_configurations_key" NOT NULL,
  	"name" varchar NOT NULL,
  	"price" numeric NOT NULL,
  	"lead" varchar,
  	"mortgage" boolean
  );
  
  ALTER TABLE "projects" ADD COLUMN "configurations_imported" boolean;
  ALTER TABLE "projects_configurations_includes" ADD CONSTRAINT "projects_configurations_includes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects_configurations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_configurations_gifts" ADD CONSTRAINT "projects_configurations_gifts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects_configurations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_configurations_details_items" ADD CONSTRAINT "projects_configurations_details_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects_configurations_details"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_configurations_details_groups_items" ADD CONSTRAINT "projects_configurations_details_groups_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects_configurations_details_groups"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_configurations_details_groups" ADD CONSTRAINT "projects_configurations_details_groups_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects_configurations_details"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_configurations_details" ADD CONSTRAINT "projects_configurations_details_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects_configurations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_configurations" ADD CONSTRAINT "projects_configurations_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "projects_configurations_includes_order_idx" ON "projects_configurations_includes" USING btree ("_order");
  CREATE INDEX "projects_configurations_includes_parent_id_idx" ON "projects_configurations_includes" USING btree ("_parent_id");
  CREATE INDEX "projects_configurations_gifts_order_idx" ON "projects_configurations_gifts" USING btree ("_order");
  CREATE INDEX "projects_configurations_gifts_parent_id_idx" ON "projects_configurations_gifts" USING btree ("_parent_id");
  CREATE INDEX "projects_configurations_details_items_order_idx" ON "projects_configurations_details_items" USING btree ("_order");
  CREATE INDEX "projects_configurations_details_items_parent_id_idx" ON "projects_configurations_details_items" USING btree ("_parent_id");
  CREATE INDEX "projects_configurations_details_groups_items_order_idx" ON "projects_configurations_details_groups_items" USING btree ("_order");
  CREATE INDEX "projects_configurations_details_groups_items_parent_id_idx" ON "projects_configurations_details_groups_items" USING btree ("_parent_id");
  CREATE INDEX "projects_configurations_details_groups_order_idx" ON "projects_configurations_details_groups" USING btree ("_order");
  CREATE INDEX "projects_configurations_details_groups_parent_id_idx" ON "projects_configurations_details_groups" USING btree ("_parent_id");
  CREATE INDEX "projects_configurations_details_order_idx" ON "projects_configurations_details" USING btree ("_order");
  CREATE INDEX "projects_configurations_details_parent_id_idx" ON "projects_configurations_details" USING btree ("_parent_id");
  CREATE INDEX "projects_configurations_order_idx" ON "projects_configurations" USING btree ("_order");
  CREATE INDEX "projects_configurations_parent_id_idx" ON "projects_configurations" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "projects_configurations_includes" CASCADE;
  DROP TABLE "projects_configurations_gifts" CASCADE;
  DROP TABLE "projects_configurations_details_items" CASCADE;
  DROP TABLE "projects_configurations_details_groups_items" CASCADE;
  DROP TABLE "projects_configurations_details_groups" CASCADE;
  DROP TABLE "projects_configurations_details" CASCADE;
  DROP TABLE "projects_configurations" CASCADE;
  ALTER TABLE "projects" DROP COLUMN "configurations_imported";
  DROP TYPE "public"."enum_projects_configurations_key";`)
}
