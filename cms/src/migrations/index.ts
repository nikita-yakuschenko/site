import * as migration_20261014_074208_initial_record_ids from './20261014_074208_initial_record_ids';
import * as migration_20261014_094638_pages_drafts from './20261014_094638_pages_drafts';
import * as migration_20261014_105148_block_part_content from './20261014_105148_block_part_content';
import * as migration_20261014_111009_hero_background from './20261014_111009_hero_background';
import * as migration_20261014_160000_reconcile_schema from './20261014_160000_reconcile_schema';
import * as migration_20261014_164500_product_code from './20261014_164500_product_code';
import * as migration_20261015_093000_promo_slot_action from './20261015_093000_promo_slot_action';
import * as migration_20261015_235500_project_reactions from './20261015_235500_project_reactions';

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
  {
    up: migration_20261014_160000_reconcile_schema.up,
    down: migration_20261014_160000_reconcile_schema.down,
    name: '20261014_160000_reconcile_schema'
  },
  {
    up: migration_20261014_164500_product_code.up,
    down: migration_20261014_164500_product_code.down,
    name: '20261014_164500_product_code',
  },
  {
    up: migration_20261015_093000_promo_slot_action.up,
    down: migration_20261015_093000_promo_slot_action.down,
    name: '20261015_093000_promo_slot_action',
  },
  {
    up: migration_20261015_235500_project_reactions.up,
    down: migration_20261015_235500_project_reactions.down,
    name: '20261015_235500_project_reactions',
  },
];
