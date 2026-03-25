import type { TimelineConnector, TimelineModel } from '@shared/types'
import { lightenHex } from './colorUtils'

const ARROW = 'M 0 -5 L 6 0 L 0 5 z'

export function TimelineSvg({
  model,
  selectedTaskId,
  onSelectTask,
  getTaskTitle,
  dayWidth = 38,
  laneHeight = 36
}: {
  model: TimelineModel
  selectedTaskId: string | null
  onSelectTask: (id: string) => void
  getTaskTitle: (taskId: string) => string
  dayWidth?: number
  laneHeight?: number
}): JSX.Element {
  const laneRow = new Map(model.lanes.map((l) => [l.laneId, l.rowIndex]))
  const rowCount = Math.max(1, model.lanes.length)
  const chartHeight = rowCount * laneHeight
  const totalDays = model.maxOrdinal - model.minOrdinal + 1
  const chartWidth = totalDays * dayWidth

  const xAt = (ord: number): number => (ord - model.minOrdinal) * dayWidth
  const centerX = (ord: number): number => xAt(ord) + dayWidth / 2
  const yMid = (row: number): number => row * laneHeight + laneHeight / 2

  return (
    <svg
      width={chartWidth}
      height={chartHeight}
      style={{ display: 'block' }}
      role="img"
      aria-label="Task timeline"
    >
      <defs>
        <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d={ARROW} fill="rgba(37,99,235,0.85)" />
        </marker>
      </defs>

      {Array.from({ length: rowCount }, (_, r) => (
        <line
          key={`guide-${r}`}
          x1={0}
          x2={chartWidth}
          y1={r * laneHeight + laneHeight / 2}
          y2={r * laneHeight + laneHeight / 2}
          stroke="rgba(28,25,23,0.12)"
          strokeWidth={1}
          strokeDasharray="4 6"
        />
      ))}

      <line
        x1={centerX(model.todayOrdinal)}
        x2={centerX(model.todayOrdinal)}
        y1={0}
        y2={chartHeight}
        stroke="rgba(13,148,136,0.45)"
        strokeWidth={2}
      />
      <text
        x={centerX(model.todayOrdinal) + 4}
        y={14}
        fontSize={10}
        fill="rgba(13,148,136,0.9)"
        fontWeight={600}
      >
        Today
      </text>

      {model.connectors.map((c, idx) => (
        <HandoffLine
          key={`${c.taskId}-${c.dateOrdinal}-${idx}`}
          c={c}
          laneRow={laneRow}
          centerX={centerX(c.dateOrdinal)}
          yMid={yMid}
          label={c.label}
        />
      ))}

      {model.segments.map((s, idx) => {
        const row = laneRow.get(s.laneId) ?? 0
        const x = xAt(s.startOrdinal) + 3
        const w = (s.endOrdinal - s.startOrdinal + 1) * dayWidth - 6
        const y = row * laneHeight + 7
        const h = 22
        const selected = s.taskId === selectedTaskId
        const tailRatio = s.isOngoing ? 0.28 : 0
        const tailW = w * tailRatio
        const solidW = w - tailW
        const base = s.color
        const light = lightenHex(base, 0.45)

        return (
          <g key={`${s.taskId}-${s.laneId}-${idx}`}>
            {s.isOngoing && tailW > 2 ? (
              <>
                <rect
                  x={x}
                  y={y}
                  width={solidW}
                  height={h}
                  rx={8}
                  fill={base}
                  opacity={0.92}
                  stroke={selected ? 'rgba(15,23,42,0.35)' : 'rgba(255,255,255,0.25)'}
                  strokeWidth={selected ? 2 : 1}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onSelectTask(s.taskId)}
                />
                <rect
                  x={x + solidW}
                  y={y}
                  width={tailW}
                  height={h}
                  rx={8}
                  fill={light}
                  opacity={0.55}
                  stroke={selected ? 'rgba(15,23,42,0.35)' : 'none'}
                  strokeWidth={selected ? 2 : 0}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onSelectTask(s.taskId)}
                />
              </>
            ) : (
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                rx={8}
                fill={base}
                opacity={0.92}
                stroke={selected ? 'rgba(15,23,42,0.35)' : 'rgba(255,255,255,0.2)'}
                strokeWidth={selected ? 2 : 1}
                style={{ cursor: 'pointer' }}
                onClick={() => onSelectTask(s.taskId)}
              />
            )}
            {w > 48 ? (
              <text
                x={x + 8}
                y={y + 15}
                fontSize={11}
                fill="rgba(255,255,255,0.95)"
                fontWeight={500}
                pointerEvents="none"
              >
                {truncate(getTaskTitle(s.taskId), 18)}
              </text>
            ) : null}
          </g>
        )
      })}
    </svg>
  )
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n - 1)}…`
}

function HandoffLine({
  c,
  laneRow,
  centerX,
  yMid,
  label
}: {
  c: TimelineConnector
  laneRow: Map<string, number>
  centerX: number
  yMid: (row: number) => number
  label?: string
}): JSX.Element {
  const r1 = laneRow.get(c.fromLaneId) ?? 0
  const r2 = laneRow.get(c.toLaneId) ?? 0
  const y1 = yMid(r1)
  const y2 = yMid(r2)
  const top = Math.min(y1, y2)
  const bottom = Math.max(y1, y2)
  if (bottom - top < 2) return <g />
  return (
    <g>
      <line
        x1={centerX}
        x2={centerX}
        y1={top}
        y2={bottom}
        stroke="rgba(37,99,235,0.75)"
        strokeWidth={1.5}
        markerEnd="url(#arrowhead)"
      />
      {label ? (
        <text
          x={centerX + 5}
          y={top + (bottom - top) / 2}
          fontSize={10}
          fill="rgba(37,99,235,0.95)"
          fontWeight={500}
        >
          {truncate(label, 22)}
        </text>
      ) : null}
    </g>
  )
}
