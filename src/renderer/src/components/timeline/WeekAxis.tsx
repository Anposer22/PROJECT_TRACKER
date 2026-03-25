import { formatCW, ordinalToDateOnly, weekAxisKey } from '@shared/date'
import type { TimelineModel } from '@shared/types'

const PALETTE = ['#7c3aed', '#db2777', '#2563eb', '#ea580c', '#059669']

export function WeekAxis({
  model,
  dayWidth
}: {
  model: TimelineModel
  dayWidth: number
}): JSX.Element {
  const { minOrdinal, maxOrdinal } = model
  const totalDays = maxOrdinal - minOrdinal + 1
  const width = totalDays * dayWidth

  type Block = { start: number; end: number; label: string; color: string }
  const blocks: Block[] = []
  let i = minOrdinal
  while (i <= maxOrdinal) {
    const key = weekAxisKey(ordinalToDateOnly(i))
    const start = i
    while (i <= maxOrdinal && weekAxisKey(ordinalToDateOnly(i)) === key) {
      i++
    }
    const end = i - 1
    const label = formatCW(ordinalToDateOnly(start))
    blocks.push({ start, end, label, color: '' })
  }
  blocks.forEach((b, idx) => {
    b.color = PALETTE[idx % PALETTE.length]
  })

  return (
    <div className="week-axis-inner" style={{ width, position: 'relative', height: 52 }}>
      {blocks.map((b, idx) => {
        const left = (b.start - minOrdinal) * dayWidth
        const w = (b.end - b.start + 1) * dayWidth
        return (
          <div
            key={`${b.label}-${idx}`}
            style={{
              position: 'absolute',
              left,
              width: w,
              top: 22,
              height: 26,
              background: b.color,
              opacity: 0.85,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 600,
              color: '#fff',
              letterSpacing: '0.04em'
            }}
          >
            {b.label}
          </div>
        )
      })}
      <svg width={width} height={20} style={{ display: 'block' }}>
        {Array.from({ length: totalDays }, (_, k) => {
          const o = minOrdinal + k
          const x = k * dayWidth + dayWidth / 2
          const isWeekStart = k === 0 || weekAxisKey(ordinalToDateOnly(o)) !== weekAxisKey(ordinalToDateOnly(o - 1))
          return (
            <line
              key={o}
              x1={x}
              x2={x}
              y1={isWeekStart ? 2 : 8}
              y2={20}
              stroke="rgba(28,25,23,0.2)"
              strokeWidth={isWeekStart ? 1.5 : 1}
            />
          )
        })}
      </svg>
    </div>
  )
}
