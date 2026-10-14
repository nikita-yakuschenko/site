import * as migration_20261014_074208_initial_record_ids from './20261014_074208_initial_record_ids';
import * as migration_20261014_094638_pages_drafts from './20261014_094638_pages_drafts';
import * as migration_20261014_105148_block_part_content from './20261014_105148_block_part_content';
import * as migration_20261014_111009_hero_background from './20261014_111009_hero_background';

export const migrations = [
  {
    up: migration_20261014_074208_initial_record_ids.up,
    down: migration_20261014_074208_initial_record_ids.down,
    name: '20261014_074208_initial_record_ids',
  },
  {
    up: migration_20261014_094638_pages_drafts.up,
    down: migration_20261014_094638_pages_drafts.down,
    name: '20261014_094638_pages_drafts',
  },
  {
    up: migration_20261014_105148_block_part_content.up,
    down: migration_20261014_105148_block_part_content.down,
    name: '20261014_105148_block_part_content',
  },
  {
    up: migration_20261014_111009_hero_background.up,
    down: migration_20261014_111009_hero_background.down,
    name: '20261014_111009_hero_background'
  },
];
