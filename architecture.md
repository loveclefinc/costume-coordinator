# 衣装管理・最適化システム 技術選定と全体アーキテクチャ

## 1. 技術スタックの選定理由

### 1.1 フロントエンド（モバイルアプリ）

**選定技術: React Native (Expo SDK 54) + TypeScript**

**理由:**
- **クロスプラットフォーム対応**: iOS・Androidの両方に対応し、単一コードベースで開発可能
- **ローカルストレージ**: AsyncStorageによる端末内データ管理が容易
- **画像処理**: expo-image-pickerで撮影・選択、expo-image-manipulatorでサムネイル生成・リサイズが可能
- **ネイティブ機能**: カメラ、ファイルシステム、ハプティックフィードバックなど必要な機能が揃っている
- **開発効率**: TypeScriptによる型安全性、Expo Routerによるファイルベースルーティング
- **パフォーマンス**: React Native Reanimatedによるスムーズなアニメーション

### 1.2 バックエンド（共有・最適化サーバ）

**選定技術: Node.js + tRPC + PostgreSQL**

**理由:**
- **型安全なAPI**: tRPCによりフロントエンドとバックエンド間で型を共有、開発効率とバグ削減
- **リレーショナルDB**: PostgreSQLでイベント・衣装メタデータ・共有URLの管理が容易
- **一時データ管理**: イベント終了後の自動削除をCRONジョブで実装可能
- **スケーラビリティ**: 6〜10人規模の最適化処理に十分対応可能
- **既存インフラ**: プロジェクトテンプレートに含まれており、即座に利用可能

### 1.3 画像解析

**選定技術: クライアント側でのヒューリスティック解析 + サーバ側補助**

**理由:**
- **プライバシー重視**: 原画像を端末外に送信しない設計
- **リアルタイム処理**: 撮影直後に色・柄の推定が可能
- **実装方法**:
  - クライアント: expo-image-manipulatorでリサイズ後、Canvas APIまたはreact-native-color-thief等で主要色抽出
  - 色相(Hue)から暖色/寒色/中間を判定
  - 彩度・明度からトーン（パステル/ビビッド/ダーク）を判定
  - 柄検出は簡易的にエッジ検出または手動タグ付けで対応（MVP段階）

### 1.4 最適化アルゴリズム

**選定技術: 制約充足問題(CSP)アプローチ + スコアリング**

**理由:**
- **問題規模**: 6〜10人 × 最大30衣装 = 最大300通りの組み合わせ
- **計算量**: 全探索は現実的でないため、貪欲法 + バックトラッキングで複数案を生成
- **実装方法**:
  - 各人の希望順位でソート
  - 条件（色系統、トーン、柄、重複回避、使用履歴）を制約として評価
  - スコアリング関数で最適解を複数案（5案程度）選出
  - Node.js上で実行、処理時間は1秒以内を目標

---

## 2. 全体アーキテクチャ

### 2.1 システム構成図（概念）

```
[ユーザーA端末]                [ユーザーB端末]                [ユーザーC端末]
    ↓                              ↓                              ↓
  衣装データ                     衣装データ                     衣装データ
  (ローカルDB)                   (ローカルDB)                   (ローカルDB)
    ↓                              ↓                              ↓
    └──────────────────────────────┴──────────────────────────────┘
                                   ↓
                          [共有サーバ (tRPC API)]
                                   ↓
                          [PostgreSQL Database]
                          - イベント情報
                          - 衣装メタデータ（スナップショット）
                          - 共有URL（招待リンク）
                          - 最適化結果キャッシュ
```

### 2.2 データフロー

#### 2.2.1 衣装登録フロー
1. ユーザーが端末で衣装を撮影または画像選択
2. クライアント側で画像をリサイズ（512px程度）
3. 色・柄を自動推定（ヒューリスティック）
4. ユーザーが推定結果を確認・修正
5. 衣装データ（画像 + メタデータ）を端末のAsyncStorageに保存

#### 2.2.2 イベント作成・共有フロー
1. ユーザーがイベントを作成（名前、日付、条件設定）
2. サーバにイベント情報を送信
3. サーバが招待URL（UUID）を生成
4. ユーザーが招待URLを共演者に共有
5. 共演者が招待URLからイベントに参加

