import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  CREATE TYPE "public"."enum_stories_customer_kind" AS ENUM('family', 'business');
  CREATE TYPE "public"."enum_stories_binding" AS ENUM('catalog', 'individual', 'discontinued');
  CREATE TYPE "public"."enum_stories_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_stories_media_type" AS ENUM('photo', 'video');
  CREATE TYPE "public"."enum_stories_media_provider" AS ENUM('kinescope', 'vk');
  CREATE TYPE "public"."enum__stories_v_version_customer_kind" AS ENUM('family', 'business');
  CREATE TYPE "public"."enum__stories_v_version_binding" AS ENUM('catalog', 'individual', 'discontinued');
  CREATE TYPE "public"."enum__stories_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__stories_v_version_media_type" AS ENUM('photo', 'video');
  CREATE TYPE "public"."enum__stories_v_version_media_provider" AS ENUM('kinescope', 'vk');

  CREATE TABLE "stories" (
    "id" serial PRIMARY KEY NOT NULL,
    "heading" varchar,
    "slug" varchar,
    "subtitle" varchar,
    "place" varchar,
    "year" numeric,
    "customer_kind" "enum_stories_customer_kind" DEFAULT 'family',
    "binding" "enum_stories_binding" DEFAULT 'catalog',
    "project_id" integer,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "_status" "enum_stories_status" DEFAULT 'draft'
  );

  CREATE TABLE "stories_media" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "type" "enum_stories_media_type" DEFAULT 'photo',
    "is_primary" boolean DEFAULT false,
    "provider" "enum_stories_media_provider",
    "video_url" varchar,
    "video_file_id" integer,
    "photo_id" integer,
    "image" varchar,
    "caption" varchar
  );

  CREATE TABLE "_stories_v" (
    "id" serial PRIMARY KEY NOT NULL,
    "parent_id" integer,
    "version_heading" varchar,
    "version_slug" varchar,
    "version_subtitle" varchar,
    "version_place" varchar,
    "version_year" numeric,
    "version_customer_kind" "enum__stories_v_version_customer_kind" DEFAULT 'family',
    "version_binding" "enum__stories_v_version_binding" DEFAULT 'catalog',
    "version_project_id" integer,
    "version_updated_at" timestamp(3) with time zone,
    "version_created_at" timestamp(3) with time zone,
    "version__status" "enum__stories_v_version_status" DEFAULT 'draft',
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "latest" boolean
  );

  CREATE TABLE "_stories_v_version_media" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" serial PRIMARY KEY NOT NULL,
    "type" "enum__stories_v_version_media_type" DEFAULT 'photo',
    "is_primary" boolean DEFAULT false,
    "provider" "enum__stories_v_version_media_provider",
    "video_url" varchar,
    "video_file_id" integer,
    "photo_id" integer,
    "image" varchar,
    "caption" varchar,
    "_uuid" varchar
  );

  ALTER TABLE "stories" ADD CONSTRAINT "stories_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stories_media" ADD CONSTRAINT "stories_media_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "stories_media" ADD CONSTRAINT "stories_media_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stories_media" ADD CONSTRAINT "stories_media_video_file_id_media_id_fk" FOREIGN KEY ("video_file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_stories_v" ADD CONSTRAINT "_stories_v_parent_id_stories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."stories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_stories_v" ADD CONSTRAINT "_stories_v_version_project_id_projects_id_fk" FOREIGN KEY ("version_project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_stories_v_version_media" ADD CONSTRAINT "_stories_v_version_media_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_stories_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_stories_v_version_media" ADD CONSTRAINT "_stories_v_version_media_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_stories_v_version_media" ADD CONSTRAINT "_stories_v_version_media_video_file_id_media_id_fk" FOREIGN KEY ("video_file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "stories_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_stories_fk" FOREIGN KEY ("stories_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;

  CREATE UNIQUE INDEX "stories_slug_idx" ON "stories" USING btree ("slug");
  CREATE INDEX "stories_updated_at_idx" ON "stories" USING btree ("updated_at");
  CREATE INDEX "stories_created_at_idx" ON "stories" USING btree ("created_at");
  CREATE INDEX "stories__status_idx" ON "stories" USING btree ("_status");
  CREATE INDEX "stories_project_idx" ON "stories" USING btree ("project_id");
  CREATE INDEX "stories_media_order_idx" ON "stories_media" USING btree ("_order");
  CREATE INDEX "stories_media_parent_id_idx" ON "stories_media" USING btree ("_parent_id");
  CREATE INDEX "stories_media_photo_idx" ON "stories_media" USING btree ("photo_id");
  CREATE INDEX "stories_media_video_file_idx" ON "stories_media" USING btree ("video_file_id");
  CREATE INDEX "_stories_v_parent_idx" ON "_stories_v" USING btree ("parent_id");
  CREATE INDEX "_stories_v_version_version_slug_idx" ON "_stories_v" USING btree ("version_slug");
  CREATE INDEX "_stories_v_version_version_updated_at_idx" ON "_stories_v" USING btree ("version_updated_at");
  CREATE INDEX "_stories_v_version_version_created_at_idx" ON "_stories_v" USING btree ("version_created_at");
  CREATE INDEX "_stories_v_version_version__status_idx" ON "_stories_v" USING btree ("version__status");
  CREATE INDEX "_stories_v_created_at_idx" ON "_stories_v" USING btree ("created_at");
  CREATE INDEX "_stories_v_updated_at_idx" ON "_stories_v" USING btree ("updated_at");
  CREATE INDEX "_stories_v_latest_idx" ON "_stories_v" USING btree ("latest");
  CREATE INDEX "_stories_v_version_media_order_idx" ON "_stories_v_version_media" USING btree ("_order");
  CREATE INDEX "_stories_v_version_media_parent_id_idx" ON "_stories_v_version_media" USING btree ("_parent_id");
  CREATE INDEX "payload_locked_documents_rels_stories_id_idx" ON "payload_locked_documents_rels" USING btree ("stories_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_stories_fk";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "stories_id";
  DROP TABLE "_stories_v_version_media" CASCADE;
  DROP TABLE "_stories_v" CASCADE;
  DROP TABLE "stories_media" CASCADE;
  DROP TABLE "stories" CASCADE;
  DROP TYPE "public"."enum__stories_v_version_media_provider";
  DROP TYPE "public"."enum__stories_v_version_media_type";
  DROP TYPE "public"."enum__stories_v_version_status";
  DROP TYPE "public"."enum__stories_v_version_binding";
  DROP TYPE "public"."enum__stories_v_version_customer_kind";
  DROP TYPE "public"."enum_stories_media_provider";
  DROP TYPE "public"."enum_stories_media_type";
  DROP TYPE "public"."enum_stories_status";
  DROP TYPE "public"."enum_stories_binding";
  DROP TYPE "public"."enum_stories_customer_kind";`)
}
