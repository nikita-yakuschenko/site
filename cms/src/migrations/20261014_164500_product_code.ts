import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'
import { defaultConfigurationTemplates } from '../../../src/lib/catalog/configuration-content'
import { generateRecordId } from '../../../src/lib/record-id'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DO $$ BEGIN
    CREATE TYPE "public"."enum_projects_status" AS ENUM('draft', 'published');
   EXCEPTION WHEN duplicate_object THEN NULL;
   END $$;
   DO $$ BEGIN
    CREATE TYPE "public"."enum__projects_v_version_status" AS ENUM('draft', 'published');
   EXCEPTION WHEN duplicate_object THEN NULL;
   END $$;
   ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "_status" "enum_projects_status";
   UPDATE "projects" SET "_status" = 'published' WHERE "_status" IS NULL;
   ALTER TABLE "projects" ALTER COLUMN "_status" SET DEFAULT 'draft';
   CREATE INDEX IF NOT EXISTS "projects__status_idx" ON "projects" ("_status");`)
  const versions = await db.execute(sql`SELECT to_regclass('public._projects_v') AS name`)
  const hasVersions = Boolean((versions.rows[0] as { name?: string } | undefined)?.name)
  if (hasVersions) {
    await db.execute(sql`
     ALTER TABLE "_projects_v" ADD COLUMN IF NOT EXISTS "version__status" "enum__projects_v_version_status";
     UPDATE "_projects_v" SET "version__status" = 'published' WHERE "version__status" IS NULL;
     ALTER TABLE "_projects_v" ALTER COLUMN "version__status" SET DEFAULT 'draft';
     CREATE INDEX IF NOT EXISTS "_projects_v_version_version__status_idx" ON "_projects_v" ("version__status");`)
  }
  await db.execute(sql`
   CREATE TABLE "product_codes" (
  	"code" varchar(8) PRIMARY KEY NOT NULL CHECK ("code" ~ '^[A-Z0-9]{8}$' AND length(regexp_replace("code", '[^0-9]', '', 'g')) = 2),
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  ALTER TABLE "projects" ADD COLUMN "code" varchar;
  CREATE UNIQUE INDEX "projects_code_idx" ON "projects" USING btree ("code");`)
  if (hasVersions) await db.execute(sql`ALTER TABLE "_projects_v" ADD COLUMN "version_code" varchar`)
  const existing = await db.execute(sql`SELECT "id" FROM "projects" WHERE "code" IS NULL`)
  for (const row of existing.rows as { id: number }[]) {
    let code = ''
    for (let attempt = 0; attempt < 20 && !code; attempt++) {
      const candidate = generateRecordId()
      const claimed = await db.execute(sql`INSERT INTO "product_codes" ("code") VALUES (${candidate}) ON CONFLICT DO NOTHING RETURNING "code"`)
      if (claimed.rows.length) code = candidate
    }
    if (!code) throw new Error('Не удалось выдать код существующему проекту')
    await db.execute(sql`UPDATE "projects" SET "code" = ${code} WHERE "id" = ${row.id}`)
    if (hasVersions) await db.execute(sql`UPDATE "_projects_v" SET "version_code" = ${code} WHERE "parent_id" = ${row.id} AND "version_code" IS NULL`)
  }
  const block = await payload.find({ collection: 'blocks', where: { key: { equals: 'ProjectConfig' } }, limit: 1, req, overrideAccess: true })
  if (!block.docs.length) await payload.create({ collection: 'blocks', data: { title: 'Комплектации', key: 'ProjectConfig', source: 'src/components/project-config.tsx', exportName: 'ProjectConfig', configurationTemplates: defaultConfigurationTemplates() }, req, overrideAccess: true })
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "projects_code_idx";
  ALTER TABLE "projects" DROP COLUMN "code";
  DROP TABLE "product_codes" CASCADE;`)
}
