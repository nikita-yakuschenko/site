import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "blocks_parts" ADD COLUMN "text" varchar;
  ALTER TABLE "blocks_parts" ADD COLUMN "text_more" varchar;
  ALTER TABLE "blocks_parts" ADD COLUMN "href" varchar;
  ALTER TABLE "forms_parts" ADD COLUMN "text" varchar;
  ALTER TABLE "forms_parts" ADD COLUMN "text_more" varchar;
  ALTER TABLE "forms_parts" ADD COLUMN "href" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "blocks_parts" DROP COLUMN "text";
  ALTER TABLE "blocks_parts" DROP COLUMN "text_more";
  ALTER TABLE "blocks_parts" DROP COLUMN "href";
  ALTER TABLE "forms_parts" DROP COLUMN "text";
  ALTER TABLE "forms_parts" DROP COLUMN "text_more";
  ALTER TABLE "forms_parts" DROP COLUMN "href";`)
}
