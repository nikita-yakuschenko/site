import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "projects" ADD COLUMN "like_count" numeric DEFAULT 0;
  ALTER TABLE "projects" ADD COLUMN "share_count" numeric DEFAULT 0;
  ALTER TABLE "projects" ADD COLUMN "like_voters" jsonb DEFAULT '[]'::jsonb;
  ALTER TABLE "projects" ADD COLUMN "share_voters" jsonb DEFAULT '[]'::jsonb;
  ALTER TABLE "_projects_v" ADD COLUMN "version_like_count" numeric DEFAULT 0;
  ALTER TABLE "_projects_v" ADD COLUMN "version_share_count" numeric DEFAULT 0;
  ALTER TABLE "_projects_v" ADD COLUMN "version_like_voters" jsonb DEFAULT '[]'::jsonb;
  ALTER TABLE "_projects_v" ADD COLUMN "version_share_voters" jsonb DEFAULT '[]'::jsonb;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "projects" DROP COLUMN "like_count";
  ALTER TABLE "projects" DROP COLUMN "share_count";
  ALTER TABLE "projects" DROP COLUMN "like_voters";
  ALTER TABLE "projects" DROP COLUMN "share_voters";
  ALTER TABLE "_projects_v" DROP COLUMN "version_like_count";
  ALTER TABLE "_projects_v" DROP COLUMN "version_share_count";
  ALTER TABLE "_projects_v" DROP COLUMN "version_like_voters";
  ALTER TABLE "_projects_v" DROP COLUMN "version_share_voters";`)
}
