import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_kind" AS ENUM('page', 'template', 'exposition', 'redirect', 'preview');
  CREATE TABLE "pages_layout" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"anchor" varchar,
  	"parameters" jsonb
  );
  
  CREATE TABLE "pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"route" varchar NOT NULL,
  	"meta_title" varchar NOT NULL,
  	"kind" "enum_pages_kind" DEFAULT 'page' NOT NULL,
  	"redirect" varchar,
  	"source" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "pages_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"blocks_id" integer,
  	"forms_id" integer
  );
  
  CREATE TABLE "blocks" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"key" varchar NOT NULL,
  	"source" varchar NOT NULL,
  	"export_name" varchar,
  	"defaults" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "blocks_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"forms_id" integer
  );
  
  CREATE TABLE "forms" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"key" varchar NOT NULL,
  	"source" varchar NOT NULL,
  	"export_name" varchar,
  	"defaults" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "pages_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "blocks_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "forms_id" integer;
  ALTER TABLE "pages_layout" ADD CONSTRAINT "pages_layout_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_blocks_fk" FOREIGN KEY ("blocks_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_forms_fk" FOREIGN KEY ("forms_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "blocks_rels" ADD CONSTRAINT "blocks_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "blocks_rels" ADD CONSTRAINT "blocks_rels_forms_fk" FOREIGN KEY ("forms_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_layout_order_idx" ON "pages_layout" USING btree ("_order");
  CREATE INDEX "pages_layout_parent_id_idx" ON "pages_layout" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_route_idx" ON "pages" USING btree ("route");
  CREATE INDEX "pages_updated_at_idx" ON "pages" USING btree ("updated_at");
  CREATE INDEX "pages_created_at_idx" ON "pages" USING btree ("created_at");
  CREATE INDEX "pages_rels_order_idx" ON "pages_rels" USING btree ("order");
  CREATE INDEX "pages_rels_parent_idx" ON "pages_rels" USING btree ("parent_id");
  CREATE INDEX "pages_rels_path_idx" ON "pages_rels" USING btree ("path");
  CREATE INDEX "pages_rels_blocks_id_idx" ON "pages_rels" USING btree ("blocks_id");
  CREATE INDEX "pages_rels_forms_id_idx" ON "pages_rels" USING btree ("forms_id");
  CREATE UNIQUE INDEX "blocks_key_idx" ON "blocks" USING btree ("key");
  CREATE INDEX "blocks_updated_at_idx" ON "blocks" USING btree ("updated_at");
  CREATE INDEX "blocks_created_at_idx" ON "blocks" USING btree ("created_at");
  CREATE INDEX "blocks_rels_order_idx" ON "blocks_rels" USING btree ("order");
  CREATE INDEX "blocks_rels_parent_idx" ON "blocks_rels" USING btree ("parent_id");
  CREATE INDEX "blocks_rels_path_idx" ON "blocks_rels" USING btree ("path");
  CREATE INDEX "blocks_rels_forms_id_idx" ON "blocks_rels" USING btree ("forms_id");
  CREATE UNIQUE INDEX "forms_key_idx" ON "forms" USING btree ("key");
  CREATE INDEX "forms_updated_at_idx" ON "forms" USING btree ("updated_at");
  CREATE INDEX "forms_created_at_idx" ON "forms" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_blocks_fk" FOREIGN KEY ("blocks_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_forms_fk" FOREIGN KEY ("forms_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("pages_id");
  CREATE INDEX "payload_locked_documents_rels_blocks_id_idx" ON "payload_locked_documents_rels" USING btree ("blocks_id");
  CREATE INDEX "payload_locked_documents_rels_forms_id_idx" ON "payload_locked_documents_rels" USING btree ("forms_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_layout" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "blocks" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "blocks_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "forms" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "pages_layout" CASCADE;
  DROP TABLE "pages" CASCADE;
  DROP TABLE "pages_rels" CASCADE;
  DROP TABLE "blocks" CASCADE;
  DROP TABLE "blocks_rels" CASCADE;
  DROP TABLE "forms" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_pages_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_blocks_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_forms_fk";
  
  DROP INDEX "payload_locked_documents_rels_pages_id_idx";
  DROP INDEX "payload_locked_documents_rels_blocks_id_idx";
  DROP INDEX "payload_locked_documents_rels_forms_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "pages_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "blocks_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "forms_id";
  DROP TYPE "public"."enum_pages_kind";`)
}
