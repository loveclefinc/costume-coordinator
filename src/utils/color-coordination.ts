import type { ColorCoordinationAnchor } from './storage'
import { colorNamesAreSimilar, enrichCostumeColors } from './theme-colors'

export const COLOR_COORDINATION_MODE_LABELS: Record<ColorCoordinationAnchor['mode'], string> = {
  avoid: '重ならない（除外）',
  match: '合わせる（似た色）',
}

/** 基準色との関係スコア（1.0 = 中立、高い = 好ましい） */
export function calculateColorAnchorScore(
  costumeColors: string[],
  anchors: ColorCoordinationAnchor[] | undefined,
): number {
  if (!anchors || anchors.length === 0) return 1

  const colors = enrichCostumeColors(costumeColors)
  if (colors.length === 0) return 1

  let score = 1
  for (const anchor of anchors) {
    if (!anchor.colors || anchor.colors.length === 0) continue
    const similar = colorNamesAreSimilar(colors, anchor.colors)
    if (anchor.mode === 'avoid') {
      score *= similar ? 0.45 : 1.08
    } else {
      score *= similar ? 1.2 : 0.7
    }
  }
  return score
}

export function buildColorAnchorReasons(
  costumeColors: string[],
  anchors: ColorCoordinationAnchor[] | undefined,
): string[] {
  if (!anchors || anchors.length === 0) return []

  const reasons: string[] = []
  for (const anchor of anchors) {
    if (!anchor.colors?.length) continue
    const similar = colorNamesAreSimilar(costumeColors, anchor.colors)
    const label = anchor.label?.trim() || '基準衣装'
    if (anchor.mode === 'avoid') {
      reasons.push(similar ? `${label}と色が重なりやすい` : `${label}と色が重なりにくい`)
    } else {
      reasons.push(similar ? `${label}と色を合わせやすい` : `${label}と色が合いにくい`)
    }
  }
  return reasons
}

export function createEmptyColorAnchor(): ColorCoordinationAnchor {
  return {
    id: `anchor_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    label: '',
    colors: [],
    mode: 'avoid',
  }
}
