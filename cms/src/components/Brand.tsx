import Image from 'next/image'

export function Brand() {
  return <span className="avgst-brand"><BrandIcon /><strong>Авангард Строй 4.0</strong></span>
}

export function BrandIcon() {
  return <Image className="avgst-brand__icon" src="/favicon.svg" width={32} height={32} alt="Авангард Строй 4.0" />
}
