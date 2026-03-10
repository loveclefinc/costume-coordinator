/**
 * Visual Preview Component for Costume Coordinator
 * Renders layered preview of suit, shirt, necktie, and bow tie
 */

import { ItemType, ExtendedCostume } from './costume-types';

export interface PreviewLayer {
  type: ItemType;
  item: ExtendedCostume;
  zIndex: number;
  opacity: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface PreviewConfig {
  width: number;
  height: number;
  backgroundColor: string;
  showLabels: boolean;
  showScore: boolean;
  animationDuration: number;
}

export const DEFAULT_PREVIEW_CONFIG: PreviewConfig = {
  width: 300,
  height: 400,
  backgroundColor: '#f5f5f5',
  showLabels: true,
  showScore: true,
  animationDuration: 300,
};

export const LAYER_CONFIG: Record<ItemType, PreviewLayer> = {
  [ItemType.SUIT]: {
    type: ItemType.SUIT,
    item: null as any,
    zIndex: 1,
    opacity: 1,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  },
  [ItemType.DRESS_SHIRT]: {
    type: ItemType.DRESS_SHIRT,
    item: null as any,
    zIndex: 2,
    opacity: 0.9,
    scale: 0.95,
    offsetX: 5,
    offsetY: 10,
  },
  [ItemType.NECKTIE]: {
    type: ItemType.NECKTIE,
    item: null as any,
    zIndex: 3,
    opacity: 1,
    scale: 0.6,
    offsetX: 0,
    offsetY: 30,
  },
  [ItemType.BOW_TIE]: {
    type: ItemType.BOW_TIE,
    item: null as any,
    zIndex: 4,
    opacity: 1,
    scale: 0.5,
    offsetX: 0,
    offsetY: 25,
  },
};

export function generatePreviewSVG(
  suit: ExtendedCostume | undefined,
  shirt: ExtendedCostume | undefined,
  necktie: ExtendedCostume | undefined,
  bowTie: ExtendedCostume | undefined,
  config: Partial<PreviewConfig> = {}
): string {
  const finalConfig = { ...DEFAULT_PREVIEW_CONFIG, ...config };

  const layers: Array<{ type: string; item: ExtendedCostume; svg: string }> = [];

  if (suit) {
    layers.push({
      type: 'Suit',
      item: suit,
      svg: generateSuitSVG(suit, finalConfig),
    });
  }

  if (shirt) {
    layers.push({
      type: 'Shirt',
      item: shirt,
      svg: generateShirtSVG(shirt, finalConfig),
    });
  }

  if (necktie) {
    layers.push({
      type: 'Necktie',
      item: necktie,
      svg: generateNecktaiSVG(necktie, finalConfig),
    });
  }

  if (bowTie) {
    layers.push({
      type: 'Bow Tie',
      item: bowTie,
      svg: generateBowTieSVG(bowTie, finalConfig),
    });
  }

  const layersHTML = layers
    .map(
      (layer) => `
    <g class="layer layer-${layer.type.toLowerCase()}">
      ${layer.svg}
    </g>
  `
    )
    .join('');

  return `
    <svg width="${finalConfig.width}" height="${finalConfig.height}" viewBox="0 0 ${finalConfig.width} ${finalConfig.height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>
          .layer { transition: opacity ${finalConfig.animationDuration}ms ease-in-out; }
          .layer:hover { opacity: 0.8; }
          .item-label { font-size: 12px; font-weight: bold; text-anchor: middle; }
        </style>
      </defs>
      
      <rect width="${finalConfig.width}" height="${finalConfig.height}" fill="${finalConfig.backgroundColor}" />
      
      ${layersHTML}
    </svg>
  `;
}

function generateSuitSVG(suit: ExtendedCostume, config: PreviewConfig): string {
  const color = getColorHex(suit.attributes.color);
  const x = config.width / 2 - 40;
  const y = 20;

  return `
    <g class="suit">
      <!-- Suit jacket -->
      <rect x="${x}" y="${y}" width="80" height="120" fill="${color}" stroke="#333" stroke-width="2" rx="8" />
      
      <!-- Lapels -->
      <polygon points="${x + 20},${y + 30} ${x + 40},${y + 60} ${x + 20},${y + 80}" fill="${darkenColor(color, 0.2)}" />
      <polygon points="${x + 60},${y + 30} ${x + 40},${y + 60} ${x + 60},${y + 80}" fill="${darkenColor(color, 0.2)}" />
      
      <!-- Buttons -->
      <circle cx="${x + 40}" cy="${y + 50}" r="3" fill="#666" />
      <circle cx="${x + 40}" cy="${y + 70}" r="3" fill="#666" />
      <circle cx="${x + 40}" cy="${y + 90}" r="3" fill="#666" />
      
      ${config.showLabels ? `<text x="${x + 40}" y="${y + 150}" class="item-label">${suit.name}</text>` : ''}
    </g>
  `;
}

function generateShirtSVG(shirt: ExtendedCostume, config: PreviewConfig): string {
  const color = getColorHex(shirt.attributes.color);
  const x = config.width / 2 - 35;
  const y = 35;

  return `
    <g class="shirt">
      <!-- Shirt body -->
      <rect x="${x}" y="${y}" width="70" height="100" fill="${color}" stroke="#ccc" stroke-width="1.5" rx="6" />
      
      <!-- Collar -->
      <polygon points="${x + 20},${y} ${x + 35},${y + 15} ${x + 50},${y}" fill="${color}" stroke="#ccc" stroke-width="1" />
      
      <!-- Buttons -->
      <circle cx="${x + 35}" cy="${y + 20}" r="2" fill="#999" />
      <circle cx="${x + 35}" cy="${y + 40}" r="2" fill="#999" />
      <circle cx="${x + 35}" cy="${y + 60}" r="2" fill="#999" />
      
      ${config.showLabels ? `<text x="${x + 35}" y="${y + 115}" class="item-label">${shirt.name}</text>` : ''}
    </g>
  `;
}

function generateNecktaiSVG(necktie: ExtendedCostume, config: PreviewConfig): string {
  const color = getColorHex(necktie.attributes.color);
  const x = config.width / 2 - 8;
  const y = 50;

  return `
    <g class="necktie">
      <!-- Necktie knot -->
      <polygon points="${x},${y} ${x + 8},${y} ${x + 4},${y + 8}" fill="${color}" stroke="#333" stroke-width="1" />
      
      <!-- Necktie body -->
      <polygon points="${x + 2},${y + 8} ${x + 6},${y + 8} ${x + 5},${y + 50} ${x + 3},${y + 50}" fill="${color}" stroke="#333" stroke-width="1" />
      
      <!-- Necktie tip -->
      <polygon points="${x + 3},${y + 50} ${x + 5},${y + 50} ${x + 4},${y + 60}" fill="${darkenColor(color, 0.2)}" stroke="#333" stroke-width="1" />
      
      ${config.showLabels ? `<text x="${x + 4}" y="${y + 75}" class="item-label" font-size="10">${necktie.name}</text>` : ''}
    </g>
  `;
}

function generateBowTieSVG(bowTie: ExtendedCostume, config: PreviewConfig): string {
  const color = getColorHex(bowTie.attributes.color);
  const x = config.width / 2 - 15;
  const y = 45;

  return `
    <g class="bow-tie">
      <!-- Left wing -->
      <ellipse cx="${x + 5}" cy="${y}" rx="8" ry="6" fill="${color}" stroke="#333" stroke-width="1" />
      
      <!-- Center knot -->
      <circle cx="${x + 15}" cy="${y}" r="4" fill="${darkenColor(color, 0.3)}" stroke="#333" stroke-width="1" />
      
      <!-- Right wing -->
      <ellipse cx="${x + 25}" cy="${y}" rx="8" ry="6" fill="${color}" stroke="#333" stroke-width="1" />
      
      ${config.showLabels ? `<text x="${x + 15}" y="${y + 20}" class="item-label" font-size="10">${bowTie.name}</text>` : ''}
    </g>
  `;
}

function getColorHex(colorName: string): string {
  const colorMap: Record<string, string> = {
    '黒': '#1a1a1a',
    '紺': '#001f3f',
    '濃いグレー': '#555555',
    'グレー': '#999999',
    '茶色': '#8B4513',
    '白': '#ffffff',
    'オフホワイト': '#f5f5f0',
    '薄いブルー': '#87ceeb',
    'ピンク': '#ffc0cb',
    '赤': '#ff0000',
    'シルバー': '#c0c0c0',
    'その他': '#808080',
  };

  return colorMap[colorName] || '#808080';
}

function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent * 100);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, (num >> 8 & 0x00ff) - amt);
  const B = Math.max(0, (num & 0x0000ff) - amt);

  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

