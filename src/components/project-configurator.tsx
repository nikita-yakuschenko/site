'use client'

import { useMemo, useState } from 'react'
import { copy } from '../lib/copy'
import { formatRub, type CatalogOption } from '../lib/catalog/types'

export function ProjectConfigurator({
  options,
  basePrice,
}: {
  options: CatalogOption[]
  basePrice: number | null
}) {
  const [selected, setSelected] = useState(() => options.filter((item) => item.defaultSelected).map((item) => item.id))

  const extras = useMemo(
    () => options.filter((item) => selected.includes(item.id)).reduce((sum, item) => sum + item.price, 0),
    [options, selected],
  )
  const total = basePrice == null ? null : basePrice + extras

  return (
    <section className="section section--muted">
      <div className="section__inner configurator">
        <div>
          <p className="eyebrow">{copy.configurator}</p>
          <h2>{copy.quote}</h2>
          <ul className="option-list">
            {options.map((option) => (
              <li key={option.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={selected.includes(option.id)}
                    disabled={option.price === 0}
                    onChange={() => {
                      setSelected((current) =>
                        current.includes(option.id)
                          ? current.filter((id) => id !== option.id)
                          : [...current, option.id],
                      )
                    }}
                  />
                  <span>{option.name}</span>
                  <strong>{option.price ? formatRub(option.price) : copy.included}</strong>
                </label>
              </li>
            ))}
          </ul>
        </div>
        <aside className="glass-panel">
          <p className="eyebrow">{copy.quote}</p>
          <p className="price">{total == null ? copy.priceOnRequest : formatRub(total)}</p>
        </aside>
      </div>
    </section>
  )
}
