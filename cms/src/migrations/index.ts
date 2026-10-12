import * as migration_20261012_154042_initial from './20261012_154042_initial';
import * as migration_20261012_210145 from './20261012_210145';
import * as migration_20261012_210447 from './20261012_210447';
import * as migration_20261012_213848 from './20261012_213848';
import * as migration_20261012_214952_catalog_projects from './20261012_214952_catalog_projects';
import * as migration_20261012_215744_project_content from './20261012_215744_project_content';
import * as migration_20261012_220335_integer_project_counts from './20261012_220335_integer_project_counts';
import * as migration_20261012_220645_project_configurations from './20261012_220645_project_configurations';
import * as migration_20261012_222012_project_block_order from './20261012_222012_project_block_order';

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
    name: '20261012_222012_project_block_order'
  },
];
