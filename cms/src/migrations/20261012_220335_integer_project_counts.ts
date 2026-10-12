import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "projects" ALTER COLUMN "bedrooms" SET DATA TYPE numeric USING "bedrooms"::numeric;
  ALTER TABLE "projects" ALTER COLUMN "bedrooms" SET NOT NULL;
  ALTER TABLE "projects" ALTER COLUMN "bathrooms" SET DATA TYPE numeric USING "bathrooms"::numeric;
  ALTER TABLE "projects" ALTER COLUMN "bathrooms" SET NOT NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "projects" ALTER COLUMN "bedrooms" SET DATA TYPE varchar;
  ALTER TABLE "projects" ALTER COLUMN "bedrooms" DROP NOT NULL;
  ALTER TABLE "projects" ALTER COLUMN "bathrooms" SET DATA TYPE varchar;
  ALTER TABLE "projects" ALTER COLUMN "bathrooms" DROP NOT NULL;`)
}
