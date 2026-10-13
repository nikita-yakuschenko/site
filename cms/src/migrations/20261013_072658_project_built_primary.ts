import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "projects_built" ADD COLUMN "is_primary" boolean DEFAULT false;
   UPDATE "projects_built" SET "is_primary" = true
   WHERE "id" IN (SELECT DISTINCT ON ("_parent_id") "id" FROM "projects_built" ORDER BY "_parent_id", "_order");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "projects_built" DROP COLUMN "is_primary";`)
}