export function generatePreviewHTML(
  suit: ExtendedCostume | undefined,
  shirt: ExtendedCostume | undefined,
  necktie: ExtendedCostume | undefined,
  bowTie: ExtendedCostume | undefined,
  score: number = 0.85,
  recommendations: string[] = [],
  config: Partial<PreviewConfig> = {}
): string {
  const finalConfig = { ...DEFAULT_PREVIEW_CONFIG, ...config };
  const svg = generatePreviewSVG(suit, shirt, necktie, bowTie, finalConfig);

  const scoreColor = getScoreColor(score);
  const scoreLabel = getScoreLabel(score);

  const itemsList = [
    suit ? `<li>スーツ: ${suit.name}</li>` : '',
    shirt ? `<li>ワイシャツ: ${shirt.name}</li>` : '',
    necktie ? `<li>ネクタイ: ${necktie.name}</li>` : '',
    bowTie ? `<li>蝶ネクタイ: ${bowTie.name}</li>` : '',
  ]
    .filter((item) => item)
    .join('');

  const recommendationsHTML =
    recommendations.length > 0
      ? `
    <div style="background-color: #ecf0f1; padding: 15px; border-radius: 8px; margin: 15px 0;">
      <strong style="color: #2c3e50;">推奨事項：</strong>
      <ul style="color: #34495e; margin: 10px 0; padding-left: 20px;">
        ${recommendations.map((rec) => `<li>${rec}</li>`).join('')}
      </ul>
    </div>
  `
      : '';

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; max-width: 600px;">
      <h2 style="text-align: center; color: #2c3e50; margin-bottom: 20px;">コーディネート提案</h2>
      
      <div style="text-align: center; margin: 20px 0;">
        ${svg}
      </div>

      <div style="
        background-color: ${scoreColor};
        color: white;
        padding: 20px;
        border-radius: 8px;
        text-align: center;
        margin: 20px 0;
      ">
        <div style="font-size: 2em; font-weight: bold;">${Math.round(score * 100)}%</div>
        <div style="font-size: 1.2em;">${scoreLabel}</div>
      </div>

      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <strong style="color: #2c3e50;">選択アイテム：</strong>
        <ul style="color: #34495e; margin: 10px 0; padding-left: 20px;">
          ${itemsList}
        </ul>
      </div>

      ${recommendationsHTML}
    </div>
  `;
}

function getScoreColor(score: number): string {
  if (score >= 0.9) return '#27ae60'; // 緑
  if (score >= 0.7) return '#f39c12'; // オレンジ
  if (score >= 0.5) return '#e67e22'; // 濃いオレンジ
  return '#e74c3c'; // 赤
}

function getScoreLabel(score: number): string {
  if (score >= 0.9) return '完璧';
  if (score >= 0.8) return '非常に良い';
  if (score >= 0.7) return '良い';
  if (score >= 0.6) return 'まあまあ';
  if (score >= 0.5) return 'OK';
  return 'イマイチ';
}
