/**
 * Costume optimization algorithm
 * Finds optimal costume combinations for events based on constraints and preferences
 */

import { areSimilarColors } from "./image-analysis";

export interface CostumeData {
  id: number;
  participantId: number;
  participantName: string;
  costumeName: string;
  priority: number; // 1-5
  colors: {
    primary: string;
    secondary?: string;
  };
  colorCategory: "warm" | "cool" | "neutral";
  tone: "pastel" | "vivid" | "dark" | "neutral";
  pattern: "solid" | "floral" | "stripe" | "dot" | "other";
  lastUsedDate?: string;
  thumbnailUrl?: string;
}

export interface EventConditions {
  colorCategory?: "warm" | "cool" | "neutral";
  tone?: "pastel" | "vivid" | "dark" | "neutral";
  patternRules?: {
    allowFloral: boolean;
    floralMaxCount?: number;
  };
  avoidSimilarColors: boolean;
  recentUsageExcludeDays: number;
}

export interface Assignment {
  participantId: number;
  participantName: string;
  costumeId: number;
  costumeName: string;
  priority: number;
  thumbnailUrl?: string;
}

export interface OptimizationProposal {
  id: string;
  score: number;
  assignments: Assignment[];
  violations: string[];
}

/**
 * Main optimization function
 */
export function optimizeCostumes(
  costumes: CostumeData[],
  conditions: EventConditions,
  maxProposals = 5,
): OptimizationProposal[] {
  // Group costumes by participant
  const participantCostumes = groupByParticipant(costumes);

  // Sort each participant's costumes by priority
  for (const costumes of Object.values(participantCostumes)) {
    costumes.sort((a, b) => a.priority - b.priority);
  }

  const proposals: OptimizationProposal[] = [];

  // Generate initial proposal using greedy algorithm
  const initialProposal = greedyAssign(participantCostumes, conditions);
  if (initialProposal) {
    proposals.push(initialProposal);
  }

  // Generate alternative proposals using backtracking
  for (let i = 0; i < maxProposals - 1; i++) {
    const alternative = generateAlternative(participantCostumes, conditions, proposals);
    if (alternative) {
      proposals.push(alternative);
    } else {
      break;
    }
  }

  // Sort by score (descending)
  proposals.sort((a, b) => b.score - a.score);

  return proposals.slice(0, maxProposals);
}

/**
 * Group costumes by participant
 */
function groupByParticipant(costumes: CostumeData[]): Record<number, CostumeData[]> {
  const grouped: Record<number, CostumeData[]> = {};
  for (const costume of costumes) {
    if (!grouped[costume.participantId]) {
      grouped[costume.participantId] = [];
    }
    grouped[costume.participantId].push(costume);
  }
  return grouped;
}

/**
 * Greedy assignment algorithm
 */
function greedyAssign(
  participantCostumes: Record<number, CostumeData[]>,
  conditions: EventConditions,
): OptimizationProposal | null {
  const assignments: Assignment[] = [];
  const usedColors: string[] = [];
  const violations: string[] = [];
  let floralCount = 0;

  for (const [participantId, costumes] of Object.entries(participantCostumes)) {
    let assigned = false;

    for (const costume of costumes) {
      // Check constraints
      const constraintResult = checkConstraints(
        costume,
        conditions,
        usedColors,
        floralCount,
      );

      if (constraintResult.valid) {
        assignments.push({
          participantId: costume.participantId,
          participantName: costume.participantName,
          costumeId: costume.id,
          costumeName: costume.costumeName,
          priority: costume.priority,
          thumbnailUrl: costume.thumbnailUrl,
        });

        usedColors.push(costume.colors.primary);
        if (costume.pattern === "floral") {
          floralCount++;
        }
        assigned = true;
        break;
      } else {
        violations.push(...constraintResult.violations);
      }
    }

    if (!assigned) {
      // No valid costume found for this participant
      violations.push(
        `${costumes[0].participantName}の条件を満たす衣装が見つかりませんでした`,
      );
    }
  }

  if (assignments.length === 0) {
    return null;
  }

  const score = calculateScore(assignments, conditions, violations);

  return {
    id: generateProposalId(),
    score,
    assignments,
    violations: Array.from(new Set(violations)), // Deduplicate
  };
}

