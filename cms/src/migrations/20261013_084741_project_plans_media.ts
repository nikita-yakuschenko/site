import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_projects_plans_content_source" AS ENUM('mock', 'database');
    ALTER TABLE "projects_plans_floors" ALTER COLUMN "label" DROP NOT NULL;
    ALTER TABLE "projects_plans_floors" ALTER COLUMN "image" DROP NOT NULL;
    ALTER TABLE "projects_plans" ALTER COLUMN "label" DROP NOT NULL;
    ALTER TABLE "projects_plans_floors" ADD COLUMN "photo_id" integer;
    ALTER TABLE "projects" ADD COLUMN "plans_content_source" "enum_projects_plans_content_source" DEFAULT 'database';
    ALTER TABLE "projects_plans_floors" ADD CONSTRAINT "projects_plans_floors_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
    CREATE INDEX "projects_plans_floors_photo_idx" ON "projects_plans_floors" USING btree ("photo_id");
    INSERT INTO projects_plans_floors (_order, _parent_id, id, label, image)
      SELECT 0, p.id, gen_random_uuid()::text, NULL, p.image FROM projects_plans p
      WHERE p.image IS NOT NULL AND NOT EXISTS (SELECT 1 FROM projects_plans_floors f WHERE f._parent_id = p.id)
        AND EXISTS (SELECT 1 FROM projects_plans_rooms r WHERE r._parent_id = p.id);
    INSERT INTO projects_plans_floors_rooms (_order, _parent_id, id, name, area)
      SELECT r._order, f.id, gen_random_uuid()::text, r.name, r.area
      FROM projects_plans_rooms r JOIN projects_plans p ON p.id = r._parent_id
        JOIN projects_plans_floors f ON f._parent_id = p.id AND f._order = 0 AND f.image = p.image
      WHERE NOT EXISTS (SELECT 1 FROM projects_plans_floors_rooms existing WHERE existing._parent_id = f.id);
    UPDATE projects_plans_floors SET label = NULL WHERE label ~ '^[0-9]+ этаж$';
    UPDATE projects SET plans_content_source = 'mock'
      WHERE NOT EXISTS (SELECT 1 FROM projects_plans p WHERE p._parent_id = projects.id)
        OR EXISTS (SELECT 1 FROM projects_plans p WHERE p._parent_id = projects.id AND (
          NOT EXISTS (SELECT 1 FROM projects_plans_floors f WHERE f._parent_id = p.id)
          OR EXISTS (SELECT 1 FROM projects_plans_floors f WHERE f._parent_id = p.id AND
            (f.image IS NULL OR NOT EXISTS (SELECT 1 FROM projects_plans_floors_rooms r WHERE r._parent_id = f.id)))));
  `)
}
export async function down({ db }: MigrateDownArgs): Promise<void> {
  const origin = process.env.CMS_PUBLIC_URL || 'https://cms.avgst.ru'
  await db.execute(sql`
    UPDATE projects_plans_floors f SET image = COALESCE(f.image, (SELECT ${origin} || '/api/media/file/' || filename FROM media WHERE id = f.photo_id), ''), label = COALESCE(f.label, (f._order + 1)::text || ' этаж');
    UPDATE projects_plans SET label = COALESCE(label, 'Вариант ' || (_order + 1)::text);
    ALTER TABLE projects_plans_floors DROP CONSTRAINT projects_plans_floors_photo_id_media_id_fk;
    DROP INDEX projects_plans_floors_photo_idx;
    ALTER TABLE projects_plans_floors ALTER COLUMN label SET NOT NULL;
    ALTER TABLE projects_plans_floors ALTER COLUMN image SET NOT NULL;
    ALTER TABLE projects_plans ALTER COLUMN label SET NOT NULL;
    ALTER TABLE projects_plans_floors DROP COLUMN photo_id;
    ALTER TABLE projects DROP COLUMN plans_content_source;
    DROP TYPE enum_projects_plans_content_source;
  `)
}
