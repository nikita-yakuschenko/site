'use client'

export const CAROUSEL_SLIDE_MS = 11000

export function CarouselProgress({ labels, index, playId, paused, onSelect, onComplete, className = '', tabIndex }: {
  labels: readonly string[]; index: number; playId: number; paused: boolean; onSelect: (index: number) => void; onComplete: () => void; className?: string; tabIndex?: number
}) {
  return <div className={`hero__promo-progress ${className}`} role="tablist" aria-label="Переключение слайдов">
    {labels.map((label, itemIndex) => <button key={itemIndex} type="button" role="tab" tabIndex={tabIndex} aria-selected={itemIndex === index} aria-label={label} className={itemIndex === index ? 'is-active' : itemIndex < index ? 'is-done' : undefined} onClick={() => onSelect(itemIndex)}>
      <span className="hero__promo-progress-track"><span className="hero__promo-progress-fill" key={itemIndex === index ? `play-${playId}` : 'idle'} onAnimationEnd={itemIndex === index ? onComplete : undefined} style={itemIndex === index ? { animationDuration: `${CAROUSEL_SLIDE_MS}ms`, animationPlayState: paused ? 'paused' : 'running' } : undefined} /></span>
    </button>)}
  </div>
}
