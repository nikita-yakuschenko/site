import { MigrateUpArgs,MigrateDownArgs,sql } from '@payloadcms/db-postgres'
export async function up({db}:MigrateUpArgs):Promise<void>{
 await db.execute(sql`
 CREATE TABLE "request_limits" ("id" serial PRIMARY KEY NOT NULL,"key" varchar NOT NULL,"hits" numeric NOT NULL,"expires_at" timestamp(3) with time zone NOT NULL);
 CREATE UNIQUE INDEX "request_limits_key_idx" ON "request_limits" USING btree ("key");
 CREATE INDEX "request_limits_expires_at_idx" ON "request_limits" USING btree ("expires_at");
 `)
}
export async function down({db}:MigrateDownArgs):Promise<void>{await db.execute(sql`DROP TABLE "request_limits";`)}
