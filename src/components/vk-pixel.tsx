'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useConsent } from '../consent/ConsentProvider'
import { trackVkPageView } from '../lib/vk-pixel'

export function VkPixel() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { state } = useConsent()

  useEffect(() => {
    trackVkPageView()
  }, [pathname, searchParams, state.marketing])

  return null
}
