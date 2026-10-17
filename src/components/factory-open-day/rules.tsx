import { IconArrowUpRight } from '@tabler/icons-react'

export function OpenDayRules() {
  return <div className="ags-rules" aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <i key={index} />)}</div>
}

export function OpenDayArrow({ size = 17 }: { size?: number }) {
  return <IconArrowUpRight size={size} stroke={2} aria-hidden />
}
