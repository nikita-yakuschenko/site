import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages" ADD COLUMN "import_key" varchar;
  CREATE UNIQUE INDEX "pages_import_key_idx" ON "pages" USING btree ("import_key");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "pages_import_key_idx";
  ALTER TABLE "pages" DROP COLUMN "import_key";`)
}
