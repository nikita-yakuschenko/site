import { copy } from '../lib/copy'

export function PreviewBanner() {
  return (
    <div className="preview-banner" role="status">
      <span>{copy.previewBanner}</span>
      <a href="/next/exit-preview">{copy.exitPreview}</a>
    </div>
  )
}