#### 2.2.3 衣装データ共有フロー
1. 参加者が自分の衣装候補を選択（第1〜第5希望）
2. 衣装メタデータ（色、柄、トーン、サムネイル）をサーバに送信
3. サーバがイベント単位でスナップショットとして保存
4. 原画像は端末に残り、サーバには送信しない

#### 2.2.4 最適化実行フロー
1. イベント主催者または参加者が最適化を実行
2. サーバが全参加者の衣装メタデータを取得
3. 最適化アルゴリズムを実行（制約充足 + スコアリング）
4. 複数案（5案程度）を生成し、クライアントに返却
5. ユーザーが最適案を選択・確定

#### 2.2.5 データ削除フロー
1. イベント終了日から14日後、CRONジョブが実行
2. 該当イベントの衣装メタデータ・スナップショットを削除
3. 招待URLを失効

---

## 3. ローカルDBスキーマ（AsyncStorage）

クライアント側（各ユーザー端末）のデータ構造:

### 3.1 衣装データ (costumes)

```typescript
interface Costume {
  id: string;                    // UUID
  imageUri: string;              // ローカルファイルパス
  thumbnailUri: string;          // サムネイル（512px）
  name: string;                  // 衣装名（任意）
  colors: {
    primary: string;             // HEX色コード (#RRGGBB)
    secondary?: string;          // 副色（任意）
  };
  colorCategory: 'warm' | 'cool' | 'neutral';  // 暖色/寒色/中間
  tone: 'pastel' | 'vivid' | 'dark' | 'neutral';  // トーン
  pattern: 'solid' | 'floral' | 'stripe' | 'dot' | 'other';  // 柄
  tags: string[];                // 手動タグ（花柄、レース等）
  usageHistory: {
    eventId: string;
    date: string;                // ISO 8601形式
  }[];
  createdAt: string;
  updatedAt: string;
}
```

### 3.2 イベント参加情報 (eventParticipations)

```typescript
interface EventParticipation {
  eventId: string;               // サーバ側イベントID
  eventName: string;
  eventDate: string;
  inviteUrl: string;
  myPreferences: {
    costumeId: string;           // ローカル衣装ID
    priority: 1 | 2 | 3 | 4 | 5; // 希望順位
  }[];
  status: 'pending' | 'submitted' | 'confirmed';
  createdAt: string;
}
```

---

## 4. サーバ側データ構造（PostgreSQL）

### 4.1 テーブル設計

#### 4.1.1 events テーブル

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  event_date DATE NOT NULL,
  created_by_user_id UUID REFERENCES users(id),
  invite_code VARCHAR(64) UNIQUE NOT NULL,  -- 招待URL用
  conditions JSONB NOT NULL,  -- イベント条件（後述）
  status VARCHAR(50) DEFAULT 'active',
  expires_at TIMESTAMP NOT NULL,  -- イベント終了日 + 14日
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_events_invite_code ON events(invite_code);
CREATE INDEX idx_events_expires_at ON events(expires_at);
```

**conditions JSONB構造:**
```typescript
interface EventConditions {
  colorCategory?: 'warm' | 'cool' | 'neutral';  // 指定色系統
  tone?: 'pastel' | 'vivid' | 'dark' | 'neutral';  // 指定トーン
  patternRules?: {
    allowFloral: boolean;      // 花柄許可
    floralMaxCount?: number;   // 花柄上限人数
  };
  avoidSimilarColors: boolean;  // 同系色回避
  recentUsageExcludeDays: number;  // 直近使用除外日数（デフォルト30）
}
```

#### 4.1.2 event_participants テーブル

```sql
CREATE TABLE event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  display_name VARCHAR(255) NOT NULL,  -- 表示名
  joined_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_event_participants_event_id ON event_participants(event_id);
