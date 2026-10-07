import geometry from '../../public/img/pages/about-coverage-map.json'

export function CoverageMapGraphic({ compact = false }: { compact?: boolean }) {
  const frame = compact
    ? { x: 120, y: -24, width: 360, height: 240 }
    : { x: 0, y: 0, ...geometry.viewport }
  const fadeId = `coverage-map-fade-${compact ? 'compact' : 'wide'}`

  return (
    <svg className={`company-bento__coverage-graphic company-bento__coverage-graphic--${compact ? 'compact' : 'wide'}`} viewBox={`${frame.x} ${frame.y} ${frame.width} ${frame.height}`} preserveAspectRatio={compact ? 'xMaxYMid slice' : 'xMidYMid slice'} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={fadeId}>
          <stop offset="0%" stopColor="var(--surface-muted)" />
          <stop offset="28%" stopColor="var(--surface-muted)" />
          <stop offset="70%" stopColor="var(--surface-muted)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <image href="/img/pages/about-coverage-map.svg" x={geometry.extent.x} y={geometry.extent.y} width={geometry.extent.width} height={geometry.extent.height} />
      <rect x={frame.x} y={frame.y} width={frame.width} height={frame.height} fill={`url(#${fadeId})`} />
      {/* Equidistant WGS84 projection preserves distances in both responsive crops. */}
      <g transform={`translate(${geometry.pixel.x} ${geometry.pixel.y})`}>
        <circle r={geometry.contextRadiusKm * geometry.pixelsPerKm} fill="currentColor" fillOpacity="0.04" stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.25" strokeDasharray="4 4" />
        <circle r={geometry.radiusKm * geometry.pixelsPerKm} fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1" strokeDasharray="3 3" />
        <circle r={geometry.innerRadiusKm * geometry.pixelsPerKm} fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1" strokeDasharray="2 3" />
        <circle r="7" fill="currentColor" stroke="white" strokeWidth="1.5" />
        <circle r="2" fill="white" />
      </g>
      <g className="company-bento__coverage-cities">
        {!compact && geometry.cities.map(city => {
          const label = compact ? city.compactLabel : city.label
          return (
            <g key={city.name} transform={`translate(${city.pixel.x} ${city.pixel.y})`}>
              <circle r="3" />
              <text x={label.x} y={label.y} textAnchor={label.align === 'left' ? 'end' : 'start'}>{city.name}</text>
            </g>
          )
        })}
        <text className="company-bento__coverage-city-origin" x={geometry.pixel.x + (compact ? 64 : 12)} y={geometry.pixel.y + (compact ? 24 : -17)} textAnchor={compact ? 'end' : 'start'}>
          <tspan>Нижний</tspan>
          <tspan x={geometry.pixel.x + (compact ? 64 : 12)} dy="14">Новгород</tspan>
        </text>
      </g>
    </svg>
  )
}
