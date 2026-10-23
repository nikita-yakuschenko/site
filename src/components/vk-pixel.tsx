'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { trackVkPageView } from '../lib/vk-pixel'

export function VkPixel() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    trackVkPageView()
  }, [pathname, searchParams])

  return null
}
