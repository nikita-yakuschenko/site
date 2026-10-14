import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__pages_v_version_kind" AS ENUM('page', 'template', 'exposition', 'redirect', 'preview');
  CREATE TYPE "public"."enum__pages_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "_pages_v_version_layout" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"anchor" varchar,
  	"parameters" jsonb,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" varchar,
  	"version_title" varchar,
  	"version_route" varchar,
  	"version_meta_title" varchar,
  	"version_kind" "enum__pages_v_version_kind" DEFAULT 'page',
  	"version_source" varchar,
  	"version_redirect" varchar,
  	"version_import_key" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__pages_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_pages_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"blocks_id" varchar,
  	"forms_id" varchar
  );
  
  ALTER TABLE "pages" ALTER COLUMN "title" DROP NOT NULL;
  ALTER TABLE "pages" ALTER COLUMN "route" DROP NOT NULL;
  ALTER TABLE "pages" ALTER COLUMN "meta_title" DROP NOT NULL;
  ALTER TABLE "pages" ALTER COLUMN "kind" DROP NOT NULL;
  ALTER TABLE "pages" ADD COLUMN "_status" "enum_pages_status" DEFAULT 'draft';
  UPDATE "pages" SET "_status" = 'published';
  ALTER TABLE "_pages_v_version_layout" ADD CONSTRAINT "_pages_v_version_layout_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_parent_id_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_blocks_fk" FOREIGN KEY ("blocks_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_forms_fk" FOREIGN KEY ("forms_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "_pages_v_version_layout_order_idx" ON "_pages_v_version_layout" USING btree ("_order");
  CREATE INDEX "_pages_v_version_layout_parent_id_idx" ON "_pages_v_version_layout" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_parent_idx" ON "_pages_v" USING btree ("parent_id");
  CREATE INDEX "_pages_v_version_version_route_idx" ON "_pages_v" USING btree ("version_route");
  CREATE INDEX "_pages_v_version_version_import_key_idx" ON "_pages_v" USING btree ("version_import_key");
  CREATE INDEX "_pages_v_version_version_updated_at_idx" ON "_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_pages_v_version_version_created_at_idx" ON "_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_pages_v_version_version__status_idx" ON "_pages_v" USING btree ("version__status");
  CREATE INDEX "_pages_v_created_at_idx" ON "_pages_v" USING btree ("created_at");
  CREATE INDEX "_pages_v_updated_at_idx" ON "_pages_v" USING btree ("updated_at");
  CREATE INDEX "_pages_v_latest_idx" ON "_pages_v" USING btree ("latest");
  CREATE INDEX "_pages_v_rels_order_idx" ON "_pages_v_rels" USING btree ("order");
  CREATE INDEX "_pages_v_rels_parent_idx" ON "_pages_v_rels" USING btree ("parent_id");
  CREATE INDEX "_pages_v_rels_path_idx" ON "_pages_v_rels" USING btree ("path");
  CREATE INDEX "_pages_v_rels_blocks_id_idx" ON "_pages_v_rels" USING btree ("blocks_id");
  CREATE INDEX "_pages_v_rels_forms_id_idx" ON "_pages_v_rels" USING btree ("forms_id");
  CREATE INDEX "pages__status_idx" ON "pages" USING btree ("_status");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "_pages_v_version_layout" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "_pages_v_version_layout" CASCADE;
  DROP TABLE "_pages_v" CASCADE;
  DROP TABLE "_pages_v_rels" CASCADE;
  DROP INDEX "pages__status_idx";
  ALTER TABLE "pages" ALTER COLUMN "title" SET NOT NULL;
  ALTER TABLE "pages" ALTER COLUMN "route" SET NOT NULL;
  ALTER TABLE "pages" ALTER COLUMN "meta_title" SET NOT NULL;
  ALTER TABLE "pages" ALTER COLUMN "kind" SET NOT NULL;
  ALTER TABLE "pages" DROP COLUMN "_status";
  DROP TYPE "public"."enum_pages_status";
  DROP TYPE "public"."enum__pages_v_version_kind";
  DROP TYPE "public"."enum__pages_v_version_status";`)
}
