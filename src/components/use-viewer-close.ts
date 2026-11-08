import { useCallback, useEffect, useRef, useState } from 'react'

/** Let the passport fold into its point before removing the media overlay. */
export function useViewerClose(onClose: () => void) {
  const [closing, setClosing] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const close = useCallback(() => {
    if (timer.current) return
    setClosing(true)
    timer.current = setTimeout(onClose, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 150 : 400)
  }, [onClose])
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  return { closing, close }
}