```

#### 4.1.3 costume_snapshots テーブル

```sql
CREATE TABLE costume_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES event_participants(id) ON DELETE CASCADE,
  costume_data JSONB NOT NULL,  -- 衣装メタデータ（後述）
  priority INTEGER NOT NULL,  -- 希望順位 (1-5)
  thumbnail_url TEXT,  -- サムネイル画像URL（S3等）
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_costume_snapshots_event_id ON costume_snapshots(event_id);
CREATE INDEX idx_costume_snapshots_participant_id ON costume_snapshots(participant_id);
```

**costume_data JSONB構造:**
```typescript
interface CostumeSnapshot {
  name: string;
  colors: {
    primary: string;
    secondary?: string;
  };
  colorCategory: 'warm' | 'cool' | 'neutral';
  tone: 'pastel' | 'vivid' | 'dark' | 'neutral';
  pattern: 'solid' | 'floral' | 'stripe' | 'dot' | 'other';
  tags: string[];
  lastUsedDate?: string;  // 直近使用日
}
```

#### 4.1.4 optimization_results テーブル（キャッシュ用）

```sql
CREATE TABLE optimization_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  result_data JSONB NOT NULL,  -- 最適化結果（複数案）
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_optimization_results_event_id ON optimization_results(event_id);
```

**result_data JSONB構造:**
```typescript
interface OptimizationResult {
  proposals: {
    id: string;
    score: number;  // スコア（高いほど最適）
    assignments: {
      participantId: string;
      participantName: string;
      costumeSnapshotId: string;
      costumeName: string;
      priority: number;  // 使用した希望順位
      thumbnailUrl: string;
    }[];
    violations: string[];  // 制約違反（あれば）
  }[];
  generatedAt: string;
}
```

---

## 5. 共有用スナップショット仕様

### 5.1 招待URL形式

```
https://app.costume-coordinator.com/invite/{invite_code}
```

- `invite_code`: 64文字のランダム文字列（UUID + タイムスタンプのハッシュ）
- 有効期限: イベント終了日 + 14日
- アクセス権限: URLを知っている全員が閲覧・提案実行可能（ログイン不要も可）

### 5.2 スナップショット送信フロー

1. ユーザーがイベントに参加
2. 自分の衣装候補（最大5着）を選択
3. 各衣装のメタデータ + サムネイル（512px）をサーバに送信
4. サーバが`costume_snapshots`テーブルに保存
5. 原画像は端末に残り、サーバには送信しない

### 5.3 データ削除ポリシー

- イベント終了日から14日後、CRONジョブが実行
- 該当イベントの`events`, `event_participants`, `costume_snapshots`, `optimization_results`を削除
- カスケード削除により関連データも自動削除

---

## 6. 最適化ロジック

### 6.1 制約条件

最適化時に考慮する制約:

1. **希望順位**: 各参加者の第1〜第5希望を優先
2. **色系統**: イベント条件で指定された色系統（暖色/寒色/中間）に合致
3. **トーン**: 指定されたトーン（パステル等）に合致
4. **柄ルール**: 花柄の上限人数、柄の重複回避
5. **同系色回避**: 色相が近い衣装の同時使用を避ける（色相差30度以内を回避）
6. **使用履歴**: 直近N日以内に使用した衣装を除外

### 6.2 スコアリング関数

各割り当て案に対してスコアを計算:

```typescript
function calculateScore(assignment: Assignment): number {
  let score = 0;
  
  // 希望順位スコア（第1希望: +50, 第2: +40, ..., 第5: +10）
  for (const a of assignment.assignments) {
    score += (60 - a.priority * 10);
  }
  
  // 条件一致スコア（各条件満たすごとに +20）
  score += countConditionMatches(assignment) * 20;
  
  // 色重複ペナルティ（同系色ペアごとに -30）
  score -= countSimilarColorPairs(assignment) * 30;
  
  // 柄重複ペナルティ（同じ柄が3人以上で -20）
  score -= countPatternOverlaps(assignment) * 20;
  
  // 使用履歴ペナルティ（直近使用衣装ごとに -40）
  score -= countRecentlyUsed(assignment) * 40;
  
  return score;
}
```

### 6.3 アルゴリズム疑似コード

```typescript
function optimizeCostumes(
  participants: Participant[],
  conditions: EventConditions
): OptimizationProposal[] {
  const proposals: OptimizationProposal[] = [];
  
  // 各参加者の候補を希望順位でソート
  for (const p of participants) {
    p.costumes.sort((a, b) => a.priority - b.priority);
  }
  
  // 貪欲法で初期解を生成
  const initialAssignment = greedyAssign(participants, conditions);
  proposals.push(initialAssignment);
  
  // バックトラッキングで代替案を生成（最大5案）
  for (let i = 0; i < 4; i++) {
    const alternative = backtrack(participants, conditions, proposals);
    if (alternative) {
      proposals.push(alternative);
    }
  }
  
  // スコアでソート
  proposals.sort((a, b) => b.score - a.score);
  
  return proposals.slice(0, 5);
}

