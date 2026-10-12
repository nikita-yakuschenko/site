import * as migration_20261012_154042_initial from './20261012_154042_initial';

export const migrations = [
  {
    up: migration_20261012_154042_initial.up,
    down: migration_20261012_154042_initial.down,
    name: '20261012_154042_initial'
  },
];
