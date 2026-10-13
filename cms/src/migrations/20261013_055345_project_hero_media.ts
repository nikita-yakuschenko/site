import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "projects" ADD COLUMN "desktop_image_id" integer;
  ALTER TABLE "projects" ADD COLUMN "mobile_image_id" integer;
  ALTER TABLE "projects" ADD CONSTRAINT "projects_desktop_image_id_media_id_fk" FOREIGN KEY ("desktop_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "projects" ADD CONSTRAINT "projects_mobile_image_id_media_id_fk" FOREIGN KEY ("mobile_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "projects_desktop_image_idx" ON "projects" USING btree ("desktop_image_id");
  CREATE INDEX "projects_mobile_image_idx" ON "projects" USING btree ("mobile_image_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "projects" DROP CONSTRAINT "projects_desktop_image_id_media_id_fk";

  ALTER TABLE "projects" DROP CONSTRAINT "projects_mobile_image_id_media_id_fk";

  DROP INDEX "projects_desktop_image_idx";
  DROP INDEX "projects_mobile_image_idx";
  ALTER TABLE "projects" DROP COLUMN "desktop_image_id";
  ALTER TABLE "projects" DROP COLUMN "mobile_image_id";`)
}
