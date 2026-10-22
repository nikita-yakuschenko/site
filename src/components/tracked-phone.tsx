'use client'

import { Children, cloneElement, createContext, isValidElement, useContext, useSyncExternalStore, type ComponentProps, type ReactNode, type ReactElement } from 'react'
import { assignedPhone, phoneDigits } from '../lib/roistat-phone'

const PhoneContext = createContext('')
export function RoistatPhoneProvider({ initialData, children }: { initialData: string; children: ReactNode }) {
  return <PhoneContext.Provider value={initialData}>{children}</PhoneContext.Provider>
}

function subscribe(callback: () => void) {
  window.addEventListener('avgst:roistat-phone', callback)
  return () => window.removeEventListener('avgst:roistat-phone', callback)
}
function snapshot() {
  return document.cookie.split(';').map(row => row.trim()).find(row => row.startsWith('roistat_phone_script_data='))?.slice('roistat_phone_script_data='.length) || ''
}

export function TrackedPhone({ children, href, ...props }: ComponentProps<'a'>) {
  const initial = useContext(PhoneContext)
  const data = useSyncExternalStore(subscribe, snapshot, () => initial)
  const number = href?.startsWith('tel:') ? assignedPhone(data, href.slice(4)) : undefined
  function replace(node: ReactNode): ReactNode {
    if (typeof node === 'string' && phoneDigits(node) === phoneDigits(href?.slice(4) || '')) return number
    if (isValidElement<{ children?: ReactNode }>(node) && node.props.children) {
      return cloneElement(node as ReactElement<{ children?: ReactNode }>, {}, Children.map(node.props.children, replace))
    }
    return node
  }
  return <a {...props} href={number ? `tel:+${phoneDigits(number)}` : href} suppressHydrationWarning>
    {number ? Children.map(children, replace) : children}
  </a>
}
