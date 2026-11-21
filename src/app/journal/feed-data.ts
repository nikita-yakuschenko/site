import 'server-only'
import { readJournalPage } from './archive'
import { storyPreview, type JournalFeedFilters, type JournalFeedPage } from './content'
import { getJournalReactionTotals } from './reactions'

export async function readJournalFeed(filters: JournalFeedFilters, after?: string): Promise<JournalFeedPage> {
  const { items, next } = readJournalPage(filters, after)
  const reactions = await getJournalReactionTotals(items.map(item => item.slug))
  return { items: items.map(item => ({ story: storyPreview(item), reactions: reactions[item.slug] })), next }
}
