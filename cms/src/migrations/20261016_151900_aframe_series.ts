import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`ALTER TYPE "public"."enum_projects_series" ADD VALUE 'aframe'`)
  await db.execute(sql`ALTER TYPE "public"."enum__projects_v_version_series" ADD VALUE 'aframe'`)
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // PostgreSQL не удаляет одно значение enum, не пересоздавая тип.
}
