import { IconHeart, IconShare3 } from '@tabler/icons-react'
import { copy } from '../lib/copy'
import './reaction-buttons.css'

type Props = {
  likes: number
  shares: number
  pressed: boolean
  likeLabel: string
  onLike: () => void
  onShare: () => void
}

export function ReactionButtons({ likes, shares, pressed, likeLabel, onLike, onShare }: Props) {
  return <>
    <button type="button" className="project-actions__btn" aria-label={likeLabel} aria-pressed={pressed} onClick={onLike}>
      <IconHeart size={26} stroke={1.6} fill={pressed ? 'currentColor' : 'none'} aria-hidden="true" />
      <span>{likes}</span>
    </button>
    <button type="button" className="project-actions__btn" aria-label={copy.share} onClick={onShare}>
      <IconShare3 size={26} stroke={1.6} aria-hidden="true" />
      <span>{shares}</span>
    </button>
  </>
}