function greedyAssign(
  participants: Participant[],
  conditions: EventConditions
): Assignment {
  const assignment: Assignment = { assignments: [], score: 0, violations: [] };
  const usedColors: string[] = [];
  
  for (const p of participants) {
    for (const costume of p.costumes) {
      // 制約チェック
      if (isRecentlyUsed(costume, conditions.recentUsageExcludeDays)) continue;
      if (!matchesConditions(costume, conditions)) continue;
      if (isSimilarColor(costume.colors.primary, usedColors)) continue;
      
      // 割り当て
      assignment.assignments.push({
        participantId: p.id,
        participantName: p.name,
        costumeSnapshotId: costume.id,
        costumeName: costume.name,
        priority: costume.priority,
        thumbnailUrl: costume.thumbnailUrl,
      });
      usedColors.push(costume.colors.primary);
      break;
    }
  }
  
  assignment.score = calculateScore(assignment);
  return assignment;
}

function backtrack(
  participants: Participant[],
  conditions: EventConditions,
  existingProposals: OptimizationProposal[]
): Assignment | null {
  // 既存案と異なる割り当てを探索
  // （実装詳細は省略）
  return null;
}
```

---

## 7. 画像解析（色・柄推定）の実装方針

### 7.1 色抽出

**クライアント側実装（React Native）:**

```typescript
import * as ImageManipulator from 'expo-image-manipulator';
import { getColors } from 'react-native-image-colors';

