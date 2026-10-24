import * as migration_20261014_074208_initial_record_ids from './20261014_074208_initial_record_ids';
import * as migration_20261014_094638_pages_drafts from './20261014_094638_pages_drafts';
import * as migration_20261014_105148_block_part_content from './20261014_105148_block_part_content';
import * as migration_20261014_111009_hero_background from './20261014_111009_hero_background';
import * as migration_20261014_160000_reconcile_schema from './20261014_160000_reconcile_schema';
import * as migration_20261014_164500_product_code from './20261014_164500_product_code';
import * as migration_20261015_093000_promo_slot_action from './20261015_093000_promo_slot_action';
import * as migration_20261015_235500_project_reactions from './20261015_235500_project_reactions';
import * as migration_20261016_095500_special_msk_price from './20261016_095500_special_msk_price';
import * as migration_20261016_105500_price_history from './20261016_105500_price_history';
import * as migration_20261016_151900_aframe_series from './20261016_151900_aframe_series';
import * as migration_20261016_174800_special_dealer_price from './20261016_174800_special_dealer_price';
import * as migration_20261017_201500_project_views from './20261017_201500_project_views';
import * as migration_20261018_090000_roistat_delivery from './20261018_090000_roistat_delivery';
import * as migration_20261018_100000_lead_submission_title from './20261018_100000_lead_submission_title';
import * as migration_20261018_120000_roistat_settings from './20261018_120000_roistat_settings';
import * as migration_20261018_140000_yandex_settings from './20261018_140000_yandex_settings';
import * as migration_20261019_130000_stories from './20261019_130000_stories';
import * as migration_20261019_150000_story_duration from './20261019_150000_story_duration';
import * as migration_20261019_160000_story_related_card from './20261019_160000_story_related_card';
import * as migration_20261019_170000_story_video_meta from './20261019_170000_story_video_meta';
import * as migration_20261023_160000_frame_technology from './20261023_160000_frame_technology';
import * as migration_20261023_180000_hero_product from './20261023_180000_hero_product';
import * as migration_20261024_160000_automation from './20261024_160000_automation';

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
  {
    up: migration_20261016_095500_special_msk_price.up,
    down: migration_20261016_095500_special_msk_price.down,
    name: '20261016_095500_special_msk_price',
  },
  {
    up: migration_20261016_105500_price_history.up,
    down: migration_20261016_105500_price_history.down,
    name: '20261016_105500_price_history',
  },
  {
    up: migration_20261016_151900_aframe_series.up,
    down: migration_20261016_151900_aframe_series.down,
    name: '20261016_151900_aframe_series',
  },
  {
    up: migration_20261016_174800_special_dealer_price.up,
    down: migration_20261016_174800_special_dealer_price.down,
    name: '20261016_174800_special_dealer_price',
  },
  {
    up: migration_20261017_201500_project_views.up,
    down: migration_20261017_201500_project_views.down,
    name: '20261017_201500_project_views',
  },
  {
    up: migration_20261018_090000_roistat_delivery.up,
    down: migration_20261018_090000_roistat_delivery.down,
    name: '20261018_090000_roistat_delivery',
  },
  {
    up: migration_20261018_100000_lead_submission_title.up,
    down: migration_20261018_100000_lead_submission_title.down,
    name: '20261018_100000_lead_submission_title',
  },
  {
    up: migration_20261018_120000_roistat_settings.up,
    down: migration_20261018_120000_roistat_settings.down,
    name: '20261018_120000_roistat_settings',
  },
  {
    up: migration_20261018_140000_yandex_settings.up,
    down: migration_20261018_140000_yandex_settings.down,
    name: '20261018_140000_yandex_settings',
  },
  {
    up: migration_20261019_130000_stories.up,
    down: migration_20261019_130000_stories.down,
    name: '20261019_130000_stories',
  },
  {
    up: migration_20261019_150000_story_duration.up,
    down: migration_20261019_150000_story_duration.down,
    name: '20261019_150000_story_duration',
  },
  {
    up: migration_20261019_160000_story_related_card.up,
    down: migration_20261019_160000_story_related_card.down,
    name: '20261019_160000_story_related_card',
  },
  {
    up: migration_20261019_170000_story_video_meta.up,
    down: migration_20261019_170000_story_video_meta.down,
    name: '20261019_170000_story_video_meta',
  },
  {
    up: migration_20261023_160000_frame_technology.up,
    down: migration_20261023_160000_frame_technology.down,
    name: '20261023_160000_frame_technology',
  },
  {
    up: migration_20261023_180000_hero_product.up,
    down: migration_20261023_180000_hero_product.down,
    name: '20261023_180000_hero_product',
  },
  {
    up: migration_20261024_160000_automation.up,
    down: migration_20261024_160000_automation.down,
    name: '20261024_160000_automation',
  },
];
