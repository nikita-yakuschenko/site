import 'server-only'
import { cache } from 'react'
import { connection } from 'next/server'
import { unstable_rethrow } from 'next/navigation'
import type { StoryProjectDetails } from './story-project-details'

export type StoryVideo = { provider: 'kinescope'; id: string } | { provider: 'vk'; oid: number; id: string }

export type PublicStoryCard = {
  mark: 'individual' | 'discontinued' | null
  title: string
  text: string
  image: string
  href: string
  label: string
  project?: StoryProjectDetails
}

export type PublicStory = {
  slug: string
  heading: string
  subtitle: string
  place: string
  year: number
  kind: 'family' | 'business'
  binding: 'catalog' | 'individual' | 'discontinued'
  duration: string
  poster: string
  video: StoryVideo | null
  card: PublicStoryCard | null
}

function cmsOrigin() {
  return process.env.CMS_PUBLIC_URL || (process.env.NODE_ENV === 'production' ? 'https://cms.avgst.ru' : 'http://localhost:3001')
}

function isStory(value: unknown): value is PublicStory {
  if (!value || typeof value !== 'object') return false
  const story = value as PublicStory
  return typeof story.slug === 'string' && typeof story.heading === 'string' && typeof story.place === 'string' && typeof story.year === 'number'
}

export const listStories = cache(async (): Promise<PublicStory[]> => {
  await connection()
  const key = process.env.CMS_SITE_API_KEY
  if (!key) return []
  try {
    const response = await fetch(`${cmsOrigin()}/api/stories/feed`, {
      headers: { Authorization: `Bearer ${key}` },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) return []
    const data = await response.json()
    return Array.isArray(data.items) ? data.items.filter(isStory) : []
  } catch (error) {
    unstable_rethrow(error)
    return []
  }
})
