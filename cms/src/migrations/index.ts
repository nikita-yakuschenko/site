import * as migration_20261012_154042_initial from './20261012_154042_initial';
import * as migration_20261012_210145 from './20261012_210145';
import * as migration_20261012_210447 from './20261012_210447';
import * as migration_20261012_213848 from './20261012_213848';
import * as migration_20261012_214952_catalog_projects from './20261012_214952_catalog_projects';
import * as migration_20261012_215744_project_content from './20261012_215744_project_content';
import * as migration_20261012_220335_integer_project_counts from './20261012_220335_integer_project_counts';
import * as migration_20261012_220645_project_configurations from './20261012_220645_project_configurations';
import * as migration_20261012_222012_project_block_order from './20261012_222012_project_block_order';
import * as migration_20261013_054303_project_hero_cms from './20261013_054303_project_hero_cms';
import * as migration_20261013_055345_project_hero_media from './20261013_055345_project_hero_media';
import * as migration_20261013_061554_project_exteriors_media from './20261013_061554_project_exteriors_media';
import * as migration_20261013_064025_project_interiors_media from './20261013_064025_project_interiors_media';
import * as migration_20261013_070829_project_built_media from './20261013_070829_project_built_media';
import * as migration_20261013_072658_project_built_primary from './20261013_072658_project_built_primary';
import * as migration_20261013_075124_project_next_steps_settings from './20261013_075124_project_next_steps_settings';
import * as migration_20261013_084741_project_plans_media from './20261013_084741_project_plans_media';
import * as migration_20261013_105013_project_regional_prices from './20261013_105013_project_regional_prices';
import * as migration_20261013_115324_catalog_and_lead_delivery from './20261013_115324_catalog_and_lead_delivery';
import * as migration_20261013_121931_shared_block_configurations from './20261013_121931_shared_block_configurations';

export const migrations = [
  {
    up: migration_20261012_154042_initial.up,
    down: migration_20261012_154042_initial.down,
    name: '20261012_154042_initial',
  },
  {
    up: migration_20261012_210145.up,
    down: migration_20261012_210145.down,
    name: '20261012_210145',
  },
  {
    up: migration_20261012_210447.up,
    down: migration_20261012_210447.down,
    name: '20261012_210447',
  },
  {
    up: migration_20261012_213848.up,
    down: migration_20261012_213848.down,
    name: '20261012_213848',
  },
  {
    up: migration_20261012_214952_catalog_projects.up,
    down: migration_20261012_214952_catalog_projects.down,
    name: '20261012_214952_catalog_projects',
  },
  {
    up: migration_20261012_215744_project_content.up,
    down: migration_20261012_215744_project_content.down,
    name: '20261012_215744_project_content',
  },
  {
    up: migration_20261012_220335_integer_project_counts.up,
    down: migration_20261012_220335_integer_project_counts.down,
    name: '20261012_220335_integer_project_counts',
  },
  {
    up: migration_20261012_220645_project_configurations.up,
    down: migration_20261012_220645_project_configurations.down,
    name: '20261012_220645_project_configurations',
  },
  {
    up: migration_20261012_222012_project_block_order.up,
    down: migration_20261012_222012_project_block_order.down,
    name: '20261012_222012_project_block_order',
  },
  {
    up: migration_20261013_054303_project_hero_cms.up,
    down: migration_20261013_054303_project_hero_cms.down,
    name: '20261013_054303_project_hero_cms',
  },
  {
    up: migration_20261013_055345_project_hero_media.up,
    down: migration_20261013_055345_project_hero_media.down,
    name: '20261013_055345_project_hero_media',
  },
  {
    up: migration_20261013_061554_project_exteriors_media.up,
    down: migration_20261013_061554_project_exteriors_media.down,
    name: '20261013_061554_project_exteriors_media',
  },
  {
    up: migration_20261013_064025_project_interiors_media.up,
    down: migration_20261013_064025_project_interiors_media.down,
    name: '20261013_064025_project_interiors_media',
  },
  {
    up: migration_20261013_070829_project_built_media.up,
    down: migration_20261013_070829_project_built_media.down,
    name: '20261013_070829_project_built_media',
  },
  {
    up: migration_20261013_072658_project_built_primary.up,
    down: migration_20261013_072658_project_built_primary.down,
    name: '20261013_072658_project_built_primary',
  },
  {
    up: migration_20261013_075124_project_next_steps_settings.up,
    down: migration_20261013_075124_project_next_steps_settings.down,
    name: '20261013_075124_project_next_steps_settings',
  },
  {
    up: migration_20261013_084741_project_plans_media.up,
    down: migration_20261013_084741_project_plans_media.down,
    name: '20261013_084741_project_plans_media',
  },
  {
    up: migration_20261013_105013_project_regional_prices.up,
    down: migration_20261013_105013_project_regional_prices.down,
    name: '20261013_105013_project_regional_prices',
  },
  {
    up: migration_20261013_115324_catalog_and_lead_delivery.up,
    down: migration_20261013_115324_catalog_and_lead_delivery.down,
    name: '20261013_115324_catalog_and_lead_delivery',
  },
  {
    up: migration_20261013_121931_shared_block_configurations.up,
    down: migration_20261013_121931_shared_block_configurations.down,
    name: '20261013_121931_shared_block_configurations'
  },
];
