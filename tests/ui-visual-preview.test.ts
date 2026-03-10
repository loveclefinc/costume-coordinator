/**
 * Tests for UI Components and Visual Preview
 */

import { describe, it, expect } from 'vitest';
import {
  ITEM_TYPE_OPTIONS,
  ITEM_TYPE_ATTRIBUTES,
  getItemTypeLabel,
  getItemTypeIcon,
  getAttributeFields,
  validateItemAttributes,
  formatCoordinateScore,
  getScoreColor,
  getScoreLabel,
} from '../src/utils/ui-components';
import { ItemType } from '../src/utils/costume-types';
import {
  generatePreviewSVG,
  generatePreviewHTML,
  DEFAULT_PREVIEW_CONFIG,
} from '../src/utils/visual-preview';

describe('UI Components', () => {
  describe('ITEM_TYPE_OPTIONS', () => {
    it('should have 4 item types', () => {
      expect(ITEM_TYPE_OPTIONS).toHaveLength(4);
    });

    it('should have correct item types', () => {
      const types = ITEM_TYPE_OPTIONS.map((opt) => opt.type);
      expect(types).toContain(ItemType.SUIT);
      expect(types).toContain(ItemType.NECKTIE);
      expect(types).toContain(ItemType.BOW_TIE);
      expect(types).toContain(ItemType.DRESS_SHIRT);
    });

    it('should have icons for all item types', () => {
      ITEM_TYPE_OPTIONS.forEach((opt) => {
        expect(opt.icon).toBeTruthy();
        expect(opt.icon.length).toBeGreaterThan(0);
      });
    });
  });

  describe('ITEM_TYPE_ATTRIBUTES', () => {
    it('should have attributes for all item types', () => {
      expect(ITEM_TYPE_ATTRIBUTES[ItemType.SUIT]).toBeDefined();
      expect(ITEM_TYPE_ATTRIBUTES[ItemType.NECKTIE]).toBeDefined();
      expect(ITEM_TYPE_ATTRIBUTES[ItemType.BOW_TIE]).toBeDefined();
      expect(ITEM_TYPE_ATTRIBUTES[ItemType.DRESS_SHIRT]).toBeDefined();
    });

    it('should have color attribute for all types', () => {
      Object.values(ITEM_TYPE_ATTRIBUTES).forEach((attrs) => {
        const colorAttr = attrs.find((a) => a.key === 'color');
        expect(colorAttr).toBeDefined();
        expect(colorAttr?.required).toBe(true);
      });
    });
  });

  describe('getItemTypeLabel', () => {
    it('should return correct label for suit', () => {
      expect(getItemTypeLabel(ItemType.SUIT)).toBe('スーツ');
    });

    it('should return correct label for necktie', () => {
      expect(getItemTypeLabel(ItemType.NECKTIE)).toBe('ネクタイ');
    });

    it('should return correct label for bow tie', () => {
      expect(getItemTypeLabel(ItemType.BOW_TIE)).toBe('蝶ネクタイ');
    });

    it('should return correct label for dress shirt', () => {
      expect(getItemTypeLabel(ItemType.DRESS_SHIRT)).toBe('ワイシャツ');
    });
  });

  describe('getItemTypeIcon', () => {
    it('should return icon for each item type', () => {
      expect(getItemTypeIcon(ItemType.SUIT)).toBe('👔');
      expect(getItemTypeIcon(ItemType.NECKTIE)).toBe('🎀');
      expect(getItemTypeIcon(ItemType.BOW_TIE)).toBe('🦋');
      expect(getItemTypeIcon(ItemType.DRESS_SHIRT)).toBe('👕');
    });
  });

  describe('getAttributeFields', () => {
    it('should return attributes for suit', () => {
      const fields = getAttributeFields(ItemType.SUIT);
      expect(fields.length).toBeGreaterThan(0);
      expect(fields.some((f) => f.key === 'color')).toBe(true);
      expect(fields.some((f) => f.key === 'material')).toBe(true);
    });

    it('should return attributes for necktie', () => {
      const fields = getAttributeFields(ItemType.NECKTIE);
      expect(fields.length).toBeGreaterThan(0);
      expect(fields.some((f) => f.key === 'color')).toBe(true);
      expect(fields.some((f) => f.key === 'pattern')).toBe(true);
    });
  });

  describe('validateItemAttributes', () => {
    it('should validate required attributes', () => {
      const attributes = { color: '黒', material: 'ウール', pattern: '無地', fit: 'レギュラー', season: 'オールシーズン' };
      const result = validateItemAttributes(ItemType.SUIT, attributes);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when required attributes are missing', () => {
      const attributes = { color: '黒' };
      const result = validateItemAttributes(ItemType.SUIT, attributes);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Score formatting', () => {
    it('should format coordinate score correctly', () => {
      expect(formatCoordinateScore(0.85)).toBe('85%');
      expect(formatCoordinateScore(0.5)).toBe('50%');
      expect(formatCoordinateScore(1)).toBe('100%');
    });

    it('should return correct score color', () => {
      expect(getScoreColor(0.95)).toBe('#27ae60'); // 緑
      expect(getScoreColor(0.75)).toBe('#f39c12'); // オレンジ
      expect(getScoreColor(0.55)).toBe('#e67e22'); // 濃いオレンジ
      expect(getScoreColor(0.3)).toBe('#e74c3c'); // 赤
    });

    it('should return correct score label', () => {
      expect(getScoreLabel(0.95)).toBe('完璧');
      expect(getScoreLabel(0.85)).toBe('非常に良い');
      expect(getScoreLabel(0.75)).toBe('良い');
      expect(getScoreLabel(0.65)).toBe('まあまあ');
      expect(getScoreLabel(0.55)).toBe('OK');
      expect(getScoreLabel(0.3)).toBe('イマイチ');
    });
  });
});

describe('Visual Preview', () => {
  describe('DEFAULT_PREVIEW_CONFIG', () => {
    it('should have valid default config', () => {
      expect(DEFAULT_PREVIEW_CONFIG.width).toBe(300);
      expect(DEFAULT_PREVIEW_CONFIG.height).toBe(400);
      expect(DEFAULT_PREVIEW_CONFIG.backgroundColor).toBe('#f5f5f5');
      expect(DEFAULT_PREVIEW_CONFIG.showLabels).toBe(true);
      expect(DEFAULT_PREVIEW_CONFIG.showScore).toBe(true);
      expect(DEFAULT_PREVIEW_CONFIG.animationDuration).toBe(300);
    });
  });

  describe('generatePreviewSVG', () => {
    it('should generate SVG without items', () => {
      const svg = generatePreviewSVG(undefined, undefined, undefined, undefined);
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      expect(svg).toContain('#f5f5f5');
    });

    it('should include custom config in SVG', () => {
      const config = { width: 400, height: 500, backgroundColor: '#ffffff' };
      const svg = generatePreviewSVG(undefined, undefined, undefined, undefined, config);
      expect(svg).toContain('width="400"');
      expect(svg).toContain('height="500"');
      expect(svg).toContain('#ffffff');
    });
  });

  describe('generatePreviewHTML', () => {
    it('should generate HTML with score', () => {
      const html = generatePreviewHTML(undefined, undefined, undefined, undefined, 0.85);
      expect(html).toContain('コーディネート提案');
      expect(html).toContain('85%');
      expect(html).toContain('非常に良い');
    });

    it('should include recommendations when provided', () => {
      const recommendations = ['ネクタイの色を濃くしましょう', 'ワイシャツは白がおすすめ'];
      const html = generatePreviewHTML(undefined, undefined, undefined, undefined, 0.75, recommendations);
      expect(html).toContain('推奨事項');
      recommendations.forEach((rec) => {
        expect(html).toContain(rec);
      });
    });

    it('should show correct score color for different scores', () => {
      const html1 = generatePreviewHTML(undefined, undefined, undefined, undefined, 0.95);
      expect(html1).toContain('#27ae60'); // 緑

      const html2 = generatePreviewHTML(undefined, undefined, undefined, undefined, 0.5);
      expect(html2).toContain('#e67e22'); // 濃いオレンジ
    });

    it('should include SVG preview', () => {
      const html = generatePreviewHTML(undefined, undefined, undefined, undefined, 0.85);
      expect(html).toContain('<svg');
      expect(html).toContain('</svg>');
    });
  });
});
