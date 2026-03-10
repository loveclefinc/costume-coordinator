/**
 * UI Components for Costume Coordinator
 * Provides reusable UI components for item type selection, attribute input, and preview
 */

import { ItemType, ExtendedCostume, Coordinate } from './costume-types';

export interface ItemTypeOption {
  type: ItemType;
  label: string;
  icon: string;
  description: string;
  color: string;
}

export const ITEM_TYPE_OPTIONS: ItemTypeOption[] = [
  {
    type: ItemType.SUIT,
    label: 'スーツ',
    icon: '👔',
    description: 'ビジネススーツ',
    color: '#1a1a2e',
  },
  {
    type: ItemType.NECKTIE,
    label: 'ネクタイ',
    icon: '🎀',
    description: 'ネクタイ',
    color: '#ff6b6b',
  },
  {
    type: ItemType.BOW_TIE,
    label: '蝶ネクタイ',
    icon: '🦋',
    description: 'フォーマルな蝶ネクタイ',
    color: '#4ecdc4',
  },
  {
    type: ItemType.DRESS_SHIRT,
    label: 'ワイシャツ',
    icon: '👕',
    description: 'ワイシャツ',
    color: '#ffffff',
  },
];

export interface AttributeField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'color' | 'number';
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export const ITEM_TYPE_ATTRIBUTES: Record<ItemType, AttributeField[]> = {
  [ItemType.SUIT]: [
    {
      key: 'color',
      label: '色',
      type: 'select',
      required: true,
      options: ['黒', '紺', '濃いグレー', 'グレー', '茶色', 'その他'],
    },
    {
      key: 'material',
      label: '素材',
      type: 'select',
      required: true,
      options: ['ウール', 'コットン', 'ポリエステル', '混紡', 'その他'],
    },
    {
      key: 'pattern',
      label: '柄',
      type: 'select',
      required: true,
      options: ['無地', 'ストライプ', 'チェック', 'その他'],
    },
    {
      key: 'fit',
      label: 'フィット感',
      type: 'select',
      required: true,
      options: ['スリム', 'レギュラー', 'ルーズ'],
    },
    {
      key: 'season',
      label: '季節',
      type: 'select',
      required: true,
      options: ['春', '夏', '秋', '冬', 'オールシーズン'],
    },
    {
      key: 'brand',
      label: 'ブランド',
      type: 'text',
      required: false,
      placeholder: 'ブランド名（オプション）',
    },
  ],
  [ItemType.NECKTIE]: [
    {
      key: 'color',
      label: '色',
      type: 'select',
      required: true,
      options: ['黒', '紺', '赤', '銀', 'グレー', 'その他'],
    },
    {
      key: 'pattern',
      label: '柄',
      type: 'select',
      required: true,
      options: ['無地', 'ストライプ', 'ドット', 'チェック', 'その他'],
    },
    {
      key: 'material',
      label: '素材',
      type: 'select',
      required: true,
      options: ['シルク', 'ポリエステル', '混紡', 'その他'],
    },
    {
      key: 'width',
      label: '幅',
      type: 'select',
      required: true,
      options: ['ナロー', 'レギュラー', 'ワイド'],
    },
    {
      key: 'brand',
      label: 'ブランド',
      type: 'text',
      required: false,
      placeholder: 'ブランド名（オプション）',
    },
  ],
  [ItemType.BOW_TIE]: [
    {
      key: 'color',
      label: '色',
      type: 'select',
      required: true,
      options: ['黒', '白', '紺', '赤', 'シルバー', 'その他'],
    },
    {
      key: 'pattern',
      label: '柄',
      type: 'select',
      required: true,
      options: ['無地', 'ドット', 'チェック', 'その他'],
    },
    {
      key: 'material',
      label: '素材',
      type: 'select',
      required: true,
      options: ['シルク', 'ポリエステル', '混紡', 'その他'],
    },
    {
      key: 'style',
      label: 'スタイル',
      type: 'select',
      required: true,
      options: ['クラシック', 'モダン', 'ボウタイ型'],
    },
    {
      key: 'brand',
      label: 'ブランド',
      type: 'text',
      required: false,
      placeholder: 'ブランド名（オプション）',
    },
  ],
  [ItemType.DRESS_SHIRT]: [
    {
      key: 'color',
      label: '色',
      type: 'select',
      required: true,
      options: ['白', 'オフホワイト', '薄いブルー', 'ピンク', 'その他'],
    },
    {
      key: 'material',
      label: '素材',
      type: 'select',
      required: true,
      options: ['コットン', 'ポリエステル', '混紡', 'その他'],
    },
    {
      key: 'collar_type',
      label: 'えり型',
      type: 'select',
      required: true,
      options: ['レギュラー', 'ワイド', 'ボタンダウン', 'その他'],
    },
    {
      key: 'fit',
      label: 'フィット感',
      type: 'select',
      required: true,
      options: ['スリム', 'レギュラー', 'ルーズ'],
    },
    {
      key: 'cuff_type',
      label: 'カフス型',
      type: 'select',
      required: true,
      options: ['レギュラー', 'フレンチカフス', 'その他'],
    },
    {
      key: 'brand',
      label: 'ブランド',
      type: 'text',
      required: false,
      placeholder: 'ブランド名（オプション）',
    },
  ],
};

