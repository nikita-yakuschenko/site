import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "projects" ADD COLUMN "hero_product" numeric;
    ALTER TABLE "_projects_v" ADD COLUMN "version_hero_product" numeric;
    CREATE UNIQUE INDEX "projects_hero_product_idx" ON "projects" USING btree ("hero_product");
    CREATE INDEX "_projects_v_version_version_hero_product_idx" ON "_projects_v" USING btree ("version_hero_product");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX "_projects_v_version_version_hero_product_idx";
    DROP INDEX "projects_hero_product_idx";
    ALTER TABLE "_projects_v" DROP COLUMN "version_hero_product";
    ALTER TABLE "projects" DROP COLUMN "hero_product";
  `)
}
