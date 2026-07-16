# Costume Coordinator PWA

グループイベント向けの衣装コーディネート PWA です。

## 本番

- アプリ: https://dress.l-clef.com/
- （旧）GitHub Pages: https://loveclefinc.github.io/costume-coordinator/
- オンライン提出 API（Cloudflare Worker）: `https://costume-coordinator-events.<アカウント>.workers.dev`

## 使い方（オンライン提出）

1. **代表者**: イベント作成（代表者名・オンライン提出オン）→ 招待 URL と管理者トークンを保存 → 写真提出
2. **参加者**: 招待 URL から名前登録・写真アップロード
3. **代表者**: イベント詳細 → サーバーから提出を取り込む（全員提出済みならシステムが自動で組み合わせを決定）

アプリ内の **使い方** メニュー（`/guide`）に詳細があります。

## 機能

- 衣装の登録（色・トーン・柄・写真）
- 所有衣装の検索・表示（色系統、柄、トーン、種類、タグなど）
- お気に入りコーデ（スーツ＋ワイシャツ＋ネクタイなど、主衣装と小物を最大3点の「完成した装い」として保存）
- 写真からの衣装情報入力（端末内Canvasで色・トーン・判定可能な柄を候補入力。外部AI API・従量課金なし）
- イベントとテーマ設定
- 参加者ごとの希望を踏まえた衣装の最適化（単品の主衣装または完成コーデを1候補として扱う）
- **オンライン提出**（候補衣装を Cloudflare R2 に一時保存、全員提出後に自動で組み合わせ決定）
- PWA（オフライン閲覧用 Service Worker）
- 任意: Google Drive / Dropbox 同期（衣装データのバックアップ）

オフライン JSON による参加者やり取りは **API 未設定時のみ** 表示されます（本番では通常不要）。

## OpenAI Build Week 2026

「Ensemble AI」として追加した機能、期間前から存在した機能との区別、GPT-5.6 Sol / LunaとCodexの役割、構成、テスト、デモ、プライバシー方針は [`BUILD_WEEK_2026.md`](./BUILD_WEEK_2026.md) に記録しています。

GPT-5.6 SolはPM・相談・製品／セキュリティ判断、GPT-5.6 Lunaは実装担当、Sol / Lunaは検証・レビューとして、このCodexセッションの開発工程で使用しました。Codexでリポジトリ監査、コード編集、テスト、ブラウザ確認、Git追跡を行っています。Build Weekでは、写真入力の改善に加え、所有衣装からお気に入りコーデを作り、構成品を保ったまま既存の決定的最適化へ渡す機能を追加しました。

公開アプリはOpenAI APIやAPIキーを使用しません。写真解析は端末内Canvasで主色・副色・トーン・保守的な柄候補を入力し、衣装種類やシルエットは利用者が確認・修正してから保存します。最終的なグループ割り当てと選定理由は既存の決定的最適化エンジンが生成します。

## デプロイ概要（秘密情報はリポジトリに含めない）

### GitHub Pages（`main` push で自動）

Repository / Environment `github-pages` の Variables:

| 変数名 | 内容 |
|--------|------|
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth（任意同期） |
| `VITE_DROPBOX_CLIENT_ID` | Dropbox OAuth（任意同期） |
| `VITE_EVENT_API_URL` | Worker の URL（例: `https://costume-coordinator-events.○○.workers.dev`、末尾スラッシュなし） |

### Cloudflare Worker

既存D1へBuild Weekの完成コーデ対応を入れる場合は、**D1マイグレーション → Worker → PWA** の順に更新します。新規D1は`schema.sql`を使用し、既存D1には追加マイグレーションを1回だけ適用します。

```bash
cd workers/event-api
pnpm install

# ローカルD1（既存DBの場合）
pnpm exec wrangler d1 execute costume-events --local \
  --file=./migrations/20260717_add_outfit_components.sql

# 本番D1（既存DBの場合。内容と対象DBを確認してから1回だけ実行）
pnpm exec wrangler d1 execute costume-events --remote \
  --file=./migrations/20260717_add_outfit_components.sql

pnpm exec tsc --noEmit
pnpm exec wrangler deploy
```

このマイグレーションが追加するのは`costumes.components_json`だけです。既存衣装は既定値`[]`の単品候補としてそのまま読めます。未監査の既存写真行を壊さないため、今回の移行では写真スロットの一意インデックスやデータ削除を行いません。詳細なロールアウト順と既知の制約は[`BUILD_WEEK_2026.md`](./BUILD_WEEK_2026.md)にあります。

Worker更新後、`GET /api/health`の`apiVersion`と`uploadLimits.maxOutfitComponents`を確認してからPWAを公開します。旧Workerでも単品提出は継続でき、完成コーデ提出は対応Workerへ更新するまで明示的に停止します。

代表者向け API（管理者トークン）: `DELETE /api/events/:id`、`POST /api/events/:id/register-host`（旧イベントの代表者サーバー登録）

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
