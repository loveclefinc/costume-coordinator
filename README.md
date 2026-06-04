# Costume Coordinator PWA

グループイベント向けの衣装コーディネート PWA です。

## 本番

- アプリ: https://loveclefinc.github.io/costume-coordinator/
- オンライン提出 API（Cloudflare Worker）: `https://costume-coordinator-events.<アカウント>.workers.dev`

## 使い方（オンライン提出）

1. **代表者**: イベント作成（代表者名・オンライン提出オン）→ 招待 URL と管理者トークンを保存 → 写真提出
2. **参加者**: 招待 URL から名前登録・写真アップロード
3. **代表者**: イベント詳細 → サーバーから取り込み → 最適化

アプリ内の **使い方** メニュー（`/guide`）に詳細があります。

## 機能

- 衣装の登録（色・トーン・柄・写真）
- イベントとテーマ設定
- 参加者ごとの希望を踏まえた衣装の最適化
- **オンライン提出**（写真を Cloudflare R2 に一時保存、代表者が取り込み）
- PWA（オフライン閲覧用 Service Worker）
- 任意: Google Drive / Dropbox 同期（衣装データのバックアップ）

オフライン JSON による参加者やり取りは **API 未設定時のみ** 表示されます（本番では通常不要）。

## デプロイ概要（秘密情報はリポジトリに含めない）

### GitHub Pages（`main` push で自動）

Repository / Environment `github-pages` の Variables:

| 変数名 | 内容 |
|--------|------|
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth（任意同期） |
| `VITE_DROPBOX_CLIENT_ID` | Dropbox OAuth（任意同期） |
| `VITE_EVENT_API_URL` | Worker の URL（例: `https://costume-coordinator-events.○○.workers.dev`、末尾スラッシュなし） |

### Cloudflare Worker

```bash
cd workers/event-api
npx wrangler deploy
```

D1 マイグレーション・R2 バケット作成などの詳細手順は **ローカルの `docs/`**（非公開）にあります。

## 開発

```bash
pnpm install
pnpm dev
pnpm build
pnpm test
```

ローカルでオンライン提出を試す場合は `.env` に `VITE_EVENT_API_URL` を設定してください。

## ライセンス

Private / All rights reserved（リポジトリ設定に従う）
