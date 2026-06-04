# Cloudflare Event API のデプロイ

## 1. 前提

- [Cloudflare](https://dash.cloudflare.com/) アカウント（無料枠可）
- Node.js 22+
- `wrangler login`

## 2. D1 と R2 の作成

```bash
cd workers/event-api
pnpm install   # または npm install
wrangler d1 create costume-events
```

表示された `database_id` を `wrangler.toml` の `database_id` に貼り付けます。

```bash
wrangler r2 bucket create costume-event-photos
```

## 3. マイグレーション

```bash
pnpm run db:migrate:remote
# ローカル開発時
pnpm run db:migrate:local
```

## 4. Worker のデプロイ

```bash
pnpm run deploy
```

デプロイ後の URL（例: `https://costume-coordinator-events.<account>.workers.dev`）を控えます。

## 5. GitHub Pages に API URL を渡す

リポジトリ → Settings → Secrets and variables → Actions → **Variables**（または Environment `github-pages`）:

| 名前 | 値 |
|------|-----|
| `VITE_EVENT_API_URL` | Worker の URL（末尾スラッシュなし） |

`main` に push すると Pages ビルドに埋め込まれます。

ローカル開発: プロジェクトルートに `.env`:

```
VITE_EVENT_API_URL=https://costume-coordinator-events.xxx.workers.dev
```

## 6. CORS

`wrangler.toml` の `ALLOWED_ORIGINS` に本番 Pages のオリジンを含めてください。

```
https://loveclefinc.github.io,http://localhost:3000,http://localhost:5173
```

## 7. 自動デプロイ（任意）

GitHub Actions の `deploy-event-api.yml` を使う場合、Secrets に以下を登録:

| Secret | 説明 |
|--------|------|
| `CLOUDFLARE_API_TOKEN` | Workers デプロイ権限 |
| `CLOUDFLARE_ACCOUNT_ID` | アカウント ID |

## 8. 動作確認

```bash
curl -s "https://YOUR-WORKER.workers.dev/api/health"
# {"ok":true}
```

アプリでイベント作成 → 「オンライン提出」オン → 招待 URL を別端末で開き、写真提出 → 代表者端末で「サーバーから取り込む」。

## 9. コスト目安

小規模イベント（数十人・数 MB/人）なら **無料枠内** が想定です。期限切れ cron で R2 を空に保つことが重要です。
