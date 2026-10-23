import { MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`ALTER TYPE "public"."enum_projects_technology_badge" ADD VALUE IF NOT EXISTS 'Каркасный'`)
  await db.execute(sql`ALTER TYPE "public"."enum__projects_v_version_technology_badge" ADD VALUE IF NOT EXISTS 'Каркасный'`)
}

export async function down(): Promise<void> {
  // Дополнительное значение enum совместимо с предыдущей схемой.
  // Удалять его нельзя: оно может использоваться в проектах и их версиях.
}
