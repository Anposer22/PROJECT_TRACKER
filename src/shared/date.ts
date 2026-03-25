/** Date-only helpers: YYYY-MM-DD, local calendar semantics for "today". */

const RE = /^(\d{4})-(\d{2})-(\d{2})$/

export function parseDateOnly(s: string): { y: number; m: number; d: number } | null {
  const m = s.match(RE)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
  const dt = new Date(y, mo - 1, d)
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null
  return { y, m: mo, d }
}

export function isValidDateOnly(s: string): boolean {
  return parseDateOnly(s) !== null
}

/** Ordinal days since a fixed epoch for stable comparisons (local dates). */
const EPOCH_Y = 1970
const EPOCH_M = 1
const EPOCH_D = 1

function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate()
}

export function dateOnlyToOrdinal(dateStr: string): number {
  const p = parseDateOnly(dateStr)
  if (!p) throw new Error(`Invalid date: ${dateStr}`)
  let n = 0
  for (let y = EPOCH_Y; y < p.y; y++) {
    n += isLeap(y) ? 366 : 365
  }
  for (let m = 1; m < p.m; m++) {
    n += daysInMonth(p.y, m)
  }
  n += p.d - EPOCH_D
  return n
}

export function ordinalToDateOnly(ordinal: number): string {
  let y = EPOCH_Y
  let rem = ordinal
  while (true) {
    const dy = isLeap(y) ? 366 : 365
    if (rem < dy) break
    rem -= dy
    y++
  }
  let m = 1
  while (m <= 12) {
    const dm = daysInMonth(y, m)
    if (rem < dm) break
    rem -= dm
    m++
  }
  const d = rem + 1
  return `${y.toString().padStart(4, '0')}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`
}

function isLeap(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
}

export function todayDateOnly(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  const d = now.getDate()
  return `${y.toString().padStart(4, '0')}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`
}

export function compareDateOnly(a: string, b: string): number {
  return dateOnlyToOrdinal(a) - dateOnlyToOrdinal(b)
}

export function maxDateOnly(a: string, b: string): string {
  return compareDateOnly(a, b) >= 0 ? a : b
}

export function minDateOnly(a: string, b: string): string {
  return compareDateOnly(a, b) <= 0 ? a : b
}

/**
 * ISO week label (e.g. CW12) for a local calendar date.
 * Uses the Thursday-in-week rule via the common +4 − day adjustment.
 */
export function formatCW(dateStr: string): string {
  const p = parseDateOnly(dateStr)
  if (!p) throw new Error(`Invalid date: ${dateStr}`)
  const d = new Date(p.y, p.m - 1, p.d)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() === 0 ? 7 : d.getDay()
  d.setDate(d.getDate() + 4 - day)
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `CW${weekNo}`
}

/** Stable key for grouping axis blocks by ISO week. */
export function weekAxisKey(dateStr: string): string {
  const p = parseDateOnly(dateStr)
  if (!p) throw new Error(`Invalid date: ${dateStr}`)
  const d = new Date(p.y, p.m - 1, p.d)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() === 0 ? 7 : d.getDay()
  d.setDate(d.getDate() + 4 - day)
  const y = d.getFullYear()
  const yearStart = new Date(y, 0, 1)
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${y}-W${weekNo.toString().padStart(2, '0')}`
}
