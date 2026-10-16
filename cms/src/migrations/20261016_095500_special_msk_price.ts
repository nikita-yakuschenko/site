import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`ALTER TYPE "public"."enum_project_prices_region" ADD VALUE 'special-msk' BEFORE 'dealer'`)
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // PostgreSQL не удаляет одно значение enum, не пересоздавая тип. Старые строки «special» остаются.
}
