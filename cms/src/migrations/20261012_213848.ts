import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "blocks_parts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"title" varchar NOT NULL
  );
  
  CREATE TABLE "forms_parts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"title" varchar NOT NULL
  );
  
  ALTER TABLE "blocks_parts" ADD CONSTRAINT "blocks_parts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_parts" ADD CONSTRAINT "forms_parts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "blocks_parts_order_idx" ON "blocks_parts" USING btree ("_order");
  CREATE INDEX "blocks_parts_parent_id_idx" ON "blocks_parts" USING btree ("_parent_id");
  CREATE INDEX "forms_parts_order_idx" ON "forms_parts" USING btree ("_order");
  CREATE INDEX "forms_parts_parent_id_idx" ON "forms_parts" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "blocks_parts" CASCADE;
  DROP TABLE "forms_parts" CASCADE;`)
}
