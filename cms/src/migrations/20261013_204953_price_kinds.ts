import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "project_prices" ALTER COLUMN "region" SET DATA TYPE text;
  DROP TYPE "public"."enum_project_prices_region";
  CREATE TYPE "public"."enum_project_prices_region" AS ENUM('msk', 'nn', 'special', 'dealer');
  ALTER TABLE "project_prices" ALTER COLUMN "region" SET DATA TYPE "public"."enum_project_prices_region" USING "region"::"public"."enum_project_prices_region";
  ALTER TABLE "media" ALTER COLUMN "alt" DROP NOT NULL;
  ALTER TABLE "media" ALTER COLUMN "title" DROP NOT NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "project_prices" ALTER COLUMN "region" SET DATA TYPE text;
  DROP TYPE "public"."enum_project_prices_region";
  CREATE TYPE "public"."enum_project_prices_region" AS ENUM('nn', 'msk');
  ALTER TABLE "project_prices" ALTER COLUMN "region" SET DATA TYPE "public"."enum_project_prices_region" USING "region"::"public"."enum_project_prices_region";
  ALTER TABLE "media" ALTER COLUMN "alt" SET NOT NULL;
  ALTER TABLE "media" ALTER COLUMN "title" SET NOT NULL;`)
}
