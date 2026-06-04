# オンラインイベント提出（Cloudflare）

複数参加者が**写真付き衣装**を提出するため、GitHub Pages PWA とは別に **Cloudflare Workers + D1 + R2** でイベント API を提供します。

## ゴール

- 参加者は**招待 URL**から非同期に写真をアップロード（同時接続不要）
- 代表者は期限までサーバー上の提出を**一括取り込み**し、既存の最適化エンジンで割り当て
- データは **イベント日翌日 / 作成から7・14日** のいずれか早い方で自動削除（cron）

## 構成

```
PWA (GitHub Pages)
  │  VITE_EVENT_API_URL
  ▼
Workers API (/api/*)
  ├── D1 … イベント・参加者・衣装メタ
  └── R2 … 画像バイナリ
```

## 認証

| 役割 | トークン | 用途 |
|------|----------|------|
| 招待 | `invite`（URL `?t=`） | イベント情報閲覧・参加登録 |
| 参加者 | `X-Participant-Token` | 衣装・写真の提出 |
| 管理者 | `admin`（クエリ or ヘッダ） | 全提出のスナップショット・画像閲覧 |

トークンは DB に SHA-256 ハッシュのみ保存。管理者トークンは**作成時に一度だけ**表示（localStorage に保存推奨）。

## 主要エンドポイント

| メソッド | パス | 説明 |
|----------|------|------|
| POST | `/api/events` | イベント作成 |
| GET | `/api/events/:id?invite=` | 公開情報 |
| GET | `/api/events/:id/snapshot?admin=` | 代表者用一覧 |
| POST | `/api/events/:id/join?invite=` | 参加者登録 |
| POST | `/api/events/:id/costumes` | 衣装メタ作成 |
| POST | `/api/events/:id/costumes/:cid/photos` | 画像アップロード |
| GET | `/api/media/:photoId?admin=` | 画像配信 |

## 期限計算

`shared/event-expiry.ts` の `computeExpiresAt` を Worker とテストで共有。

## フロント連携

| 画面 | 動作 |
|------|------|
| イベント作成 | 「オンライン提出」→ API 作成 → 招待 URL |
| `/join?e=&t=` | オンライン提出ページへリダイレクト |
| `/events/:id/participate` | 参加者の写真提出 |
| イベント詳細 | 招待 URL コピー・サーバー取り込み |

取り込み後、衣装 `image` には API の `viewUrl`（HTTPS）が入り、最適化・一覧で表示されます。

## デプロイ

[Cloudflare Event API デプロイ手順](./CLOUDFLARE_EVENT_API_DEPLOY.md)

## オフライン JSON

API 未設定時・障害時の予備。`docs/COLLABORATION.md` 参照。
