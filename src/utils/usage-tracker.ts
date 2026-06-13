import { storage, UsageHistory } from './storage'

/**
 * Record costume usage for an event (all participants at once)
 */
export async function recordCostumeUsage(
  eventId: string,
  assignments: { [participantId: string]: string }
): Promise<void> {
  const now = Date.now()

  for (const [participantName, costumeId] of Object.entries(assignments)) {
    await recordSingleCostumeUsage(eventId, participantName, costumeId, now)
  }
}

/**
 * Record a single costume usage entry (manual or partial)
 */
export async function recordSingleCostumeUsage(
  eventId: string,
  participantName: string,
  costumeId: string,
  usedAt: number = Date.now(),
): Promise<void> {
  const history: UsageHistory = {
    id: `usage_${eventId}_${participantName}_${usedAt}_${Math.random().toString(36).slice(2, 6)}`,
    costumeId,
    eventId,
    participantName: participantName.trim(),
    usedAt,
  }

  try {
    await storage.addUsageHistory(history)
  } catch (err) {
    console.error('Failed to record usage history:', err)
    throw err
  }
}

/**
 * Get usage statistics for a costume
 */
export async function getCostumeUsageStats(costumeId: string) {
  try {
    const history = await storage.getUsageHistoryByCostume(costumeId)
    const totalUses = history.length
    const lastUsed = history.length > 0 ? Math.max(...history.map(h => h.usedAt)) : null
    const daysSinceLastUse = lastUsed ? Math.floor((Date.now() - lastUsed) / (1000 * 60 * 60 * 24)) : null

    return {
      totalUses,
      lastUsed,
      daysSinceLastUse,
    }
  } catch (err) {
    console.error('Failed to get usage stats:', err)
    return {
      totalUses: 0,
      lastUsed: null,
      daysSinceLastUse: null,
    }
  }
}

/**
 * Get recent usage summary
 */
export async function getRecentUsageSummary(days: number = 30) {
  try {
    const history = await storage.getRecentUsageHistory(days)

    const summary: { [costumeId: string]: number } = {}
    history.forEach(h => {
      summary[h.costumeId] = (summary[h.costumeId] || 0) + 1
    })

    return summary
  } catch (err) {
    console.error('Failed to get usage summary:', err)
    return {}
  }
}
