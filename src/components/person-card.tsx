'use client'

import { CMSContentBlock, useCMSBlock } from './cms-content'
import type { ContentField } from '../lib/cms/react-content'
import { optimizedSrc } from '../lib/media'

type PersonDefaults = {
  photo?: string
  name?: string
  caption?: string
  audience?: string
}

function partValue(parts: { key: string; text?: string; textMore?: string; image?: string }[], key: string) {
  return parts.find(item => item.key === key)
}

/** Единый блок «Персона»: фото, имя, подпись. Пустое поле не рендерится. */
export function PersonCard({
  cmsBlockKey = 'Person',
  photo = '',
  name = '',
  caption = '',
  audience = '',
  withAudience = false,
}: PersonDefaults & { cmsBlockKey?: string; withAudience?: boolean; 'data-cms-content-connected'?: boolean | string }) {
  const { key, parts } = useCMSBlock(cmsBlockKey)
  const personKey = `${key}.content.person`
  const audienceKey = `${key}.content.audience`
  const saved = partValue(parts, personKey)
  const resolvedPhoto = typeof saved?.image === 'string' ? saved.image : photo
  const resolvedName = typeof saved?.text === 'string' ? saved.text : name
  const resolvedCaption = typeof saved?.textMore === 'string' ? saved.textMore : caption
  const audiencePart = partValue(parts, audienceKey)
  const resolvedAudience = typeof audiencePart?.text === 'string' ? audiencePart.text : audience

  const fields: ContentField[] = [
    { key: personKey, kind: 'person', title: 'Персона', image: photo, text: name, textMore: caption },
    ...(withAudience ? [{ key: audienceKey, kind: 'text' as const, title: 'Персона: аудитория', text: audience }] : []),
  ]

  if (!resolvedPhoto && !resolvedName && !resolvedCaption && !resolvedAudience) return null

  return (
    <CMSContentBlock cmsBlockKey={cmsBlockKey} initialFields={fields}>
      <div className="independent-review__channel">
        {resolvedPhoto ? (
          <img
            className="independent-review__mark"
            src={optimizedSrc(resolvedPhoto, 256)}
            alt=""
            width={80}
            height={80}
            loading="lazy"
            data-cms-image={personKey}
          />
        ) : null}
        {resolvedName || resolvedCaption || resolvedAudience ? (
          <span>
            {resolvedName ? <strong data-cms-text={`${personKey}.name`}>{resolvedName}</strong> : null}
            {resolvedCaption ? <em data-cms-text={`${personKey}.caption`}>{resolvedCaption}</em> : null}
            {resolvedAudience ? <em className="independent-review__audience" data-cms-text={audienceKey}>{resolvedAudience}</em> : null}
          </span>
        ) : null}
      </div>
    </CMSContentBlock>
  )
}
