import type { EventThemePreferences } from './storage'
import type { ColorUnificationPolicy, EventThemePreferencesPayload } from '../../shared/event-api-types'

type ThemePrefs = EventThemePreferences | EventThemePreferencesPayload

/**
 * 色味方針は3択（追加設定のチェックボックスは使わない）。
 * - unified … 色を統一する
 * - varied … 色をバラける
 * - varied_distinct … 色をバラける ＋ 似た色を避ける
 */
export function migrateColorUnificationPolicy(
  policy: ColorUnificationPolicy | 'neutral' | undefined,
  avoidSimilarColors?: boolean,
): ColorUnificationPolicy {
  if (policy === 'varied_distinct') return 'varied_distinct'
  if (policy === 'varied') {
    return avoidSimilarColors ? 'varied_distinct' : 'varied'
  }
  return 'unified'
}

export function isSpreadColorPolicy(policy?: ColorUnificationPolicy | 'neutral'): boolean {
  const migrated = migrateColorUnificationPolicy(policy)
  return migrated === 'varied' || migrated === 'varied_distinct'
}

/** UI 表示用ラベル */
export const COLOR_UNIFICATION_LABELS: Record<ColorUnificationPolicy, string> = {
  unified: '色を統一する',
  varied: '色をバラける',
  varied_distinct: '色をバラける（似た色も避ける）',
}

/** UI 補足説明 */
export const COLOR_UNIFICATION_HINTS: Record<ColorUnificationPolicy, string> = {
  unified:
    '全員を同じ色系（青系・白系など）で揃えます。写真の明るさや色の読み取りのブレがあるため、細かい同色の回避は行いません。',
  varied:
    '全員で違う色系を混ぜます。同じ色名（青同士など）が被っても、テーマに合えば選ばれることがあります。',
  varied_distinct:
    '色をバラけつつ、2人が同じ色名（青同士・白同士など）にならないよう避けます。',
}

/** 第3択のみ「似た色を避ける」ロジックを有効化 */
export function effectiveAvoidSimilarColors(theme?: ThemePrefs): boolean {
  return migrateColorUnificationPolicy(
    theme?.colorUnification,
    theme?.avoidSimilarColors,
  ) === 'varied_distinct'
}

/** 保存・送信前に方針と avoidSimilarColors を整合させる */
export function normalizeThemeColorPolicy<T extends ThemePrefs>(prefs: T): T {
  const colorUnification = migrateColorUnificationPolicy(
    prefs.colorUnification,
    prefs.avoidSimilarColors,
  )
  return {
    ...prefs,
    colorUnification,
    avoidSimilarColors: colorUnification === 'varied_distinct',
  }
}
