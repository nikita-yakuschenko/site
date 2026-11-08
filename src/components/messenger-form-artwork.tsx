import { IconBrandWhatsapp } from '@tabler/icons-react'

type Channel = 'max' | 'telegram' | 'whatsapp'
function Mark({ channel, background = false }: { channel: Channel; background?: boolean }) {
  if (channel === 'whatsapp') return <IconBrandWhatsapp stroke={1.6} aria-hidden="true" />
  // These are the same official silhouettes used by the contact rail.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={channel === 'max' ? '/social/max_light.svg' : background ? '/social/tg_original.svg' : '/social/tg_white.svg'} alt="" />
}
export function MessengerFormArtwork({ channel }: { channel: Channel }) {
  return <div className="messenger-form__art" aria-hidden="true">
    <span className="messenger-form__mark"><Mark channel={channel} /></span>
    <span className="messenger-form__watermark"><Mark channel={channel} background /></span>
    <span className="messenger-form__ribbon" />
  </div>
}
