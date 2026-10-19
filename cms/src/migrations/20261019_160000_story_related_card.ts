import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "stories" ADD COLUMN "related_card_enabled" boolean DEFAULT true;
  ALTER TABLE "stories" ADD COLUMN "related_card_title" varchar;
  ALTER TABLE "stories" ADD COLUMN "related_card_text" varchar;
  ALTER TABLE "stories" ADD COLUMN "related_card_image_id" integer;
  ALTER TABLE "_stories_v" ADD COLUMN "version_related_card_enabled" boolean DEFAULT true;
  ALTER TABLE "_stories_v" ADD COLUMN "version_related_card_title" varchar;
  ALTER TABLE "_stories_v" ADD COLUMN "version_related_card_text" varchar;
  ALTER TABLE "_stories_v" ADD COLUMN "version_related_card_image_id" integer;
  ALTER TABLE "stories" ADD CONSTRAINT "stories_related_card_image_id_media_id_fk" FOREIGN KEY ("related_card_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_stories_v" ADD CONSTRAINT "_stories_v_version_related_card_image_id_media_id_fk" FOREIGN KEY ("version_related_card_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "stories_related_card_image_idx" ON "stories" USING btree ("related_card_image_id");
  CREATE INDEX "_stories_v_version_related_card_image_idx" ON "_stories_v" USING btree ("version_related_card_image_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "stories" DROP CONSTRAINT "stories_related_card_image_id_media_id_fk";
  ALTER TABLE "_stories_v" DROP CONSTRAINT "_stories_v_version_related_card_image_id_media_id_fk";
  DROP INDEX "stories_related_card_image_idx";
  DROP INDEX "_stories_v_version_related_card_image_idx";
  ALTER TABLE "stories" DROP COLUMN "related_card_enabled";
  ALTER TABLE "stories" DROP COLUMN "related_card_title";
  ALTER TABLE "stories" DROP COLUMN "related_card_text";
  ALTER TABLE "stories" DROP COLUMN "related_card_image_id";
  ALTER TABLE "_stories_v" DROP COLUMN "version_related_card_enabled";
  ALTER TABLE "_stories_v" DROP COLUMN "version_related_card_title";
  ALTER TABLE "_stories_v" DROP COLUMN "version_related_card_text";
  ALTER TABLE "_stories_v" DROP COLUMN "version_related_card_image_id";
  `)
}
