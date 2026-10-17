export function OpenDayRules() {
  return <div className="ags-rules" aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <i key={index} />)}</div>
}

export function OpenDayArrow({ size = 17 }: { size?: number }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true"><path d="M7 17 17 7M17 7H8.5M17 7v8.5" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
