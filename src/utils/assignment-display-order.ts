import type { StageArrangementMode } from '../../shared/event-api-types'
import { THEME_COLOR_REF_HEX, themeColorNamesFrom, type ThemeColorName } from './theme-colors'

export interface AssignmentDisplayItem {
  participantName: string
  colors: string[]
}

const COLOR_HUE_ORDER: Record<ThemeColorName, number> = {
  red: 0,
  orange: 30,
  yellow: 60,
  green: 120,
  cyan: 180,
  blue: 220,
  purple: 280,
  pink: 330,
  brown: 35,
  white: 361,
  gray: 362,
  black: 363,
}

function hueFromHex(hex: string): number | null {
  const raw = hex.replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return null
  const r = parseInt(raw.slice(0, 2), 16) / 255
  const g = parseInt(raw.slice(2, 4), 16) / 255
  const b = parseInt(raw.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  if (delta === 0) return 362
  let hue = 0
  if (max === r) hue = ((g - b) / delta) % 6
  else if (max === g) hue = (b - r) / delta + 2
  else hue = (r - g) / delta + 4
  return (hue * 60 + 360) % 360
}

function assignmentHue(item: AssignmentDisplayItem): number {
  const colorName = themeColorNamesFrom(item.colors)[0] as ThemeColorName | undefined
  if (colorName && COLOR_HUE_ORDER[colorName] != null) return COLOR_HUE_ORDER[colorName]

  const hex = item.colors.find((color) => /^#?[0-9a-fA-F]{6}$/.test(color))
  if (hex) return hueFromHex(hex.startsWith('#') ? hex : `#${hex}`) ?? 362

  if (colorName && THEME_COLOR_REF_HEX[colorName]) {
    return hueFromHex(THEME_COLOR_REF_HEX[colorName]) ?? 362
  }

  return 362
}

function alternatingToneOrder<T extends AssignmentDisplayItem>(items: T[]): T[] {
  const sorted = [...items].sort((a, b) => assignmentHue(a) - assignmentHue(b))
  const ordered: T[] = []
  let left = 0
  let right = sorted.length - 1
  while (left <= right) {
    ordered.push(sorted[left])
    if (left !== right) ordered.push(sorted[right])
    left += 1
    right -= 1
  }
  return ordered
}

function colorFlowOrder<T extends AssignmentDisplayItem>(items: T[]): T[] {
  return [...items].sort((a, b) => assignmentHue(a) - assignmentHue(b))
}

function hasEnoughColorVariety(items: AssignmentDisplayItem[]): boolean {
  const hues = new Set(items.map((item) => Math.round(assignmentHue(item) / 30)))
  return hues.size >= Math.min(4, items.length)
}

export function arrangeAssignmentsForStage<T extends AssignmentDisplayItem>(
  items: T[],
  mode: StageArrangementMode | undefined,
): T[] {
  if (!mode || mode === 'participant_order') return items
  return hasEnoughColorVariety(items) ? colorFlowOrder(items) : alternatingToneOrder(items)
}
