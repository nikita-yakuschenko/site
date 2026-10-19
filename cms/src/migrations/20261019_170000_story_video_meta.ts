import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "stories_media" ADD COLUMN IF NOT EXISTS "duration" varchar;
  ALTER TABLE "stories_media" ADD COLUMN IF NOT EXISTS "poster_url" varchar;
  ALTER TABLE "_stories_v_version_media" ADD COLUMN IF NOT EXISTS "duration" varchar;
  ALTER TABLE "_stories_v_version_media" ADD COLUMN IF NOT EXISTS "poster_url" varchar;
  ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "cover_id" integer;
  ALTER TABLE "_stories_v" ADD COLUMN IF NOT EXISTS "version_cover_id" integer;
  DO $$ BEGIN
    ALTER TABLE "stories" ADD CONSTRAINT "stories_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  DO $$ BEGIN
    ALTER TABLE "_stories_v" ADD CONSTRAINT "_stories_v_version_cover_id_media_id_fk" FOREIGN KEY ("version_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  CREATE INDEX IF NOT EXISTS "stories_cover_idx" ON "stories" USING btree ("cover_id");
  CREATE INDEX IF NOT EXISTS "_stories_v_version_cover_idx" ON "_stories_v" USING btree ("version_cover_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "stories" DROP CONSTRAINT IF EXISTS "stories_cover_id_media_id_fk";
  ALTER TABLE "_stories_v" DROP CONSTRAINT IF EXISTS "_stories_v_version_cover_id_media_id_fk";
  DROP INDEX IF EXISTS "stories_cover_idx";
  DROP INDEX IF EXISTS "_stories_v_version_cover_idx";
  ALTER TABLE "stories" DROP COLUMN IF EXISTS "cover_id";
  ALTER TABLE "_stories_v" DROP COLUMN IF EXISTS "version_cover_id";
  ALTER TABLE "stories_media" DROP COLUMN IF EXISTS "duration";
  ALTER TABLE "stories_media" DROP COLUMN IF EXISTS "poster_url";
  ALTER TABLE "_stories_v_version_media" DROP COLUMN IF EXISTS "duration";
  ALTER TABLE "_stories_v_version_media" DROP COLUMN IF EXISTS "poster_url";
  `)
}
