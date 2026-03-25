export function lightenHex(hex: string, mix: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const lr = Math.round(r + (255 - r) * mix)
  const lg = Math.round(g + (255 - g) * mix)
  const lb = Math.round(b + (255 - b) * mix)
  return `rgb(${lr},${lg},${lb})`
}
