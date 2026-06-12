import { hexToRgb, rgbToHsl } from './image-analysis'

/** Events テーマ選択と同じ色名 */
export const THEME_COLOR_NAMES = [
  'red',
  'pink',
  'purple',
  'blue',
  'cyan',
  'green',
  'yellow',
  'orange',
  'brown',
  'gray',
  'white',
  'black',
] as const

export type ThemeColorName = (typeof THEME_COLOR_NAMES)[number]

/** 各色名の代表 HEX（最近傍判定用） */
export const THEME_COLOR_REF_HEX: Record<ThemeColorName, string> = {
  red: '#E53935',
  pink: '#EC407A',
  purple: '#8E24AA',
  blue: '#1E88E5',
  cyan: '#00ACC1',
  green: '#43A047',
  yellow: '#FDD835',
  orange: '#FB8C00',
  brown: '#6D4C41',
  gray: '#9E9E9E',
  white: '#FAFAFA',
  black: '#212121',
}

const MAX_MATCH_DISTANCE = 95

function colorDistance(a: [number, number, number], b: [number, number, number]): number {
  return Math.sqrt(
    (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2,
  )
}

/**
 * HEX をテーマ用色名（red / blue 等）に変換。近い色がなければ null。
 */
export function hexToThemeColorName(hex: string): ThemeColorName | null {
  const normalized = hex.trim()
  const rgb = hexToRgb(normalized.startsWith('#') ? normalized : `#${normalized}`)
  if (!rgb) return null

  let best: ThemeColorName | null = null
  let bestDist = Infinity

  for (const name of THEME_COLOR_NAMES) {
    const ref = hexToRgb(THEME_COLOR_REF_HEX[name])
    if (!ref) continue
    const d = colorDistance(rgb, ref)
    if (d < bestDist) {
      bestDist = d
      best = name
    }
  }

  return bestDist <= MAX_MATCH_DISTANCE ? best : null
}

function isHexColor(value: string): boolean {
  return /^#?[0-9A-Fa-f]{6}$/.test(value.trim())
}

/**
 * 保存・最適化用: HEX はそのまま残し、対応する色名を併記（重複除去）
 */
export function enrichCostumeColors(colors: string[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()

  const add = (value: string) => {
    const key = value.toLowerCase()
    if (!value || seen.has(key)) return
    seen.add(key)
    out.push(value.startsWith('#') ? value.toUpperCase() : value)
  }

  for (const c of colors) {
    if (!c || typeof c !== 'string') continue
    const trimmed = c.trim()
    add(trimmed)
    if (isHexColor(trimmed)) {
      const hex = trimmed.startsWith('#') ? trimmed.toUpperCase() : `#${trimmed.toUpperCase()}`
      const name = hexToThemeColorName(hex)
      if (name) add(name)
    }
  }

  return out
}

/** テーマ・最適化で使う色名だけ（HEX 除外） */
export function themeColorNamesFrom(colors: string[]): string[] {
  return enrichCostumeColors(colors).filter((c) => !c.startsWith('#'))
}

/** 柄: AddCostume の solid と Events の plain を同一扱い */
export function normalizePattern(pattern: string): string {
  if (!pattern) return 'plain'
  const p = pattern.toLowerCase()
  if (p === 'solid') return 'plain'
  return p
}

/** 統一方針スコア用: 2着の色名が「同系」か */
export function colorNamesAreSimilar(names1: string[], names2: string[]): boolean {
  const a = themeColorNamesFrom(names1)
  const b = themeColorNamesFrom(names2)
  if (a.length === 0 || b.length === 0) return false
  return a.some((n) => b.includes(n))
}
