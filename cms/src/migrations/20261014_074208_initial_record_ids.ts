import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'
import { defaultConfigurationTemplates } from '../../../src/lib/catalog/configuration-content'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_role" AS ENUM('super-admin', 'admin', 'editor', 'viewer');
  CREATE TYPE "public"."enum_pages_kind" AS ENUM('page', 'template', 'exposition', 'redirect', 'preview');
  CREATE TYPE "public"."enum_projects_built_type" AS ENUM('photo', 'video');
  CREATE TYPE "public"."enum_projects_built_provider" AS ENUM('kinescope', 'vk');
  CREATE TYPE "public"."enum_projects_configurations_key" AS ENUM('start', 'standard', 'project', 'turnkey');
  CREATE TYPE "public"."enum_projects_ready_home_sections_tone" AS ENUM('quality', 'place');
  CREATE TYPE "public"."enum_projects_record_type" AS ENUM('project', 'ready-home');
  CREATE TYPE "public"."enum_projects_technology_badge" AS ENUM('Панельно-каркасный', 'Модульный');
  CREATE TYPE "public"."enum_projects_series" AS ENUM('panel', 'barn', 'classic', 'modular');
  CREATE TYPE "public"."enum_projects_built_tour_video_provider" AS ENUM('kinescope', 'vk');
  CREATE TYPE "public"."enum_projects_next_steps_settings_order" AS ENUM('visit-first', 'secondary-first');
  CREATE TYPE "public"."enum_projects_hero_content_source" AS ENUM('mock', 'database');
  CREATE TYPE "public"."enum_projects_exteriors_content_source" AS ENUM('mock', 'database');
  CREATE TYPE "public"."enum_projects_interiors_content_source" AS ENUM('mock', 'database');
  CREATE TYPE "public"."enum_projects_plans_content_source" AS ENUM('mock', 'database');
  CREATE TYPE "public"."enum_projects_built_content_source" AS ENUM('mock', 'database');
  CREATE TYPE "public"."enum_projects_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__projects_v_version_built_type" AS ENUM('photo', 'video');
  CREATE TYPE "public"."enum__projects_v_version_built_provider" AS ENUM('kinescope', 'vk');
  CREATE TYPE "public"."enum__projects_v_version_configurations_key" AS ENUM('start', 'standard', 'project', 'turnkey');
  CREATE TYPE "public"."enum__projects_v_version_ready_home_sections_tone" AS ENUM('quality', 'place');
  CREATE TYPE "public"."enum__projects_v_version_record_type" AS ENUM('project', 'ready-home');
  CREATE TYPE "public"."enum__projects_v_version_technology_badge" AS ENUM('Панельно-каркасный', 'Модульный');
  CREATE TYPE "public"."enum__projects_v_version_series" AS ENUM('panel', 'barn', 'classic', 'modular');
  CREATE TYPE "public"."enum__projects_v_version_built_tour_video_provider" AS ENUM('kinescope', 'vk');
  CREATE TYPE "public"."enum__projects_v_version_next_steps_settings_order" AS ENUM('visit-first', 'secondary-first');
  CREATE TYPE "public"."enum__projects_v_version_hero_content_source" AS ENUM('mock', 'database');
  CREATE TYPE "public"."enum__projects_v_version_exteriors_content_source" AS ENUM('mock', 'database');
  CREATE TYPE "public"."enum__projects_v_version_interiors_content_source" AS ENUM('mock', 'database');
  CREATE TYPE "public"."enum__projects_v_version_plans_content_source" AS ENUM('mock', 'database');
  CREATE TYPE "public"."enum__projects_v_version_built_content_source" AS ENUM('mock', 'database');
  CREATE TYPE "public"."enum__projects_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_project_prices_configuration" AS ENUM('start', 'standard', 'project', 'turnkey');
  CREATE TYPE "public"."enum_project_prices_region" AS ENUM('msk', 'nn', 'special', 'dealer');
  CREATE TYPE "public"."enum_lead_submissions_status" AS ENUM('pending', 'test', 'sent', 'failed');
  CREATE TYPE "public"."enum_lead_delivery_mode" AS ENUM('disabled', 'test', 'webhook');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" varchar PRIMARY KEY NOT NULL,
  	"first_name" varchar NOT NULL,
  	"last_name" varchar NOT NULL,
  	"role" "enum_users_role" DEFAULT 'viewer' NOT NULL,
  	"is_blocked" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "pages_layout" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"anchor" varchar,
  	"parameters" jsonb
  );
  
  CREATE TABLE "pages" (
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"route" varchar NOT NULL,
  	"meta_title" varchar NOT NULL,
  	"kind" "enum_pages_kind" DEFAULT 'page' NOT NULL,
  	"source" varchar,
  	"redirect" varchar,
  	"import_key" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "pages_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" varchar NOT NULL,
  	"path" varchar NOT NULL,
  	"blocks_id" varchar,
  	"forms_id" varchar
  );
  
  CREATE TABLE "cfg_p_start_inc" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "cfg_p_start_gift" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "cfg_p_start_dtl_itm" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "cfg_p_start_grp_itm" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "cfg_p_start_grp" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar
  );
  
  CREATE TABLE "cfg_p_start_dtl" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"lead" varchar
  );
  
  CREATE TABLE "cfg_p_standard_inc" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "cfg_p_standard_gift" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "cfg_p_standard_dtl_itm" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "cfg_p_standard_grp_itm" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "cfg_p_standard_grp" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar
  );
  
  CREATE TABLE "cfg_p_standard_dtl" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"lead" varchar
  );
  
  CREATE TABLE "cfg_p_project_inc" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "cfg_p_project_gift" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "cfg_p_project_dtl_itm" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "cfg_p_project_grp_itm" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "cfg_p_project_grp" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar
  );
  
  CREATE TABLE "cfg_p_project_dtl" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"lead" varchar
  );
  
  CREATE TABLE "cfg_m_standard_inc" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "cfg_m_standard_gift" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "cfg_m_standard_dtl_itm" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "cfg_m_standard_grp_itm" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "cfg_m_standard_grp" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar
  );
  
  CREATE TABLE "cfg_m_standard_dtl" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"lead" varchar
  );
  
  CREATE TABLE "cfg_m_project_inc" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "cfg_m_project_gift" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "cfg_m_project_dtl_itm" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "cfg_m_project_grp_itm" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "cfg_m_project_grp" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar
  );
  
  CREATE TABLE "cfg_m_project_dtl" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"lead" varchar
  );
  
  CREATE TABLE "cfg_m_turnkey_inc" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "cfg_m_turnkey_gift" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "cfg_m_turnkey_dtl_itm" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "cfg_m_turnkey_grp_itm" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "cfg_m_turnkey_grp" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar
  );
  
  CREATE TABLE "cfg_m_turnkey_dtl" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"lead" varchar
  );
  
  CREATE TABLE "blocks_parts" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"title" varchar
  );
  
  CREATE TABLE "blocks" (
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"configuration_templates_panel_start_lead" varchar DEFAULT 'Основа дома. Силовой каркас с утеплением из сухой строганой доски. Изготавливаем на своём производстве.',
  	"configuration_templates_panel_standard_lead" varchar DEFAULT 'Завершённый образ дома. Силовой каркас, кровля, окна и входные двери, наружная отделка.',
  	"configuration_templates_panel_project_lead" varchar DEFAULT 'Архитектура дома выполнена согласно проекту: большие окна, терраса и внутренняя отделка стен.',
  	"configuration_templates_modular_standard_lead" varchar DEFAULT 'Завершённый образ дома. Силовой каркас, кровля, окна и входные двери, наружная отделка.',
  	"configuration_templates_modular_project_lead" varchar DEFAULT 'Архитектура дома выполнена согласно проекту: большие окна, терраса и внутренняя отделка стен.',
  	"configuration_templates_modular_turnkey_lead" varchar DEFAULT 'Чистовая отделка стен, потолков и пола, в ванной — керамогранит, подключены инженерные коммуникации и электрика. Вам остаётся только выбрать мебель.',
  	"key" varchar,
  	"source" varchar,
  	"export_name" varchar,
  	"defaults" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "blocks_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" varchar NOT NULL,
  	"path" varchar NOT NULL,
  	"forms_id" varchar
  );
  
  CREATE TABLE "forms_parts" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"title" varchar
  );
  
  CREATE TABLE "forms" (
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"key" varchar,
  	"source" varchar,
  	"export_name" varchar,
  	"defaults" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "projects_exteriors" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"photo_id" varchar,
  	"image" varchar,
  	"is_primary" boolean DEFAULT false
  );
  
  CREATE TABLE "projects_floor_plans" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image" varchar
  );
  
  CREATE TABLE "projects_plans_rooms" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"area" varchar
  );
  
  CREATE TABLE "projects_plans_floors_rooms" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"area" varchar
  );
  
  CREATE TABLE "projects_plans_floors" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"photo_id" varchar,
  	"image" varchar
  );
  
  CREATE TABLE "projects_plans" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"image" varchar
  );
  
  CREATE TABLE "projects_interiors" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"photo_id" varchar,
  	"image" varchar
  );
  
  CREATE TABLE "projects_built" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"type" "enum_projects_built_type" DEFAULT 'photo',
  	"is_primary" boolean DEFAULT false,
  	"provider" "enum_projects_built_provider",
  	"video_url" varchar,
  	"photo_id" varchar,
  	"image" varchar,
  	"caption" varchar
  );
  
  CREATE TABLE "projects_configurations_includes" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "projects_configurations_gifts" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "projects_configurations_details_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "projects_configurations_details_groups_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "projects_configurations_details_groups" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar
  );
  
  CREATE TABLE "projects_configurations_details" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"lead" varchar
  );
  
  CREATE TABLE "projects_configurations" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" "enum_projects_configurations_key",
  	"name" varchar,
  	"price" numeric,
  	"lead" varchar,
  	"mortgage" boolean
  );
  
  CREATE TABLE "projects_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"name" varchar,
  	"price" numeric,
  	"default_selected" boolean
  );
  
  CREATE TABLE "projects_ready_home_configuration" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "projects_ready_home_sections_points_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "projects_ready_home_sections_points" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar
  );
  
  CREATE TABLE "projects_ready_home_sections" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"tone" "enum_projects_ready_home_sections_tone"
  );
  
  CREATE TABLE "projects_about" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"image" varchar
  );
  
  CREATE TABLE "projects" (
  	"id" varchar PRIMARY KEY NOT NULL,
  	"record_type" "enum_projects_record_type" DEFAULT 'project',
  	"slug" varchar,
  	"block_order" jsonb,
  	"name" varchar,
  	"desktop_image_id" varchar,
  	"image_url" varchar,
  	"mobile_image_id" varchar,
  	"mobile_image_url" varchar,
  	"technology_badge" "enum_projects_technology_badge",
  	"series" "enum_projects_series",
  	"area_value" numeric,
  	"floors_value" numeric,
  	"bedrooms" numeric,
  	"bathrooms" numeric,
  	"built_tour_title" varchar,
  	"built_tour_cover" varchar,
  	"built_tour_video_provider" "enum_projects_built_tour_video_provider",
  	"built_tour_video_oid" numeric,
  	"price_amount" numeric,
  	"ready_home_location" varchar,
  	"ready_home_location_prepositional" varchar,
  	"ready_home_sale_price" numeric,
  	"ready_home_configuration_lead" varchar,
  	"ready_home_visit_image" varchar,
  	"next_steps_settings_enabled" boolean DEFAULT true,
  	"next_steps_settings_visit_enabled" boolean DEFAULT true,
  	"next_steps_settings_secondary_enabled" boolean DEFAULT true,
  	"next_steps_settings_order" "enum_projects_next_steps_settings_order" DEFAULT 'visit-first',
  	"description" varchar,
  	"search_description" varchar,
  	"import_key" varchar,
  	"hero_content_source" "enum_projects_hero_content_source" DEFAULT 'mock',
  	"exteriors_content_source" "enum_projects_exteriors_content_source" DEFAULT 'mock',
  	"interiors_content_source" "enum_projects_interiors_content_source" DEFAULT 'mock',
  	"plans_content_source" "enum_projects_plans_content_source" DEFAULT 'database',
  	"built_content_source" "enum_projects_built_content_source" DEFAULT 'mock',
  	"content_imported" boolean,
  	"configurations_imported" boolean,
  	"legacy_configurations" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_projects_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_projects_v_version_exteriors" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"photo_id" varchar,
  	"image" varchar,
  	"is_primary" boolean DEFAULT false,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_projects_v_version_floor_plans" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_projects_v_version_plans_rooms" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"area" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_projects_v_version_plans_floors_rooms" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"area" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_projects_v_version_plans_floors" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"photo_id" varchar,
  	"image" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_projects_v_version_plans" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"image" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_projects_v_version_interiors" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"photo_id" varchar,
  	"image" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_projects_v_version_built" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"type" "enum__projects_v_version_built_type" DEFAULT 'photo',
  	"is_primary" boolean DEFAULT false,
  	"provider" "enum__projects_v_version_built_provider",
  	"video_url" varchar,
  	"photo_id" varchar,
  	"image" varchar,
  	"caption" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_projects_v_version_configurations_includes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_projects_v_version_configurations_gifts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_projects_v_version_configurations_details_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_projects_v_version_configurations_details_groups_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_projects_v_version_configurations_details_groups" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_projects_v_version_configurations_details" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"lead" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_projects_v_version_configurations" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" "enum__projects_v_version_configurations_key",
  	"name" varchar,
  	"price" numeric,
  	"lead" varchar,
  	"mortgage" boolean,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_projects_v_version_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"name" varchar,
  	"price" numeric,
  	"default_selected" boolean,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_projects_v_version_ready_home_configuration" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_projects_v_version_ready_home_sections_points_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_projects_v_version_ready_home_sections_points" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_projects_v_version_ready_home_sections" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"tone" "enum__projects_v_version_ready_home_sections_tone",
  	"_uuid" varchar
  );
  
  CREATE TABLE "_projects_v_version_about" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"image" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_projects_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" varchar,
  	"version_record_type" "enum__projects_v_version_record_type" DEFAULT 'project',
  	"version_slug" varchar,
  	"version_block_order" jsonb,
  	"version_name" varchar,
  	"version_desktop_image_id" varchar,
  	"version_image_url" varchar,
  	"version_mobile_image_id" varchar,
  	"version_mobile_image_url" varchar,
  	"version_technology_badge" "enum__projects_v_version_technology_badge",
  	"version_series" "enum__projects_v_version_series",
  	"version_area_value" numeric,
  	"version_floors_value" numeric,
  	"version_bedrooms" numeric,
  	"version_bathrooms" numeric,
  	"version_built_tour_title" varchar,
  	"version_built_tour_cover" varchar,
  	"version_built_tour_video_provider" "enum__projects_v_version_built_tour_video_provider",
  	"version_built_tour_video_oid" numeric,
  	"version_price_amount" numeric,
  	"version_ready_home_location" varchar,
  	"version_ready_home_location_prepositional" varchar,
  	"version_ready_home_sale_price" numeric,
  	"version_ready_home_configuration_lead" varchar,
  	"version_ready_home_visit_image" varchar,
  	"version_next_steps_settings_enabled" boolean DEFAULT true,
  	"version_next_steps_settings_visit_enabled" boolean DEFAULT true,
  	"version_next_steps_settings_secondary_enabled" boolean DEFAULT true,
  	"version_next_steps_settings_order" "enum__projects_v_version_next_steps_settings_order" DEFAULT 'visit-first',
  	"version_description" varchar,
  	"version_search_description" varchar,
  	"version_import_key" varchar,
  	"version_hero_content_source" "enum__projects_v_version_hero_content_source" DEFAULT 'mock',
  	"version_exteriors_content_source" "enum__projects_v_version_exteriors_content_source" DEFAULT 'mock',
  	"version_interiors_content_source" "enum__projects_v_version_interiors_content_source" DEFAULT 'mock',
  	"version_plans_content_source" "enum__projects_v_version_plans_content_source" DEFAULT 'database',
  	"version_built_content_source" "enum__projects_v_version_built_content_source" DEFAULT 'mock',
  	"version_content_imported" boolean,
  	"version_configurations_imported" boolean,
  	"version_legacy_configurations" jsonb,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__projects_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "project_prices" (
  	"id" varchar PRIMARY KEY NOT NULL,
  	"lookup_key" varchar NOT NULL,
  	"project_id" varchar NOT NULL,
  	"configuration" "enum_project_prices_configuration" NOT NULL,
  	"region" "enum_project_prices_region" NOT NULL,
  	"price" numeric NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "lead_submissions" (
  	"id" varchar PRIMARY KEY NOT NULL,
  	"request_id" varchar NOT NULL,
  	"form_id" varchar NOT NULL,
  	"status" "enum_lead_submissions_status" NOT NULL,
  	"payload" jsonb NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "media" (
  	"id" varchar PRIMARY KEY NOT NULL,
  	"alt" varchar,
  	"title" varchar,
  	"description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumbnail_url" varchar,
  	"sizes_thumbnail_width" numeric,
  	"sizes_thumbnail_height" numeric,
  	"sizes_thumbnail_mime_type" varchar,
  	"sizes_thumbnail_filesize" numeric,
  	"sizes_thumbnail_filename" varchar
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" varchar,
  	"pages_id" varchar,
  	"blocks_id" varchar,
  	"forms_id" varchar,
  	"projects_id" varchar,
  	"project_prices_id" varchar,
  	"lead_submissions_id" varchar,
  	"media_id" varchar
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" varchar
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "lead_delivery" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"mode" "enum_lead_delivery_mode" DEFAULT 'disabled' NOT NULL,
  	"url" varchar,
  	"authorization_env" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_layout" ADD CONSTRAINT "pages_layout_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_blocks_fk" FOREIGN KEY ("blocks_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_forms_fk" FOREIGN KEY ("forms_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_p_start_inc" ADD CONSTRAINT "cfg_p_start_inc_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_p_start_gift" ADD CONSTRAINT "cfg_p_start_gift_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_p_start_dtl_itm" ADD CONSTRAINT "cfg_p_start_dtl_itm_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cfg_p_start_dtl"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_p_start_grp_itm" ADD CONSTRAINT "cfg_p_start_grp_itm_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cfg_p_start_grp"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_p_start_grp" ADD CONSTRAINT "cfg_p_start_grp_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cfg_p_start_dtl"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_p_start_dtl" ADD CONSTRAINT "cfg_p_start_dtl_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_p_standard_inc" ADD CONSTRAINT "cfg_p_standard_inc_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_p_standard_gift" ADD CONSTRAINT "cfg_p_standard_gift_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_p_standard_dtl_itm" ADD CONSTRAINT "cfg_p_standard_dtl_itm_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cfg_p_standard_dtl"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_p_standard_grp_itm" ADD CONSTRAINT "cfg_p_standard_grp_itm_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cfg_p_standard_grp"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_p_standard_grp" ADD CONSTRAINT "cfg_p_standard_grp_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cfg_p_standard_dtl"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_p_standard_dtl" ADD CONSTRAINT "cfg_p_standard_dtl_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_p_project_inc" ADD CONSTRAINT "cfg_p_project_inc_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_p_project_gift" ADD CONSTRAINT "cfg_p_project_gift_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_p_project_dtl_itm" ADD CONSTRAINT "cfg_p_project_dtl_itm_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cfg_p_project_dtl"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_p_project_grp_itm" ADD CONSTRAINT "cfg_p_project_grp_itm_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cfg_p_project_grp"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_p_project_grp" ADD CONSTRAINT "cfg_p_project_grp_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cfg_p_project_dtl"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_p_project_dtl" ADD CONSTRAINT "cfg_p_project_dtl_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_m_standard_inc" ADD CONSTRAINT "cfg_m_standard_inc_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_m_standard_gift" ADD CONSTRAINT "cfg_m_standard_gift_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_m_standard_dtl_itm" ADD CONSTRAINT "cfg_m_standard_dtl_itm_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cfg_m_standard_dtl"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_m_standard_grp_itm" ADD CONSTRAINT "cfg_m_standard_grp_itm_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cfg_m_standard_grp"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_m_standard_grp" ADD CONSTRAINT "cfg_m_standard_grp_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cfg_m_standard_dtl"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_m_standard_dtl" ADD CONSTRAINT "cfg_m_standard_dtl_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_m_project_inc" ADD CONSTRAINT "cfg_m_project_inc_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_m_project_gift" ADD CONSTRAINT "cfg_m_project_gift_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_m_project_dtl_itm" ADD CONSTRAINT "cfg_m_project_dtl_itm_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cfg_m_project_dtl"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_m_project_grp_itm" ADD CONSTRAINT "cfg_m_project_grp_itm_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cfg_m_project_grp"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_m_project_grp" ADD CONSTRAINT "cfg_m_project_grp_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cfg_m_project_dtl"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_m_project_dtl" ADD CONSTRAINT "cfg_m_project_dtl_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_m_turnkey_inc" ADD CONSTRAINT "cfg_m_turnkey_inc_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_m_turnkey_gift" ADD CONSTRAINT "cfg_m_turnkey_gift_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_m_turnkey_dtl_itm" ADD CONSTRAINT "cfg_m_turnkey_dtl_itm_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cfg_m_turnkey_dtl"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_m_turnkey_grp_itm" ADD CONSTRAINT "cfg_m_turnkey_grp_itm_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cfg_m_turnkey_grp"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_m_turnkey_grp" ADD CONSTRAINT "cfg_m_turnkey_grp_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cfg_m_turnkey_dtl"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cfg_m_turnkey_dtl" ADD CONSTRAINT "cfg_m_turnkey_dtl_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "blocks_parts" ADD CONSTRAINT "blocks_parts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "blocks_rels" ADD CONSTRAINT "blocks_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "blocks_rels" ADD CONSTRAINT "blocks_rels_forms_fk" FOREIGN KEY ("forms_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_parts" ADD CONSTRAINT "forms_parts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_exteriors" ADD CONSTRAINT "projects_exteriors_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "projects_exteriors" ADD CONSTRAINT "projects_exteriors_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_floor_plans" ADD CONSTRAINT "projects_floor_plans_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_plans_rooms" ADD CONSTRAINT "projects_plans_rooms_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects_plans"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_plans_floors_rooms" ADD CONSTRAINT "projects_plans_floors_rooms_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects_plans_floors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_plans_floors" ADD CONSTRAINT "projects_plans_floors_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "projects_plans_floors" ADD CONSTRAINT "projects_plans_floors_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects_plans"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_plans" ADD CONSTRAINT "projects_plans_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_interiors" ADD CONSTRAINT "projects_interiors_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "projects_interiors" ADD CONSTRAINT "projects_interiors_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_built" ADD CONSTRAINT "projects_built_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "projects_built" ADD CONSTRAINT "projects_built_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_configurations_includes" ADD CONSTRAINT "projects_configurations_includes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects_configurations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_configurations_gifts" ADD CONSTRAINT "projects_configurations_gifts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects_configurations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_configurations_details_items" ADD CONSTRAINT "projects_configurations_details_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects_configurations_details"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_configurations_details_groups_items" ADD CONSTRAINT "projects_configurations_details_groups_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects_configurations_details_groups"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_configurations_details_groups" ADD CONSTRAINT "projects_configurations_details_groups_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects_configurations_details"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_configurations_details" ADD CONSTRAINT "projects_configurations_details_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects_configurations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_configurations" ADD CONSTRAINT "projects_configurations_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_options" ADD CONSTRAINT "projects_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_ready_home_configuration" ADD CONSTRAINT "projects_ready_home_configuration_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_ready_home_sections_points_items" ADD CONSTRAINT "projects_ready_home_sections_points_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects_ready_home_sections_points"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_ready_home_sections_points" ADD CONSTRAINT "projects_ready_home_sections_points_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects_ready_home_sections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_ready_home_sections" ADD CONSTRAINT "projects_ready_home_sections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_about" ADD CONSTRAINT "projects_about_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects" ADD CONSTRAINT "projects_desktop_image_id_media_id_fk" FOREIGN KEY ("desktop_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "projects" ADD CONSTRAINT "projects_mobile_image_id_media_id_fk" FOREIGN KEY ("mobile_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_projects_v_version_exteriors" ADD CONSTRAINT "_projects_v_version_exteriors_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_projects_v_version_exteriors" ADD CONSTRAINT "_projects_v_version_exteriors_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_projects_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_projects_v_version_floor_plans" ADD CONSTRAINT "_projects_v_version_floor_plans_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_projects_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_projects_v_version_plans_rooms" ADD CONSTRAINT "_projects_v_version_plans_rooms_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_projects_v_version_plans"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_projects_v_version_plans_floors_rooms" ADD CONSTRAINT "_projects_v_version_plans_floors_rooms_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_projects_v_version_plans_floors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_projects_v_version_plans_floors" ADD CONSTRAINT "_projects_v_version_plans_floors_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_projects_v_version_plans_floors" ADD CONSTRAINT "_projects_v_version_plans_floors_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_projects_v_version_plans"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_projects_v_version_plans" ADD CONSTRAINT "_projects_v_version_plans_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_projects_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_projects_v_version_interiors" ADD CONSTRAINT "_projects_v_version_interiors_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_projects_v_version_interiors" ADD CONSTRAINT "_projects_v_version_interiors_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_projects_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_projects_v_version_built" ADD CONSTRAINT "_projects_v_version_built_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_projects_v_version_built" ADD CONSTRAINT "_projects_v_version_built_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_projects_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_projects_v_version_configurations_includes" ADD CONSTRAINT "_projects_v_version_configurations_includes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_projects_v_version_configurations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_projects_v_version_configurations_gifts" ADD CONSTRAINT "_projects_v_version_configurations_gifts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_projects_v_version_configurations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_projects_v_version_configurations_details_items" ADD CONSTRAINT "_projects_v_version_configurations_details_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_projects_v_version_configurations_details"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_projects_v_version_configurations_details_groups_items" ADD CONSTRAINT "_projects_v_version_configurations_details_groups_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_projects_v_version_configurations_details_groups"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_projects_v_version_configurations_details_groups" ADD CONSTRAINT "_projects_v_version_configurations_details_groups_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_projects_v_version_configurations_details"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_projects_v_version_configurations_details" ADD CONSTRAINT "_projects_v_version_configurations_details_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_projects_v_version_configurations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_projects_v_version_configurations" ADD CONSTRAINT "_projects_v_version_configurations_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_projects_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_projects_v_version_options" ADD CONSTRAINT "_projects_v_version_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_projects_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_projects_v_version_ready_home_configuration" ADD CONSTRAINT "_projects_v_version_ready_home_configuration_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_projects_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_projects_v_version_ready_home_sections_points_items" ADD CONSTRAINT "_projects_v_version_ready_home_sections_points_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_projects_v_version_ready_home_sections_points"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_projects_v_version_ready_home_sections_points" ADD CONSTRAINT "_projects_v_version_ready_home_sections_points_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_projects_v_version_ready_home_sections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_projects_v_version_ready_home_sections" ADD CONSTRAINT "_projects_v_version_ready_home_sections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_projects_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_projects_v_version_about" ADD CONSTRAINT "_projects_v_version_about_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_projects_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_projects_v" ADD CONSTRAINT "_projects_v_parent_id_projects_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_projects_v" ADD CONSTRAINT "_projects_v_version_desktop_image_id_media_id_fk" FOREIGN KEY ("version_desktop_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_projects_v" ADD CONSTRAINT "_projects_v_version_mobile_image_id_media_id_fk" FOREIGN KEY ("version_mobile_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "project_prices" ADD CONSTRAINT "project_prices_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_blocks_fk" FOREIGN KEY ("blocks_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_forms_fk" FOREIGN KEY ("forms_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_projects_fk" FOREIGN KEY ("projects_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_project_prices_fk" FOREIGN KEY ("project_prices_id") REFERENCES "public"."project_prices"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_lead_submissions_fk" FOREIGN KEY ("lead_submissions_id") REFERENCES "public"."lead_submissions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "pages_layout_order_idx" ON "pages_layout" USING btree ("_order");
  CREATE INDEX "pages_layout_parent_id_idx" ON "pages_layout" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_route_idx" ON "pages" USING btree ("route");
  CREATE UNIQUE INDEX "pages_import_key_idx" ON "pages" USING btree ("import_key");
  CREATE INDEX "pages_updated_at_idx" ON "pages" USING btree ("updated_at");
  CREATE INDEX "pages_created_at_idx" ON "pages" USING btree ("created_at");
  CREATE INDEX "pages_rels_order_idx" ON "pages_rels" USING btree ("order");
  CREATE INDEX "pages_rels_parent_idx" ON "pages_rels" USING btree ("parent_id");
  CREATE INDEX "pages_rels_path_idx" ON "pages_rels" USING btree ("path");
  CREATE INDEX "pages_rels_blocks_id_idx" ON "pages_rels" USING btree ("blocks_id");
  CREATE INDEX "pages_rels_forms_id_idx" ON "pages_rels" USING btree ("forms_id");
  CREATE INDEX "cfg_p_start_inc_order_idx" ON "cfg_p_start_inc" USING btree ("_order");
  CREATE INDEX "cfg_p_start_inc_parent_id_idx" ON "cfg_p_start_inc" USING btree ("_parent_id");
  CREATE INDEX "cfg_p_start_gift_order_idx" ON "cfg_p_start_gift" USING btree ("_order");
  CREATE INDEX "cfg_p_start_gift_parent_id_idx" ON "cfg_p_start_gift" USING btree ("_parent_id");
  CREATE INDEX "cfg_p_start_dtl_itm_order_idx" ON "cfg_p_start_dtl_itm" USING btree ("_order");
  CREATE INDEX "cfg_p_start_dtl_itm_parent_id_idx" ON "cfg_p_start_dtl_itm" USING btree ("_parent_id");
  CREATE INDEX "cfg_p_start_grp_itm_order_idx" ON "cfg_p_start_grp_itm" USING btree ("_order");
  CREATE INDEX "cfg_p_start_grp_itm_parent_id_idx" ON "cfg_p_start_grp_itm" USING btree ("_parent_id");
  CREATE INDEX "cfg_p_start_grp_order_idx" ON "cfg_p_start_grp" USING btree ("_order");
  CREATE INDEX "cfg_p_start_grp_parent_id_idx" ON "cfg_p_start_grp" USING btree ("_parent_id");
  CREATE INDEX "cfg_p_start_dtl_order_idx" ON "cfg_p_start_dtl" USING btree ("_order");
  CREATE INDEX "cfg_p_start_dtl_parent_id_idx" ON "cfg_p_start_dtl" USING btree ("_parent_id");
  CREATE INDEX "cfg_p_standard_inc_order_idx" ON "cfg_p_standard_inc" USING btree ("_order");
  CREATE INDEX "cfg_p_standard_inc_parent_id_idx" ON "cfg_p_standard_inc" USING btree ("_parent_id");
  CREATE INDEX "cfg_p_standard_gift_order_idx" ON "cfg_p_standard_gift" USING btree ("_order");
  CREATE INDEX "cfg_p_standard_gift_parent_id_idx" ON "cfg_p_standard_gift" USING btree ("_parent_id");
  CREATE INDEX "cfg_p_standard_dtl_itm_order_idx" ON "cfg_p_standard_dtl_itm" USING btree ("_order");
  CREATE INDEX "cfg_p_standard_dtl_itm_parent_id_idx" ON "cfg_p_standard_dtl_itm" USING btree ("_parent_id");
  CREATE INDEX "cfg_p_standard_grp_itm_order_idx" ON "cfg_p_standard_grp_itm" USING btree ("_order");
  CREATE INDEX "cfg_p_standard_grp_itm_parent_id_idx" ON "cfg_p_standard_grp_itm" USING btree ("_parent_id");
  CREATE INDEX "cfg_p_standard_grp_order_idx" ON "cfg_p_standard_grp" USING btree ("_order");
  CREATE INDEX "cfg_p_standard_grp_parent_id_idx" ON "cfg_p_standard_grp" USING btree ("_parent_id");
  CREATE INDEX "cfg_p_standard_dtl_order_idx" ON "cfg_p_standard_dtl" USING btree ("_order");
  CREATE INDEX "cfg_p_standard_dtl_parent_id_idx" ON "cfg_p_standard_dtl" USING btree ("_parent_id");
  CREATE INDEX "cfg_p_project_inc_order_idx" ON "cfg_p_project_inc" USING btree ("_order");
  CREATE INDEX "cfg_p_project_inc_parent_id_idx" ON "cfg_p_project_inc" USING btree ("_parent_id");
  CREATE INDEX "cfg_p_project_gift_order_idx" ON "cfg_p_project_gift" USING btree ("_order");
  CREATE INDEX "cfg_p_project_gift_parent_id_idx" ON "cfg_p_project_gift" USING btree ("_parent_id");
  CREATE INDEX "cfg_p_project_dtl_itm_order_idx" ON "cfg_p_project_dtl_itm" USING btree ("_order");
  CREATE INDEX "cfg_p_project_dtl_itm_parent_id_idx" ON "cfg_p_project_dtl_itm" USING btree ("_parent_id");
  CREATE INDEX "cfg_p_project_grp_itm_order_idx" ON "cfg_p_project_grp_itm" USING btree ("_order");
  CREATE INDEX "cfg_p_project_grp_itm_parent_id_idx" ON "cfg_p_project_grp_itm" USING btree ("_parent_id");
  CREATE INDEX "cfg_p_project_grp_order_idx" ON "cfg_p_project_grp" USING btree ("_order");
  CREATE INDEX "cfg_p_project_grp_parent_id_idx" ON "cfg_p_project_grp" USING btree ("_parent_id");
  CREATE INDEX "cfg_p_project_dtl_order_idx" ON "cfg_p_project_dtl" USING btree ("_order");
  CREATE INDEX "cfg_p_project_dtl_parent_id_idx" ON "cfg_p_project_dtl" USING btree ("_parent_id");
  CREATE INDEX "cfg_m_standard_inc_order_idx" ON "cfg_m_standard_inc" USING btree ("_order");
  CREATE INDEX "cfg_m_standard_inc_parent_id_idx" ON "cfg_m_standard_inc" USING btree ("_parent_id");
  CREATE INDEX "cfg_m_standard_gift_order_idx" ON "cfg_m_standard_gift" USING btree ("_order");
  CREATE INDEX "cfg_m_standard_gift_parent_id_idx" ON "cfg_m_standard_gift" USING btree ("_parent_id");
  CREATE INDEX "cfg_m_standard_dtl_itm_order_idx" ON "cfg_m_standard_dtl_itm" USING btree ("_order");
  CREATE INDEX "cfg_m_standard_dtl_itm_parent_id_idx" ON "cfg_m_standard_dtl_itm" USING btree ("_parent_id");
  CREATE INDEX "cfg_m_standard_grp_itm_order_idx" ON "cfg_m_standard_grp_itm" USING btree ("_order");
  CREATE INDEX "cfg_m_standard_grp_itm_parent_id_idx" ON "cfg_m_standard_grp_itm" USING btree ("_parent_id");
  CREATE INDEX "cfg_m_standard_grp_order_idx" ON "cfg_m_standard_grp" USING btree ("_order");
  CREATE INDEX "cfg_m_standard_grp_parent_id_idx" ON "cfg_m_standard_grp" USING btree ("_parent_id");
  CREATE INDEX "cfg_m_standard_dtl_order_idx" ON "cfg_m_standard_dtl" USING btree ("_order");
  CREATE INDEX "cfg_m_standard_dtl_parent_id_idx" ON "cfg_m_standard_dtl" USING btree ("_parent_id");
  CREATE INDEX "cfg_m_project_inc_order_idx" ON "cfg_m_project_inc" USING btree ("_order");
  CREATE INDEX "cfg_m_project_inc_parent_id_idx" ON "cfg_m_project_inc" USING btree ("_parent_id");
  CREATE INDEX "cfg_m_project_gift_order_idx" ON "cfg_m_project_gift" USING btree ("_order");
  CREATE INDEX "cfg_m_project_gift_parent_id_idx" ON "cfg_m_project_gift" USING btree ("_parent_id");
  CREATE INDEX "cfg_m_project_dtl_itm_order_idx" ON "cfg_m_project_dtl_itm" USING btree ("_order");
  CREATE INDEX "cfg_m_project_dtl_itm_parent_id_idx" ON "cfg_m_project_dtl_itm" USING btree ("_parent_id");
  CREATE INDEX "cfg_m_project_grp_itm_order_idx" ON "cfg_m_project_grp_itm" USING btree ("_order");
  CREATE INDEX "cfg_m_project_grp_itm_parent_id_idx" ON "cfg_m_project_grp_itm" USING btree ("_parent_id");
  CREATE INDEX "cfg_m_project_grp_order_idx" ON "cfg_m_project_grp" USING btree ("_order");
  CREATE INDEX "cfg_m_project_grp_parent_id_idx" ON "cfg_m_project_grp" USING btree ("_parent_id");
  CREATE INDEX "cfg_m_project_dtl_order_idx" ON "cfg_m_project_dtl" USING btree ("_order");
  CREATE INDEX "cfg_m_project_dtl_parent_id_idx" ON "cfg_m_project_dtl" USING btree ("_parent_id");
  CREATE INDEX "cfg_m_turnkey_inc_order_idx" ON "cfg_m_turnkey_inc" USING btree ("_order");
  CREATE INDEX "cfg_m_turnkey_inc_parent_id_idx" ON "cfg_m_turnkey_inc" USING btree ("_parent_id");
  CREATE INDEX "cfg_m_turnkey_gift_order_idx" ON "cfg_m_turnkey_gift" USING btree ("_order");
  CREATE INDEX "cfg_m_turnkey_gift_parent_id_idx" ON "cfg_m_turnkey_gift" USING btree ("_parent_id");
  CREATE INDEX "cfg_m_turnkey_dtl_itm_order_idx" ON "cfg_m_turnkey_dtl_itm" USING btree ("_order");
  CREATE INDEX "cfg_m_turnkey_dtl_itm_parent_id_idx" ON "cfg_m_turnkey_dtl_itm" USING btree ("_parent_id");
  CREATE INDEX "cfg_m_turnkey_grp_itm_order_idx" ON "cfg_m_turnkey_grp_itm" USING btree ("_order");
  CREATE INDEX "cfg_m_turnkey_grp_itm_parent_id_idx" ON "cfg_m_turnkey_grp_itm" USING btree ("_parent_id");
  CREATE INDEX "cfg_m_turnkey_grp_order_idx" ON "cfg_m_turnkey_grp" USING btree ("_order");
  CREATE INDEX "cfg_m_turnkey_grp_parent_id_idx" ON "cfg_m_turnkey_grp" USING btree ("_parent_id");
  CREATE INDEX "cfg_m_turnkey_dtl_order_idx" ON "cfg_m_turnkey_dtl" USING btree ("_order");
  CREATE INDEX "cfg_m_turnkey_dtl_parent_id_idx" ON "cfg_m_turnkey_dtl" USING btree ("_parent_id");
  CREATE INDEX "blocks_parts_order_idx" ON "blocks_parts" USING btree ("_order");
  CREATE INDEX "blocks_parts_parent_id_idx" ON "blocks_parts" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "blocks_key_idx" ON "blocks" USING btree ("key");
  CREATE INDEX "blocks_updated_at_idx" ON "blocks" USING btree ("updated_at");
  CREATE INDEX "blocks_created_at_idx" ON "blocks" USING btree ("created_at");
  CREATE INDEX "blocks_rels_order_idx" ON "blocks_rels" USING btree ("order");
  CREATE INDEX "blocks_rels_parent_idx" ON "blocks_rels" USING btree ("parent_id");
  CREATE INDEX "blocks_rels_path_idx" ON "blocks_rels" USING btree ("path");
  CREATE INDEX "blocks_rels_forms_id_idx" ON "blocks_rels" USING btree ("forms_id");
  CREATE INDEX "forms_parts_order_idx" ON "forms_parts" USING btree ("_order");
  CREATE INDEX "forms_parts_parent_id_idx" ON "forms_parts" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "forms_key_idx" ON "forms" USING btree ("key");
  CREATE INDEX "forms_updated_at_idx" ON "forms" USING btree ("updated_at");
  CREATE INDEX "forms_created_at_idx" ON "forms" USING btree ("created_at");
  CREATE INDEX "projects_exteriors_order_idx" ON "projects_exteriors" USING btree ("_order");
  CREATE INDEX "projects_exteriors_parent_id_idx" ON "projects_exteriors" USING btree ("_parent_id");
  CREATE INDEX "projects_exteriors_photo_idx" ON "projects_exteriors" USING btree ("photo_id");
  CREATE INDEX "projects_floor_plans_order_idx" ON "projects_floor_plans" USING btree ("_order");
  CREATE INDEX "projects_floor_plans_parent_id_idx" ON "projects_floor_plans" USING btree ("_parent_id");
  CREATE INDEX "projects_plans_rooms_order_idx" ON "projects_plans_rooms" USING btree ("_order");
  CREATE INDEX "projects_plans_rooms_parent_id_idx" ON "projects_plans_rooms" USING btree ("_parent_id");
  CREATE INDEX "projects_plans_floors_rooms_order_idx" ON "projects_plans_floors_rooms" USING btree ("_order");
  CREATE INDEX "projects_plans_floors_rooms_parent_id_idx" ON "projects_plans_floors_rooms" USING btree ("_parent_id");
  CREATE INDEX "projects_plans_floors_order_idx" ON "projects_plans_floors" USING btree ("_order");
  CREATE INDEX "projects_plans_floors_parent_id_idx" ON "projects_plans_floors" USING btree ("_parent_id");
  CREATE INDEX "projects_plans_floors_photo_idx" ON "projects_plans_floors" USING btree ("photo_id");
  CREATE INDEX "projects_plans_order_idx" ON "projects_plans" USING btree ("_order");
  CREATE INDEX "projects_plans_parent_id_idx" ON "projects_plans" USING btree ("_parent_id");
  CREATE INDEX "projects_interiors_order_idx" ON "projects_interiors" USING btree ("_order");
  CREATE INDEX "projects_interiors_parent_id_idx" ON "projects_interiors" USING btree ("_parent_id");
  CREATE INDEX "projects_interiors_photo_idx" ON "projects_interiors" USING btree ("photo_id");
  CREATE INDEX "projects_built_order_idx" ON "projects_built" USING btree ("_order");
  CREATE INDEX "projects_built_parent_id_idx" ON "projects_built" USING btree ("_parent_id");
  CREATE INDEX "projects_built_photo_idx" ON "projects_built" USING btree ("photo_id");
  CREATE INDEX "projects_configurations_includes_order_idx" ON "projects_configurations_includes" USING btree ("_order");
  CREATE INDEX "projects_configurations_includes_parent_id_idx" ON "projects_configurations_includes" USING btree ("_parent_id");
  CREATE INDEX "projects_configurations_gifts_order_idx" ON "projects_configurations_gifts" USING btree ("_order");
  CREATE INDEX "projects_configurations_gifts_parent_id_idx" ON "projects_configurations_gifts" USING btree ("_parent_id");
  CREATE INDEX "projects_configurations_details_items_order_idx" ON "projects_configurations_details_items" USING btree ("_order");
  CREATE INDEX "projects_configurations_details_items_parent_id_idx" ON "projects_configurations_details_items" USING btree ("_parent_id");
  CREATE INDEX "projects_configurations_details_groups_items_order_idx" ON "projects_configurations_details_groups_items" USING btree ("_order");
  CREATE INDEX "projects_configurations_details_groups_items_parent_id_idx" ON "projects_configurations_details_groups_items" USING btree ("_parent_id");
  CREATE INDEX "projects_configurations_details_groups_order_idx" ON "projects_configurations_details_groups" USING btree ("_order");
  CREATE INDEX "projects_configurations_details_groups_parent_id_idx" ON "projects_configurations_details_groups" USING btree ("_parent_id");
  CREATE INDEX "projects_configurations_details_order_idx" ON "projects_configurations_details" USING btree ("_order");
  CREATE INDEX "projects_configurations_details_parent_id_idx" ON "projects_configurations_details" USING btree ("_parent_id");
  CREATE INDEX "projects_configurations_order_idx" ON "projects_configurations" USING btree ("_order");
  CREATE INDEX "projects_configurations_parent_id_idx" ON "projects_configurations" USING btree ("_parent_id");
  CREATE INDEX "projects_options_order_idx" ON "projects_options" USING btree ("_order");
  CREATE INDEX "projects_options_parent_id_idx" ON "projects_options" USING btree ("_parent_id");
  CREATE INDEX "projects_ready_home_configuration_order_idx" ON "projects_ready_home_configuration" USING btree ("_order");
  CREATE INDEX "projects_ready_home_configuration_parent_id_idx" ON "projects_ready_home_configuration" USING btree ("_parent_id");
  CREATE INDEX "projects_ready_home_sections_points_items_order_idx" ON "projects_ready_home_sections_points_items" USING btree ("_order");
  CREATE INDEX "projects_ready_home_sections_points_items_parent_id_idx" ON "projects_ready_home_sections_points_items" USING btree ("_parent_id");
  CREATE INDEX "projects_ready_home_sections_points_order_idx" ON "projects_ready_home_sections_points" USING btree ("_order");
  CREATE INDEX "projects_ready_home_sections_points_parent_id_idx" ON "projects_ready_home_sections_points" USING btree ("_parent_id");
  CREATE INDEX "projects_ready_home_sections_order_idx" ON "projects_ready_home_sections" USING btree ("_order");
  CREATE INDEX "projects_ready_home_sections_parent_id_idx" ON "projects_ready_home_sections" USING btree ("_parent_id");
  CREATE INDEX "projects_about_order_idx" ON "projects_about" USING btree ("_order");
  CREATE INDEX "projects_about_parent_id_idx" ON "projects_about" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "projects_slug_idx" ON "projects" USING btree ("slug");
  CREATE INDEX "projects_desktop_image_idx" ON "projects" USING btree ("desktop_image_id");
  CREATE INDEX "projects_mobile_image_idx" ON "projects" USING btree ("mobile_image_id");
  CREATE UNIQUE INDEX "projects_import_key_idx" ON "projects" USING btree ("import_key");
  CREATE INDEX "projects_updated_at_idx" ON "projects" USING btree ("updated_at");
  CREATE INDEX "projects_created_at_idx" ON "projects" USING btree ("created_at");
  CREATE INDEX "projects__status_idx" ON "projects" USING btree ("_status");
  CREATE INDEX "_projects_v_version_exteriors_order_idx" ON "_projects_v_version_exteriors" USING btree ("_order");
  CREATE INDEX "_projects_v_version_exteriors_parent_id_idx" ON "_projects_v_version_exteriors" USING btree ("_parent_id");
  CREATE INDEX "_projects_v_version_exteriors_photo_idx" ON "_projects_v_version_exteriors" USING btree ("photo_id");
  CREATE INDEX "_projects_v_version_floor_plans_order_idx" ON "_projects_v_version_floor_plans" USING btree ("_order");
  CREATE INDEX "_projects_v_version_floor_plans_parent_id_idx" ON "_projects_v_version_floor_plans" USING btree ("_parent_id");
  CREATE INDEX "_projects_v_version_plans_rooms_order_idx" ON "_projects_v_version_plans_rooms" USING btree ("_order");
  CREATE INDEX "_projects_v_version_plans_rooms_parent_id_idx" ON "_projects_v_version_plans_rooms" USING btree ("_parent_id");
  CREATE INDEX "_projects_v_version_plans_floors_rooms_order_idx" ON "_projects_v_version_plans_floors_rooms" USING btree ("_order");
  CREATE INDEX "_projects_v_version_plans_floors_rooms_parent_id_idx" ON "_projects_v_version_plans_floors_rooms" USING btree ("_parent_id");
  CREATE INDEX "_projects_v_version_plans_floors_order_idx" ON "_projects_v_version_plans_floors" USING btree ("_order");
  CREATE INDEX "_projects_v_version_plans_floors_parent_id_idx" ON "_projects_v_version_plans_floors" USING btree ("_parent_id");
  CREATE INDEX "_projects_v_version_plans_floors_photo_idx" ON "_projects_v_version_plans_floors" USING btree ("photo_id");
  CREATE INDEX "_projects_v_version_plans_order_idx" ON "_projects_v_version_plans" USING btree ("_order");
  CREATE INDEX "_projects_v_version_plans_parent_id_idx" ON "_projects_v_version_plans" USING btree ("_parent_id");
  CREATE INDEX "_projects_v_version_interiors_order_idx" ON "_projects_v_version_interiors" USING btree ("_order");
  CREATE INDEX "_projects_v_version_interiors_parent_id_idx" ON "_projects_v_version_interiors" USING btree ("_parent_id");
  CREATE INDEX "_projects_v_version_interiors_photo_idx" ON "_projects_v_version_interiors" USING btree ("photo_id");
  CREATE INDEX "_projects_v_version_built_order_idx" ON "_projects_v_version_built" USING btree ("_order");
  CREATE INDEX "_projects_v_version_built_parent_id_idx" ON "_projects_v_version_built" USING btree ("_parent_id");
  CREATE INDEX "_projects_v_version_built_photo_idx" ON "_projects_v_version_built" USING btree ("photo_id");
  CREATE INDEX "_projects_v_version_configurations_includes_order_idx" ON "_projects_v_version_configurations_includes" USING btree ("_order");
  CREATE INDEX "_projects_v_version_configurations_includes_parent_id_idx" ON "_projects_v_version_configurations_includes" USING btree ("_parent_id");
  CREATE INDEX "_projects_v_version_configurations_gifts_order_idx" ON "_projects_v_version_configurations_gifts" USING btree ("_order");
  CREATE INDEX "_projects_v_version_configurations_gifts_parent_id_idx" ON "_projects_v_version_configurations_gifts" USING btree ("_parent_id");
  CREATE INDEX "_projects_v_version_configurations_details_items_order_idx" ON "_projects_v_version_configurations_details_items" USING btree ("_order");
  CREATE INDEX "_projects_v_version_configurations_details_items_parent_id_idx" ON "_projects_v_version_configurations_details_items" USING btree ("_parent_id");
  CREATE INDEX "_projects_v_version_configurations_details_groups_items_order_idx" ON "_projects_v_version_configurations_details_groups_items" USING btree ("_order");
  CREATE INDEX "_projects_v_version_configurations_details_groups_items_parent_id_idx" ON "_projects_v_version_configurations_details_groups_items" USING btree ("_parent_id");
  CREATE INDEX "_projects_v_version_configurations_details_groups_order_idx" ON "_projects_v_version_configurations_details_groups" USING btree ("_order");
  CREATE INDEX "_projects_v_version_configurations_details_groups_parent_id_idx" ON "_projects_v_version_configurations_details_groups" USING btree ("_parent_id");
  CREATE INDEX "_projects_v_version_configurations_details_order_idx" ON "_projects_v_version_configurations_details" USING btree ("_order");
  CREATE INDEX "_projects_v_version_configurations_details_parent_id_idx" ON "_projects_v_version_configurations_details" USING btree ("_parent_id");
  CREATE INDEX "_projects_v_version_configurations_order_idx" ON "_projects_v_version_configurations" USING btree ("_order");
  CREATE INDEX "_projects_v_version_configurations_parent_id_idx" ON "_projects_v_version_configurations" USING btree ("_parent_id");
  CREATE INDEX "_projects_v_version_options_order_idx" ON "_projects_v_version_options" USING btree ("_order");
  CREATE INDEX "_projects_v_version_options_parent_id_idx" ON "_projects_v_version_options" USING btree ("_parent_id");
  CREATE INDEX "_projects_v_version_ready_home_configuration_order_idx" ON "_projects_v_version_ready_home_configuration" USING btree ("_order");
  CREATE INDEX "_projects_v_version_ready_home_configuration_parent_id_idx" ON "_projects_v_version_ready_home_configuration" USING btree ("_parent_id");
  CREATE INDEX "_projects_v_version_ready_home_sections_points_items_order_idx" ON "_projects_v_version_ready_home_sections_points_items" USING btree ("_order");
  CREATE INDEX "_projects_v_version_ready_home_sections_points_items_parent_id_idx" ON "_projects_v_version_ready_home_sections_points_items" USING btree ("_parent_id");
  CREATE INDEX "_projects_v_version_ready_home_sections_points_order_idx" ON "_projects_v_version_ready_home_sections_points" USING btree ("_order");
  CREATE INDEX "_projects_v_version_ready_home_sections_points_parent_id_idx" ON "_projects_v_version_ready_home_sections_points" USING btree ("_parent_id");
  CREATE INDEX "_projects_v_version_ready_home_sections_order_idx" ON "_projects_v_version_ready_home_sections" USING btree ("_order");
  CREATE INDEX "_projects_v_version_ready_home_sections_parent_id_idx" ON "_projects_v_version_ready_home_sections" USING btree ("_parent_id");
  CREATE INDEX "_projects_v_version_about_order_idx" ON "_projects_v_version_about" USING btree ("_order");
  CREATE INDEX "_projects_v_version_about_parent_id_idx" ON "_projects_v_version_about" USING btree ("_parent_id");
  CREATE INDEX "_projects_v_parent_idx" ON "_projects_v" USING btree ("parent_id");
  CREATE INDEX "_projects_v_version_version_slug_idx" ON "_projects_v" USING btree ("version_slug");
  CREATE INDEX "_projects_v_version_version_desktop_image_idx" ON "_projects_v" USING btree ("version_desktop_image_id");
  CREATE INDEX "_projects_v_version_version_mobile_image_idx" ON "_projects_v" USING btree ("version_mobile_image_id");
  CREATE INDEX "_projects_v_version_version_import_key_idx" ON "_projects_v" USING btree ("version_import_key");
  CREATE INDEX "_projects_v_version_version_updated_at_idx" ON "_projects_v" USING btree ("version_updated_at");
  CREATE INDEX "_projects_v_version_version_created_at_idx" ON "_projects_v" USING btree ("version_created_at");
  CREATE INDEX "_projects_v_version_version__status_idx" ON "_projects_v" USING btree ("version__status");
  CREATE INDEX "_projects_v_created_at_idx" ON "_projects_v" USING btree ("created_at");
  CREATE INDEX "_projects_v_updated_at_idx" ON "_projects_v" USING btree ("updated_at");
  CREATE INDEX "_projects_v_latest_idx" ON "_projects_v" USING btree ("latest");
  CREATE UNIQUE INDEX "project_prices_lookup_key_idx" ON "project_prices" USING btree ("lookup_key");
  CREATE INDEX "project_prices_project_idx" ON "project_prices" USING btree ("project_id");
  CREATE INDEX "project_prices_updated_at_idx" ON "project_prices" USING btree ("updated_at");
  CREATE INDEX "project_prices_created_at_idx" ON "project_prices" USING btree ("created_at");
  CREATE UNIQUE INDEX "lead_submissions_request_id_idx" ON "lead_submissions" USING btree ("request_id");
  CREATE INDEX "lead_submissions_updated_at_idx" ON "lead_submissions" USING btree ("updated_at");
  CREATE INDEX "lead_submissions_created_at_idx" ON "lead_submissions" USING btree ("created_at");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "media" USING btree ("sizes_thumbnail_filename");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("pages_id");
  CREATE INDEX "payload_locked_documents_rels_blocks_id_idx" ON "payload_locked_documents_rels" USING btree ("blocks_id");
  CREATE INDEX "payload_locked_documents_rels_forms_id_idx" ON "payload_locked_documents_rels" USING btree ("forms_id");
  CREATE INDEX "payload_locked_documents_rels_projects_id_idx" ON "payload_locked_documents_rels" USING btree ("projects_id");
  CREATE INDEX "payload_locked_documents_rels_project_prices_id_idx" ON "payload_locked_documents_rels" USING btree ("project_prices_id");
  CREATE INDEX "payload_locked_documents_rels_lead_submissions_id_idx" ON "payload_locked_documents_rels" USING btree ("lead_submissions_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE TABLE "record_ids" (
  	"id" varchar(8) PRIMARY KEY NOT NULL CHECK ("id" ~ '^[A-Z0-9]{8}$' AND length(regexp_replace("id", '[^0-9]', '', 'g')) = 2),
  	"collection" varchar NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );`)
  await payload.create({ collection: 'blocks', data: { title: 'Комплектации', key: 'ProjectConfig', source: 'src/components/project-config.tsx', exportName: 'ProjectConfig', configurationTemplates: defaultConfigurationTemplates() }, req, overrideAccess: true })
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "record_ids" CASCADE;
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "pages_layout" CASCADE;
  DROP TABLE "pages" CASCADE;
  DROP TABLE "pages_rels" CASCADE;
  DROP TABLE "cfg_p_start_inc" CASCADE;
  DROP TABLE "cfg_p_start_gift" CASCADE;
  DROP TABLE "cfg_p_start_dtl_itm" CASCADE;
  DROP TABLE "cfg_p_start_grp_itm" CASCADE;
  DROP TABLE "cfg_p_start_grp" CASCADE;
  DROP TABLE "cfg_p_start_dtl" CASCADE;
  DROP TABLE "cfg_p_standard_inc" CASCADE;
  DROP TABLE "cfg_p_standard_gift" CASCADE;
  DROP TABLE "cfg_p_standard_dtl_itm" CASCADE;
  DROP TABLE "cfg_p_standard_grp_itm" CASCADE;
  DROP TABLE "cfg_p_standard_grp" CASCADE;
  DROP TABLE "cfg_p_standard_dtl" CASCADE;
  DROP TABLE "cfg_p_project_inc" CASCADE;
  DROP TABLE "cfg_p_project_gift" CASCADE;
  DROP TABLE "cfg_p_project_dtl_itm" CASCADE;
  DROP TABLE "cfg_p_project_grp_itm" CASCADE;
  DROP TABLE "cfg_p_project_grp" CASCADE;
  DROP TABLE "cfg_p_project_dtl" CASCADE;
  DROP TABLE "cfg_m_standard_inc" CASCADE;
  DROP TABLE "cfg_m_standard_gift" CASCADE;
  DROP TABLE "cfg_m_standard_dtl_itm" CASCADE;
  DROP TABLE "cfg_m_standard_grp_itm" CASCADE;
  DROP TABLE "cfg_m_standard_grp" CASCADE;
  DROP TABLE "cfg_m_standard_dtl" CASCADE;
  DROP TABLE "cfg_m_project_inc" CASCADE;
  DROP TABLE "cfg_m_project_gift" CASCADE;
  DROP TABLE "cfg_m_project_dtl_itm" CASCADE;
  DROP TABLE "cfg_m_project_grp_itm" CASCADE;
  DROP TABLE "cfg_m_project_grp" CASCADE;
  DROP TABLE "cfg_m_project_dtl" CASCADE;
  DROP TABLE "cfg_m_turnkey_inc" CASCADE;
  DROP TABLE "cfg_m_turnkey_gift" CASCADE;
  DROP TABLE "cfg_m_turnkey_dtl_itm" CASCADE;
  DROP TABLE "cfg_m_turnkey_grp_itm" CASCADE;
  DROP TABLE "cfg_m_turnkey_grp" CASCADE;
  DROP TABLE "cfg_m_turnkey_dtl" CASCADE;
  DROP TABLE "blocks_parts" CASCADE;
  DROP TABLE "blocks" CASCADE;
  DROP TABLE "blocks_rels" CASCADE;
  DROP TABLE "forms_parts" CASCADE;
  DROP TABLE "forms" CASCADE;
  DROP TABLE "projects_exteriors" CASCADE;
  DROP TABLE "projects_floor_plans" CASCADE;
  DROP TABLE "projects_plans_rooms" CASCADE;
  DROP TABLE "projects_plans_floors_rooms" CASCADE;
  DROP TABLE "projects_plans_floors" CASCADE;
  DROP TABLE "projects_plans" CASCADE;
  DROP TABLE "projects_interiors" CASCADE;
  DROP TABLE "projects_built" CASCADE;
  DROP TABLE "projects_configurations_includes" CASCADE;
  DROP TABLE "projects_configurations_gifts" CASCADE;
  DROP TABLE "projects_configurations_details_items" CASCADE;
  DROP TABLE "projects_configurations_details_groups_items" CASCADE;
  DROP TABLE "projects_configurations_details_groups" CASCADE;
  DROP TABLE "projects_configurations_details" CASCADE;
  DROP TABLE "projects_configurations" CASCADE;
  DROP TABLE "projects_options" CASCADE;
  DROP TABLE "projects_ready_home_configuration" CASCADE;
  DROP TABLE "projects_ready_home_sections_points_items" CASCADE;
  DROP TABLE "projects_ready_home_sections_points" CASCADE;
  DROP TABLE "projects_ready_home_sections" CASCADE;
  DROP TABLE "projects_about" CASCADE;
  DROP TABLE "projects" CASCADE;
  DROP TABLE "_projects_v_version_exteriors" CASCADE;
  DROP TABLE "_projects_v_version_floor_plans" CASCADE;
  DROP TABLE "_projects_v_version_plans_rooms" CASCADE;
  DROP TABLE "_projects_v_version_plans_floors_rooms" CASCADE;
  DROP TABLE "_projects_v_version_plans_floors" CASCADE;
  DROP TABLE "_projects_v_version_plans" CASCADE;
  DROP TABLE "_projects_v_version_interiors" CASCADE;
  DROP TABLE "_projects_v_version_built" CASCADE;
  DROP TABLE "_projects_v_version_configurations_includes" CASCADE;
  DROP TABLE "_projects_v_version_configurations_gifts" CASCADE;
  DROP TABLE "_projects_v_version_configurations_details_items" CASCADE;
  DROP TABLE "_projects_v_version_configurations_details_groups_items" CASCADE;
  DROP TABLE "_projects_v_version_configurations_details_groups" CASCADE;
  DROP TABLE "_projects_v_version_configurations_details" CASCADE;
  DROP TABLE "_projects_v_version_configurations" CASCADE;
  DROP TABLE "_projects_v_version_options" CASCADE;
  DROP TABLE "_projects_v_version_ready_home_configuration" CASCADE;
  DROP TABLE "_projects_v_version_ready_home_sections_points_items" CASCADE;
  DROP TABLE "_projects_v_version_ready_home_sections_points" CASCADE;
  DROP TABLE "_projects_v_version_ready_home_sections" CASCADE;
  DROP TABLE "_projects_v_version_about" CASCADE;
  DROP TABLE "_projects_v" CASCADE;
  DROP TABLE "project_prices" CASCADE;
  DROP TABLE "lead_submissions" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "lead_delivery" CASCADE;
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_pages_kind";
  DROP TYPE "public"."enum_projects_built_type";
  DROP TYPE "public"."enum_projects_built_provider";
  DROP TYPE "public"."enum_projects_configurations_key";
  DROP TYPE "public"."enum_projects_ready_home_sections_tone";
  DROP TYPE "public"."enum_projects_record_type";
  DROP TYPE "public"."enum_projects_technology_badge";
  DROP TYPE "public"."enum_projects_series";
  DROP TYPE "public"."enum_projects_built_tour_video_provider";
  DROP TYPE "public"."enum_projects_next_steps_settings_order";
  DROP TYPE "public"."enum_projects_hero_content_source";
  DROP TYPE "public"."enum_projects_exteriors_content_source";
  DROP TYPE "public"."enum_projects_interiors_content_source";
  DROP TYPE "public"."enum_projects_plans_content_source";
  DROP TYPE "public"."enum_projects_built_content_source";
  DROP TYPE "public"."enum_projects_status";
  DROP TYPE "public"."enum__projects_v_version_built_type";
  DROP TYPE "public"."enum__projects_v_version_built_provider";
  DROP TYPE "public"."enum__projects_v_version_configurations_key";
  DROP TYPE "public"."enum__projects_v_version_ready_home_sections_tone";
  DROP TYPE "public"."enum__projects_v_version_record_type";
  DROP TYPE "public"."enum__projects_v_version_technology_badge";
  DROP TYPE "public"."enum__projects_v_version_series";
  DROP TYPE "public"."enum__projects_v_version_built_tour_video_provider";
  DROP TYPE "public"."enum__projects_v_version_next_steps_settings_order";
  DROP TYPE "public"."enum__projects_v_version_hero_content_source";
  DROP TYPE "public"."enum__projects_v_version_exteriors_content_source";
  DROP TYPE "public"."enum__projects_v_version_interiors_content_source";
  DROP TYPE "public"."enum__projects_v_version_plans_content_source";
  DROP TYPE "public"."enum__projects_v_version_built_content_source";
  DROP TYPE "public"."enum__projects_v_version_status";
  DROP TYPE "public"."enum_project_prices_configuration";
  DROP TYPE "public"."enum_project_prices_region";
  DROP TYPE "public"."enum_lead_submissions_status";
  DROP TYPE "public"."enum_lead_delivery_mode";`)
}
