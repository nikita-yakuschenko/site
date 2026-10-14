import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "blocks_parts" ADD COLUMN "image_id" integer;
  ALTER TABLE "blocks_parts" ADD COLUMN "image_mobile_id" integer;
  ALTER TABLE "forms_parts" ADD COLUMN "image_id" integer;
  ALTER TABLE "forms_parts" ADD COLUMN "image_mobile_id" integer;
  ALTER TABLE "blocks_parts" ADD CONSTRAINT "blocks_parts_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "blocks_parts" ADD CONSTRAINT "blocks_parts_image_mobile_id_media_id_fk" FOREIGN KEY ("image_mobile_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "forms_parts" ADD CONSTRAINT "forms_parts_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "forms_parts" ADD CONSTRAINT "forms_parts_image_mobile_id_media_id_fk" FOREIGN KEY ("image_mobile_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "blocks_parts_image_idx" ON "blocks_parts" USING btree ("image_id");
  CREATE INDEX "blocks_parts_image_mobile_idx" ON "blocks_parts" USING btree ("image_mobile_id");
  CREATE INDEX "forms_parts_image_idx" ON "forms_parts" USING btree ("image_id");
  CREATE INDEX "forms_parts_image_mobile_idx" ON "forms_parts" USING btree ("image_mobile_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "blocks_parts" DROP CONSTRAINT "blocks_parts_image_id_media_id_fk";
  
  ALTER TABLE "blocks_parts" DROP CONSTRAINT "blocks_parts_image_mobile_id_media_id_fk";
  
  ALTER TABLE "forms_parts" DROP CONSTRAINT "forms_parts_image_id_media_id_fk";
  
  ALTER TABLE "forms_parts" DROP CONSTRAINT "forms_parts_image_mobile_id_media_id_fk";
  
  DROP INDEX "blocks_parts_image_idx";
  DROP INDEX "blocks_parts_image_mobile_idx";
  DROP INDEX "forms_parts_image_idx";
  DROP INDEX "forms_parts_image_mobile_idx";
  ALTER TABLE "blocks_parts" DROP COLUMN "image_id";
  ALTER TABLE "blocks_parts" DROP COLUMN "image_mobile_id";
  ALTER TABLE "forms_parts" DROP COLUMN "image_id";
  ALTER TABLE "forms_parts" DROP COLUMN "image_mobile_id";`)
}
