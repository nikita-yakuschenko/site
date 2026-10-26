import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "projects" ADD COLUMN "unpublished_at" timestamp(3) with time zone;
    ALTER TABLE "_projects_v" ADD COLUMN "version_unpublished_at" timestamp(3) with time zone;
  `)
}
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "projects" DROP COLUMN "unpublished_at";
    ALTER TABLE "_projects_v" DROP COLUMN "version_unpublished_at";
  `)
}
