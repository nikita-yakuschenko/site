'use client'

import { useRegionCode } from './region-bootstrap'
import { copy } from '../lib/copy'

/** Заголовок блока контактов: для МСК — головной офис в НН. */
export function ContactsRegionHeading() {
  const region = useRegionCode()
  return (
    <h2 data-cms-content-connected>
      {region === 'msk' ? copy.contactsHeadOffice : copy.contacts}
    </h2>
  )
}

export function ContactsRegionAddressLabel() {
  const region = useRegionCode()
  return <p data-cms-content-connected>{region === 'msk' ? copy.headOfficeCity : copy.addressLabel}</p>
}
