import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "projects" ADD COLUMN "view_count" numeric;
  ALTER TABLE "_projects_v" ADD COLUMN "version_view_count" numeric;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "projects" DROP COLUMN "view_count";
  ALTER TABLE "_projects_v" DROP COLUMN "version_view_count";`)
}