/**
 * Generate alternative proposal
 */
function generateAlternative(
  participantCostumes: Record<number, CostumeData[]>,
  conditions: EventConditions,
  existingProposals: OptimizationProposal[],
): OptimizationProposal | null {
  // Try different starting points by shuffling priorities
  const shuffled = { ...participantCostumes };
  for (const participantId of Object.keys(shuffled)) {
    const costumes = [...shuffled[Number(participantId)]];
    // Rotate priorities slightly
    if (costumes.length > 1) {
      const first = costumes.shift()!;
      costumes.push(first);
    }
    shuffled[Number(participantId)] = costumes;
  }

  const proposal = greedyAssign(shuffled, conditions);

  // Check if this proposal is different from existing ones
  if (proposal && !isDuplicateProposal(proposal, existingProposals)) {
    return proposal;
  }

  return null;
}

/**
 * Check if proposal is duplicate
 */
function isDuplicateProposal(
  proposal: OptimizationProposal,
  existing: OptimizationProposal[],
): boolean {
  for (const existingProposal of existing) {
    const sameAssignments = proposal.assignments.every((a) =>
      existingProposal.assignments.some(
        (ea) => ea.participantId === a.participantId && ea.costumeId === a.costumeId,
      ),
    );
    if (sameAssignments) {
      return true;
    }
  }
  return false;
}

/**
 * Check constraints for a costume
 */
function checkConstraints(
  costume: CostumeData,
  conditions: EventConditions,
  usedColors: string[],
  floralCount: number,
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];

  // Check recent usage
  if (costume.lastUsedDate) {
    const lastUsed = new Date(costume.lastUsedDate);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - lastUsed.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff < conditions.recentUsageExcludeDays) {
      violations.push(`${costume.costumeName}は直近${daysDiff}日前に使用済み`);
    }
  }

  // Check color category
  if (conditions.colorCategory && costume.colorCategory !== conditions.colorCategory) {
    violations.push(`${costume.costumeName}は指定色系統(${conditions.colorCategory})に合致しません`);
  }

  // Check tone
  if (conditions.tone && costume.tone !== conditions.tone) {
    violations.push(`${costume.costumeName}は指定トーン(${conditions.tone})に合致しません`);
  }

  // Check floral pattern
  if (
    conditions.patternRules &&
    !conditions.patternRules.allowFloral &&
    costume.pattern === "floral"
  ) {
    violations.push(`${costume.costumeName}は花柄ですが、花柄は許可されていません`);
  }

  if (
    conditions.patternRules?.floralMaxCount &&
    costume.pattern === "floral" &&
    floralCount >= conditions.patternRules.floralMaxCount
  ) {
    violations.push(`花柄の上限(${conditions.patternRules.floralMaxCount}人)に達しています`);
  }

  // Check similar colors
  if (conditions.avoidSimilarColors) {
    for (const usedColor of usedColors) {
      if (areSimilarColors(costume.colors.primary, usedColor, 30)) {
        violations.push(`${costume.costumeName}は既に使用されている色と類似しています`);
        break;
      }
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

/**
 * Calculate score for an assignment
 */
function calculateScore(
  assignments: Assignment[],
  conditions: EventConditions,
  violations: string[],
): number {
  let score = 0;

  // Priority score (higher priority = higher score)
  for (const assignment of assignments) {
    score += 60 - assignment.priority * 10; // 1st: 50, 2nd: 40, ..., 5th: 10
  }

  // Penalty for violations
  score -= violations.length * 20;

  // Bonus for full assignment
  if (assignments.length > 0) {
    score += 50;
  }

  return Math.max(0, score);
}

/**
 * Generate unique proposal ID
 */
function generateProposalId(): string {
  return `proposal_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
