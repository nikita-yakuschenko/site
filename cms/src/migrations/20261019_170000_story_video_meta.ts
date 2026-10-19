import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "stories_media" ADD COLUMN "duration" varchar;
  ALTER TABLE "stories_media" ADD COLUMN "poster_url" varchar;
  ALTER TABLE "_stories_v_version_media" ADD COLUMN "duration" varchar;
  ALTER TABLE "_stories_v_version_media" ADD COLUMN "poster_url" varchar;
  ALTER TABLE "stories" ADD COLUMN "cover_id" integer;
  ALTER TABLE "_stories_v" ADD COLUMN "version_cover_id" integer;
  ALTER TABLE "stories" ADD CONSTRAINT "stories_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_stories_v" ADD CONSTRAINT "_stories_v_version_cover_id_media_id_fk" FOREIGN KEY ("version_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "stories_cover_idx" ON "stories" USING btree ("cover_id");
  CREATE INDEX "_stories_v_version_cover_idx" ON "_stories_v" USING btree ("version_cover_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "stories" DROP CONSTRAINT "stories_cover_id_media_id_fk";
  ALTER TABLE "_stories_v" DROP CONSTRAINT "_stories_v_version_cover_id_media_id_fk";
  DROP INDEX "stories_cover_idx";
  DROP INDEX "_stories_v_version_cover_idx";
  ALTER TABLE "stories" DROP COLUMN "cover_id";
  ALTER TABLE "_stories_v" DROP COLUMN "version_cover_id";
  ALTER TABLE "stories_media" DROP COLUMN "duration";
  ALTER TABLE "stories_media" DROP COLUMN "poster_url";
  ALTER TABLE "_stories_v_version_media" DROP COLUMN "duration";
  ALTER TABLE "_stories_v_version_media" DROP COLUMN "poster_url";
  `)
}
