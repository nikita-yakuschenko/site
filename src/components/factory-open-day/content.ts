import { useCMSBlock } from '../cms-content'
import type { ContentField } from '../../lib/cms/react-content'

export function useOpenDayContent(blockKey: string, fields: ContentField[]) {
  const { key, parts } = useCMSBlock(blockKey)
  const fieldKey = (name: string) => `${blockKey}.content.${name}`
  const defaults = new Map(fields.map(field => [field.key, field]))
  const saved = new Map(parts.map(part => [part.key, part]))
  return {
    key,
    text: (name: string) => saved.get(fieldKey(name))?.text ?? defaults.get(fieldKey(name))?.text ?? '',
    image: (name: string) => saved.get(fieldKey(name))?.image || defaults.get(fieldKey(name))?.image || '',
    mark: (name: string) => ({ 'data-cms-block': fieldKey(name) }),
  }
}
