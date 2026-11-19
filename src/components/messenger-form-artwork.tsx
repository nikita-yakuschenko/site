import { IconBrandWhatsapp, IconPhoneCall } from '@tabler/icons-react'

export type ContactFormTheme = 'max' | 'telegram' | 'whatsapp' | 'callback'
function Mark({ channel, background = false }: { channel: ContactFormTheme; background?: boolean }) {
  if (channel === 'whatsapp') return <IconBrandWhatsapp stroke={1.6} aria-hidden="true" />
  if (channel === 'callback') return <IconPhoneCall stroke={1.7} aria-hidden="true" />
  // These are the same official silhouettes used by the contact rail.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={channel === 'max' ? '/social/max_light.svg' : background ? '/social/tg_original.svg' : '/social/tg_white.svg'} alt="" />
}
export function MessengerFormArtwork({ channel }: { channel: ContactFormTheme }) {
  return <div className="messenger-form__art" aria-hidden="true">
    <span className="messenger-form__mark"><Mark channel={channel} /></span>
    <span className="messenger-form__watermark"><Mark channel={channel} background /></span>
    <span className="messenger-form__ribbon" />
  </div>
}