async function analyzeImage(imageUri: string): Promise<ColorAnalysis> {
  // 1. 画像をリサイズ（処理速度向上）
  const resized = await ImageManipulator.manipulateAsync(
    imageUri,
    [{ resize: { width: 300 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );
  
  // 2. 主要色を抽出
  const colors = await getColors(resized.uri, {
    fallback: '#FFFFFF',
    cache: true,
    key: imageUri,
  });
  
  const primaryColor = colors.dominant || '#FFFFFF';
  
  // 3. HSV変換して色相・彩度・明度を取得
  const hsv = hexToHSV(primaryColor);
  
  // 4. 色系統判定
  const colorCategory = categorizeColor(hsv.h);
  
  // 5. トーン判定
  const tone = categorizeTone(hsv.s, hsv.v);
  
  return {
    primary: primaryColor,
    colorCategory,
    tone,
  };
}

function categorizeColor(hue: number): 'warm' | 'cool' | 'neutral' {
  // 色相環: 0°=赤, 60°=黄, 120°=緑, 180°=シアン, 240°=青, 300°=マゼンタ
  if (hue >= 0 && hue < 60) return 'warm';      // 赤〜黄
  if (hue >= 60 && hue < 150) return 'neutral'; // 黄〜緑
  if (hue >= 150 && hue < 270) return 'cool';   // 緑〜青
  return 'warm';                                 // マゼンタ〜赤
}

function categorizeTone(saturation: number, value: number): Tone {
  if (saturation < 0.3 && value > 0.7) return 'pastel';
  if (saturation > 0.6 && value > 0.6) return 'vivid';
  if (value < 0.4) return 'dark';
  return 'neutral';
}
```

### 7.2 柄検出

**MVP段階: 手動タグ付け + 簡易エッジ検出**

```typescript
async function detectPattern(imageUri: string): Promise<Pattern> {
  // 簡易的なエッジ検出（複雑度判定）
  const resized = await ImageManipulator.manipulateAsync(
    imageUri,
    [{ resize: { width: 200 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
  );
  
  // Canvas APIでピクセルデータ取得（Web）またはネイティブモジュール（モバイル）
  const complexity = calculateImageComplexity(resized.uri);
  
  if (complexity < 0.2) return 'solid';  // 無地
  if (complexity > 0.6) return 'other';  // 複雑な柄
  
  // 中間的な複雑度の場合は手動タグ付けを促す
  return 'other';
}

function calculateImageComplexity(imageData: ImageData): number {
  // 隣接ピクセル間の色差の平均を計算
  // （実装詳細は省略）
  return 0.5;
}
```

**将来拡張: ML Kit / TensorFlow Lite**

- 花柄・ストライプ・ドット等の柄を機械学習で分類
- クライアント側でオンデバイス推論（プライバシー保護）

---

## 8. MVPで割り切る点／将来拡張点

### 8.1 MVP段階で割り切る点

1. **柄検出精度**: 手動タグ付けを主とし、自動検出は補助的
2. **最適化アルゴリズム**: 完全な最適解ではなく、実用的な準最適解を提供
3. **ユーザー認証**: 招待URLベースの簡易認証（ログイン不要も可）
4. **画像ストレージ**: サムネイルのみサーバ保存、原画像は端末のみ
5. **通知機能**: イベント更新・最適化完了の通知は未実装
6. **多言語対応**: 日本語のみ
7. **アクセシビリティ**: 基本的な対応のみ

### 8.2 将来拡張点

1. **高度な柄検出**: ML Kit / TensorFlow Liteによる機械学習ベースの柄分類
2. **より高度な最適化**: 遺伝的アルゴリズム、シミュレーテッドアニーリング等
3. **リアルタイム共有**: WebSocketによるリアルタイム更新
4. **SNS連携**: 確定した衣装組み合わせをSNSに投稿
5. **衣装レンタル連携**: レンタル衣装データベースとの統合
6. **AR試着**: ARKitを使った仮想試着機能
7. **スタイリング提案**: AIによる衣装コーディネート提案
8. **イベント履歴分析**: 過去のイベントデータから傾向分析

---

## 9. 実装優先順位

### Phase 1: コア機能（MVP）
- [ ] 衣装登録（撮影・選択・色抽出）
- [ ] ローカルストレージ（AsyncStorage）
- [ ] イベント作成・招待URL生成
- [ ] 衣装メタデータ共有
- [ ] 基本的な最適化アルゴリズム
- [ ] 最適化結果表示

### Phase 2: UX改善
- [ ] 衣装一覧・検索・フィルタ
- [ ] 使用履歴管理
- [ ] 希望順位設定UI
- [ ] 最適化結果の詳細表示（スコア、制約違反）
- [ ] ダークモード対応

### Phase 3: 高度な機能
- [ ] 柄検出の精度向上（ML）
- [ ] リアルタイム共有
- [ ] プッシュ通知
- [ ] SNS連携
- [ ] 多言語対応

---

## 10. パフォーマンス目標

- **衣装登録**: 撮影から色抽出まで3秒以内
- **最適化処理**: 10人 × 30衣装の場合でも1秒以内
- **画面遷移**: 全画面で60fps維持
- **アプリサイズ**: 初回ダウンロード50MB以下
- **メモリ使用量**: 200MB以下（衣装100着登録時）

---

## 11. セキュリティ・プライバシー

- **原画像保護**: 原画像は端末外に送信しない
- **サムネイル**: 512px程度に縮小してサーバ送信
- **招待URL**: ランダム生成、推測不可能
- **データ削除**: イベント終了後14日で自動削除
- **HTTPS通信**: 全API通信をHTTPS化
- **入力検証**: サーバ側で全入力をバリデーション

---

## まとめ

本アーキテクチャは、**プライバシー保護**と**実用性**を両立させた設計となっています。クライアント側での画像処理、サーバ側での最適化処理を適切に分離し、6〜10人規模のイベントに十分対応可能なシステムを構築します。MVP段階では柄検出精度や最適化アルゴリズムを割り切りつつ、将来的な拡張性も考慮した設計としています。
