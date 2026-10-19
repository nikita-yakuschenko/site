import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "duration" varchar;
  ALTER TABLE "_stories_v" ADD COLUMN IF NOT EXISTS "version_duration" varchar;
  UPDATE "stories" SET "duration" = '4:46' WHERE "slug" = 'simple-57' AND ("duration" IS NULL OR "duration" = '');
  UPDATE "stories" SET "duration" = '4:15' WHERE "slug" = 'simple-49' AND ("duration" IS NULL OR "duration" = '');
  UPDATE "stories" SET "duration" = '2:45' WHERE "slug" = 'modular-hotel' AND ("duration" IS NULL OR "duration" = '');
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "stories" DROP COLUMN IF EXISTS "duration";
  ALTER TABLE "_stories_v" DROP COLUMN IF EXISTS "version_duration";
  `)
}