export interface CoordinatePreviewData {
  suit?: ExtendedCostume;
  necktie?: ExtendedCostume;
  bow_tie?: ExtendedCostume;
  shirt?: ExtendedCostume;
  score: number;
  recommendations: string[];
}

export interface PreviewStyle {
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  shadowColor: string;
}

export const PREVIEW_STYLES: Record<ItemType, PreviewStyle> = {
  [ItemType.SUIT]: {
    backgroundColor: '#2c3e50',
    textColor: '#ecf0f1',
    borderColor: '#34495e',
    shadowColor: 'rgba(0, 0, 0, 0.3)',
  },
  [ItemType.NECKTIE]: {
    backgroundColor: '#e74c3c',
    textColor: '#ffffff',
    borderColor: '#c0392b',
    shadowColor: 'rgba(231, 76, 60, 0.3)',
  },
  [ItemType.BOW_TIE]: {
    backgroundColor: '#9b59b6',
    textColor: '#ffffff',
    borderColor: '#8e44ad',
    shadowColor: 'rgba(155, 89, 182, 0.3)',
  },
  [ItemType.DRESS_SHIRT]: {
    backgroundColor: '#ecf0f1',
    textColor: '#2c3e50',
    borderColor: '#bdc3c7',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
  },
};

export function getItemTypeLabel(type: ItemType): string {
  const option = ITEM_TYPE_OPTIONS.find((opt) => opt.type === type);
  return option?.label || type;
}

export function getItemTypeIcon(type: ItemType): string {
  const option = ITEM_TYPE_OPTIONS.find((opt) => opt.type === type);
  return option?.icon || '👔';
}

export function getItemTypeColor(type: ItemType): string {
  const option = ITEM_TYPE_OPTIONS.find((opt) => opt.type === type);
  return option?.color || '#000000';
}

export function getAttributeFields(type: ItemType): AttributeField[] {
  return ITEM_TYPE_ATTRIBUTES[type] || [];
}

export function validateItemAttributes(
  type: ItemType,
  attributes: Record<string, any>
): { valid: boolean; errors: string[] } {
  const fields = getAttributeFields(type);
  const errors: string[] = [];

  for (const field of fields) {
    if (field.required && !attributes[field.key]) {
      errors.push(`${field.label}は必須です`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function formatCoordinateScore(score: number): string {
  return `${Math.round(score * 100)}%`;
}

export function getScoreColor(score: number): string {
  if (score >= 0.9) return '#27ae60'; // 緑
  if (score >= 0.7) return '#f39c12'; // オレンジ
  if (score >= 0.5) return '#e67e22'; // 濃いオレンジ
  return '#e74c3c'; // 赤
}

export function getScoreLabel(score: number): string {
  if (score >= 0.9) return '完璧';
  if (score >= 0.8) return '非常に良い';
  if (score >= 0.7) return '良い';
  if (score >= 0.6) return 'まあまあ';
  if (score >= 0.5) return 'OK';
  return 'イマイチ';
}

export function generatePreviewHTML(data: CoordinatePreviewData): string {
  const items = [
    { type: ItemType.SUIT, label: 'スーツ', item: data.suit },
    { type: ItemType.DRESS_SHIRT, label: 'ワイシャツ', item: data.shirt },
    { type: ItemType.NECKTIE, label: 'ネクタイ', item: data.necktie },
    { type: ItemType.BOW_TIE, label: '蝶ネクタイ', item: data.bow_tie },
  ];

  const itemsHTML = items
    .filter((item) => item.item)
    .map((item) => {
      const style = PREVIEW_STYLES[item.type];
      return `
        <div style="
          background-color: ${style.backgroundColor};
          color: ${style.textColor};
          padding: 15px;
          border-radius: 8px;
          margin: 10px 0;
          border: 2px solid ${style.borderColor};
          box-shadow: 0 2px 8px ${style.shadowColor};
        ">
          <strong>${item.label}</strong><br>
          ${item.item?.name || 'N/A'}<br>
          <small>${item.item?.attributes?.color || ''}</small>
        </div>
      `;
    })
    .join('');

  const scoreColor = getScoreColor(data.score);
  const scoreLabel = getScoreLabel(data.score);

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px;">
      <h2 style="text-align: center; color: #2c3e50;">コーディネート提案</h2>
      
      <div style="
        background-color: ${scoreColor};
        color: white;
        padding: 20px;
        border-radius: 8px;
        text-align: center;
        margin: 20px 0;
      ">
        <div style="font-size: 2em; font-weight: bold;">${formatCoordinateScore(data.score)}</div>
        <div style="font-size: 1.2em;">${scoreLabel}</div>
      </div>

      <div style="margin: 20px 0;">
        ${itemsHTML}
      </div>

      ${
        data.recommendations.length > 0
          ? `
        <div style="background-color: #ecf0f1; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <strong style="color: #2c3e50;">推奨事項：</strong>
          <ul style="color: #34495e; margin: 10px 0;">
            ${data.recommendations.map((rec) => `<li>${rec}</li>`).join('')}
          </ul>
        </div>
      `
          : ''
      }
    </div>
  `;
}
