import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE blocks ALTER COLUMN configuration_templates_frame_start_lead SET DEFAULT 'Силовой каркас, кровля и наружная отделка — основа для дальнейшего обустройства дома.';
    ALTER TABLE blocks ALTER COLUMN configuration_templates_frame_standard_lead SET DEFAULT 'Утеплённый дом с окнами и входной дверью. Подготовлен к внутренней отделке.';
    ALTER TABLE blocks ALTER COLUMN configuration_templates_frame_standard_includes_title SET DEFAULT 'Дополнительно к стартовой комплектации:';
    ALTER TABLE blocks ALTER COLUMN configuration_templates_frame_project_lead SET DEFAULT 'Внутренние стены и основание пола подготовлены к дальнейшей отделке.';
    ALTER TABLE blocks ALTER COLUMN configuration_templates_frame_project_includes_title SET DEFAULT 'Дополнительно к стандартной комплектации:';
  `)
}
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE blocks ALTER COLUMN configuration_templates_frame_start_lead SET DEFAULT 'Заводская точность, свобода дальнейших решений.';
    ALTER TABLE blocks ALTER COLUMN configuration_templates_frame_standard_lead SET DEFAULT 'Готовый снаружи, ваш замысел внутри.';
    ALTER TABLE blocks ALTER COLUMN configuration_templates_frame_standard_includes_title SET DEFAULT 'Дополнительно к Стартовой комплектации вы получаете:';
    ALTER TABLE blocks ALTER COLUMN configuration_templates_frame_project_lead SET DEFAULT 'Архитектура дома раскрыта в деталях.';
    ALTER TABLE blocks ALTER COLUMN configuration_templates_frame_project_includes_title SET DEFAULT 'Дополнительно к Стандартной комплектации вы получаете:';
  `)
}
