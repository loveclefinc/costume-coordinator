/**
 * Costume Search and Filter Utility
 */

export interface CostumeSearchFilters {
  searchText?: string;
  colors?: string[];
  tones?: string[];
  patterns?: string[];
  tags?: string[];
  seasons?: string[];
}

export interface SearchResult {
  id: string;
  name: string;
  matchScore: number;
  matchReasons: string[];
}

/**
 * Search costumes by text and filters
 */
export function searchCostumes(
  costumes: any[],
  filters: CostumeSearchFilters
): SearchResult[] {
  return costumes
    .map((costume) => {
      const matchReasons: string[] = [];
      let matchScore = 0;

      // Text search (name, description)
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        const nameLower = costume.name?.toLowerCase() || '';
        const descLower = costume.description?.toLowerCase() || '';

        if (nameLower.includes(searchLower)) {
          matchScore += 50;
          matchReasons.push(`名前に「${filters.searchText}」を含む`);
        }
        if (descLower.includes(searchLower)) {
          matchScore += 25;
          matchReasons.push(`説明に「${filters.searchText}」を含む`);
        }
      }

      // Color filter
      if (filters.colors && filters.colors.length > 0) {
        const costumeColors = costume.colors || [];
        const colorMatches = costumeColors.filter((c: string) =>
          filters.colors!.includes(c)
        );

        if (colorMatches.length > 0) {
          matchScore += colorMatches.length * 20;
          matchReasons.push(
            `色が一致: ${colorMatches.join(', ')}`
          );
        }
      }

      // Tone filter
      if (filters.tones && filters.tones.length > 0) {
        const costumeTones = costume.tones || [];
        const toneMatches = costumeTones.filter((t: string) =>
          filters.tones!.includes(t)
        );

        if (toneMatches.length > 0) {
          matchScore += toneMatches.length * 15;
          matchReasons.push(
            `トーンが一致: ${toneMatches.join(', ')}`
          );
        }
      }

      // Pattern filter
      if (filters.patterns && filters.patterns.length > 0) {
        const pattern = costume.pattern;
        if (pattern && filters.patterns.includes(pattern)) {
          matchScore += 15;
          matchReasons.push(`柄が一致: ${pattern}`);
        }
      }

      // Tag filter
      if (filters.tags && filters.tags.length > 0) {
        const costumeTags = costume.tags || [];
        const tagMatches = costumeTags.filter((tag: string) =>
          filters.tags!.includes(tag)
        );

        if (tagMatches.length > 0) {
          matchScore += tagMatches.length * 10;
          matchReasons.push(
            `タグが一致: ${tagMatches.join(', ')}`
          );
        }
      }

      // Season filter
      if (filters.seasons && filters.seasons.length > 0) {
        const season = costume.season;
        if (season && filters.seasons.includes(season)) {
          matchScore += 10;
          matchReasons.push(`季節が一致: ${season}`);
        }
      }

      return {
        id: costume.id,
        name: costume.name,
        matchScore,
        matchReasons,
      };
    })
    .filter((result) => result.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Filter costumes by single criterion
 */
export function filterCostumes(
  costumes: any[],
  criterion: keyof CostumeSearchFilters,
  values: string[]
): any[] {
  if (!values || values.length === 0) {
    return costumes;
  }

  return costumes.filter((costume) => {
    switch (criterion) {
      case 'colors':
        const costumeColors = costume.colors || [];
        return costumeColors.some((c: string) => values.includes(c));

      case 'tones':
        const costumeTones = costume.tones || [];
        return costumeTones.some((t: string) => values.includes(t));

      case 'patterns':
        return values.includes(costume.pattern);

      case 'tags':
        const costumeTags = costume.tags || [];
        return costumeTags.some((tag: string) => values.includes(tag));

      case 'seasons':
        return values.includes(costume.season);

      default:
        return true;
    }
  });
}

/**
 * Get available filter options
 */
export function getAvailableFilterOptions(costumes: any[]) {
  const options = {
    colors: new Set<string>(),
    tones: new Set<string>(),
    patterns: new Set<string>(),
    tags: new Set<string>(),
    seasons: new Set<string>(),
  };

  costumes.forEach((costume) => {
    (costume.colors || []).forEach((c: string) => options.colors.add(c));
    (costume.tones || []).forEach((t: string) => options.tones.add(t));
    if (costume.pattern) options.patterns.add(costume.pattern);
    (costume.tags || []).forEach((tag: string) => options.tags.add(tag));
    if (costume.season) options.seasons.add(costume.season);
  });

  return {
    colors: Array.from(options.colors),
    tones: Array.from(options.tones),
    patterns: Array.from(options.patterns),
    tags: Array.from(options.tags),
    seasons: Array.from(options.seasons),
  };
}

/**
 * Get color category label
 */
export function getColorCategoryLabel(color: string): string {
  const colorLabels: Record<string, string> = {
    red: '赤',
    orange: 'オレンジ',
    yellow: '黄色',
    green: '緑',
    blue: '青',
    purple: '紫',
    pink: 'ピンク',
    white: '白',
    black: '黒',
    gray: 'グレー',
    brown: '茶色',
    beige: 'ベージュ',
    navy: 'ネイビー',
  };

  return colorLabels[color.toLowerCase()] || color;
}

/**
 * Get tone label
 */
export function getToneLabel(tone: string): string {
  const toneLabels: Record<string, string> = {
    pastel: 'パステル',
    vivid: 'ビビッド',
    dark: 'ダーク',
    light: 'ライト',
    muted: 'ミュート',
    bright: 'ブライト',
  };

  return toneLabels[tone.toLowerCase()] || tone;
}

/**
 * Get pattern label
 */
export function getPatternLabel(pattern: string): string {
  const patternLabels: Record<string, string> = {
    solid: '無地',
    floral: '花柄',
    stripe: 'ストライプ',
    dot: 'ドット',
    check: 'チェック',
    geometric: '幾何学模様',
    animal: 'アニマル柄',
    other: 'その他',
  };

  return patternLabels[pattern.toLowerCase()] || pattern;
}

/**
 * Get season label
 */
export function getSeasonLabel(season: string): string {
  const seasonLabels: Record<string, string> = {
    spring: '春',
    summer: '夏',
    autumn: '秋',
    winter: '冬',
    all: 'オールシーズン',
  };

  return seasonLabels[season.toLowerCase()] || season;
}
