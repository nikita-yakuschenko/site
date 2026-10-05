'use client'
import { useState } from 'react'
import { IconArrowUpRight, IconMapPin } from '@tabler/icons-react'
import { EXPOSITION_PLACES } from '../lib/exposition'

export function ExpositionLocations() {
  const [selected, setSelected] = useState(0)
  const place = EXPOSITION_PLACES[selected] ?? EXPOSITION_PLACES[0]
  const query = `${place.name}, ${place.address}`
  return <div className="exposition-locations">
    <div className="exposition-locations__map">
      <iframe key={place.slug} title={`Карта: ${place.name}`} src={`https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed&hl=ru`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
    </div>
    <div className="exposition-locations__copy"><h2 id="directions-title">Выберите ближайшую площадку</h2>
      <div className="exposition-locations__list">{EXPOSITION_PLACES.map((item, index) => <div className={`exposition-location${selected === index ? ' is-selected' : ''}`} key={item.slug}>
        <button type="button" aria-pressed={selected === index} onClick={() => setSelected(index)}><IconMapPin size={24} /><span><strong>{item.name}</strong><span>{item.address}</span></span></button>
        <a href={`https://yandex.ru/maps/?text=${encodeURIComponent(`${item.name}, ${item.address}`)}`} target="_blank" rel="noopener noreferrer">Открыть в Яндекс Картах <IconArrowUpRight size={16} /></a>
      </div>)}</div>
      <p>При записи согласуем время встречи и подскажем, как добраться до площадки.</p>
    </div>
  </div>
}
