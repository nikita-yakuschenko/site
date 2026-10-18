import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`ALTER TYPE "public"."enum_lead_delivery_mode" ADD VALUE 'roistat'`)
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // PostgreSQL не удаляет одно значение enum, не пересоздавая тип. Прежняя CMS режим «roistat» не выберет.
}
