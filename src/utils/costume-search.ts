import type { Costume } from './storage'
import { normalizeCostumeColors } from './costume-normalize'
import { silhouetteLabel } from './silhouette'
import { suitBreastingLabel, suitLapelLabel, suitStyleLabel } from './suit-attributes'
import { normalizePattern } from './theme-colors'

export const COLOR_LABELS: Record<string, string> = {
  red: '赤',
  pink: 'ピンク',
  purple: '紫',
  blue: '青',
  cyan: '水色',
  green: '緑',
  yellow: '黄色',
  orange: 'オレンジ',
  brown: '茶色',
  gray: 'グレー',
  white: '白',
  black: '黒',
  beige: 'ベージュ',
  navy: 'ネイビー',
}

export const TONE_LABELS: Record<string, string> = {
  pastel: 'パステル',
  vivid: '鮮やか',
  dark: '濃い',
  neutral: '落ち着いた',
  warm: '暖色',
  cool: '寒色',
}

export const PATTERN_LABELS: Record<string, string> = {
  plain: '無地',
  solid: '無地',
  floral: '花柄',
  stripe: 'ストライプ',
  striped: 'ストライプ',
  dot: 'ドット',
  check: 'チェック',
  geometric: '幾何学模様',
  animal: 'アニマル柄',
  other: 'その他',
}

export const SEASON_LABELS: Record<string, string> = {
  spring: '春',
  summer: '夏',
  autumn: '秋',
  fall: '秋',
  winter: '冬',
}

export const COSTUME_TYPE_LABELS: Record<string, string> = {
  dress: 'ドレス',
  suit: 'スーツ',
  shirt: 'シャツ',
  necktie: 'ネクタイ',
  bowtie: '蝶ネクタイ',
  accessory: '小物',
  other: 'その他',
}

export interface CostumeSearchResult {
  costume: Costume
  score: number
  matchedLabels: string[]
}

const QUERY_FILLER_WORDS = [
  '衣装',
  '服',
  'どんなの',
  'どんなもの',
  '持ってたっけ',
  '持っていたっけ',
  '持ってる',
  '持っている',
  '探したい',
  '探す',
  '検索',
  'みたい',
  'もの',
  'やつ',
  'の',
]

const QUERY_ALIASES: Record<string, string[]> = {
  青系: ['青', 'ブルー', '水色', 'ネイビー'],
  赤系: ['赤', 'ピンク', 'ワイン', 'ボルドー'],
  黄系: ['黄色', 'イエロー', '金'],
  緑系: ['緑', 'グリーン'],
  紫系: ['紫', 'パープル'],
  黒系: ['黒', 'ブラック'],
  白系: ['白', 'ホワイト'],
  茶系: ['茶色', 'ブラウン', 'ベージュ'],
  花: ['花柄', 'フローラル'],
  フローラル: ['花柄', 'フローラル'],
  ボーダー: ['ストライプ', '縞'],
  縞: ['ストライプ', '縞'],
  落ち着いた: ['落ち着いた', 'neutral', 'くすみ', '控えめ'],
  派手: ['鮮やか', 'vivid', '華やか'],
  鮮やか: ['鮮やか', 'vivid', '華やか'],
}

function labelFor(labels: Record<string, string>, value?: string): string {
  if (!value) return ''
  return labels[value.toLowerCase()] ?? value
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[、。,.!?！？「」『』（）()[\]【】]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function stripFillers(query: string): string {
  let text = query
  for (const filler of QUERY_FILLER_WORDS) {
    text = text.replaceAll(filler, ' ')
  }
  return text
}

export function queryTokens(query: string): string[][] {
  const normalized = normalizeText(query)
  if (!normalized) return []

  const compact = stripFillers(normalized).replace(/\s+/g, ' ').trim()
  const rawTokens = compact ? compact.split(' ') : [normalized]

  return rawTokens
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => {
      const aliases = QUERY_ALIASES[token] ?? []
      const suffixless = token.endsWith('系') ? token.slice(0, -1) : token
      return Array.from(new Set([token, suffixless, ...aliases].map(normalizeText).filter(Boolean)))
    })
}

export function costumeSearchLabels(costume: Costume): string[] {
  const labels = [
    costume.name,
    labelFor(COSTUME_TYPE_LABELS, costume.type),
    labelFor(TONE_LABELS, costume.tone),
    labelFor(PATTERN_LABELS, normalizePattern(costume.pattern)),
    costume.silhouette ? silhouetteLabel(costume.silhouette) : '',
    costume.suitStyle ? suitStyleLabel(costume.suitStyle) : '',
    costume.suitBreasting ? suitBreastingLabel(costume.suitBreasting) : '',
    costume.suitLapel ? suitLapelLabel(costume.suitLapel) : '',
    ...(Array.isArray(costume.season) ? costume.season.map((s) => labelFor(SEASON_LABELS, s)) : []),
    ...normalizeCostumeColors(costume.colors).flatMap((color) => [
      color,
      labelFor(COLOR_LABELS, color),
    ]),
  ]

  return Array.from(new Set(labels.map((label) => label.trim()).filter(Boolean)))
}

function scoreCostume(costume: Costume, tokenGroups: string[][]): CostumeSearchResult | null {
  const labels = costumeSearchLabels(costume)
  const searchable = normalizeText(labels.join(' '))
  const matchedLabels: string[] = []
  let score = 0

  for (const group of tokenGroups) {
    const matchedToken = group.find((token) => searchable.includes(token))
    if (!matchedToken) return null

    const label =
      labels.find((candidate) => normalizeText(candidate) === matchedToken) ??
      labels.find((candidate) => normalizeText(candidate).includes(matchedToken)) ??
      matchedToken
    matchedLabels.push(label)
    score += label === costume.name ? 30 : 15
  }

  return {
    costume,
    score,
    matchedLabels: Array.from(new Set(matchedLabels)),
  }
}

export function searchWardrobeCostumes(costumes: Costume[], query: string): CostumeSearchResult[] {
  const tokens = queryTokens(query)
  if (tokens.length === 0) {
    return costumes.map((costume) => ({ costume, score: 0, matchedLabels: [] }))
  }

  return costumes
    .map((costume) => scoreCostume(costume, tokens))
    .filter((result): result is CostumeSearchResult => result !== null)
    .sort((a, b) => b.score - a.score || b.costume.updatedAt - a.costume.updatedAt)
}
