import type { UsageHistory } from './storage'
import type { ThemePreferencesInput } from './costume-theme-match'
import {
  autoPickCostumesForEventTheme,
  type CostumeThemeMatch,
} from './costume-theme-match'
import type { Costume } from './storage'

/** 参加者提出用: 使用履歴で全件除外された場合はフォールバックして必ず候補を返す */
export function autoPickCostumesForParticipation(
  costumes: Costume[],
  themePreferences: ThemePreferencesInput | undefined,
  usageHistory: UsageHistory[],
  maxCount: number,
  recentUsageExcludeDays: number,
): CostumeThemeMatch[] {
  if (costumes.length === 0) return []

  let picked = autoPickCostumesForEventTheme(
    costumes,
    themePreferences,
    usageHistory,
    maxCount,
    undefined,
    recentUsageExcludeDays,
  )

  if (picked.length === 0 && recentUsageExcludeDays > 0) {
    picked = autoPickCostumesForEventTheme(
      costumes,
      themePreferences,
      usageHistory,
      maxCount,
      undefined,
      0,
    )
  }

  return picked
}
