# GitHub Pages 公開手順

## 前提

- リポジトリ: `loveclefinc/costume-coordinator`
- 公開 URL: `https://loveclefinc.github.io/costume-coordinator/`

## 1. OAuth 用 Client ID の設定（ビルド時）

次の **2 つ**を、名前**完全一致**で登録します。

| Name | 値の例 |
|------|--------|
| `VITE_GOOGLE_CLIENT_ID` | `123456789-xxxx.apps.googleusercontent.com` |
| `VITE_DROPBOX_CLIENT_ID` | Dropbox App Console の App key |

### 登録場所（どちらか一方で可）

#### A. Repository（推奨・わかりやすい）

`Settings` → `Secrets and variables` → `Actions` → **Repository variables** または **Repository secrets**

#### B. Environment `github-pages`

`Settings` → `Environments` → `github-pages` → **Environment variables** または **Environment secrets**

Pages 設定画面から追加した場合はこちらに入っていることが多いです。workflow は **build ジョブでも `environment: github-pages` を指定**しているため、どちらの場所でも読み取れます。

### よくある誤り

| 誤り | 結果 |
|------|------|
| 名前が `GOOGLE_CLIENT_ID`（`VITE_` なし） | ビルドに渡らない |
| **Dependabot** / **Codespaces** タブにだけ登録 | Actions から見えない |
| 値の前後に余分なスペースや改行 | 認証エラー |
| Variable を追加したが **再デプロイしていない** | 古い JS のまま |

**Variable を変更したら**、Actions の「Deploy to GitHub Pages」を再実行（または main へ push）。

### ビルドログでの確認

成功時、Verify ステップに次のような行が出ます（値は出ません）:

```
VITE_GOOGLE_CLIENT_ID ← Repository/Environment Variables
VITE_DROPBOX_CLIENT_ID ← Repository/Environment Variables
OAuth client IDs are present.
```

`NOT FOUND` の場合は名前・登録場所を見直してください。

## 2. Pages 有効化

1. **Settings** → **Pages**
2. Source: **GitHub Actions**
3. `deploy.yml` が main へ push で自動デプロイ

## 3. ローカルプレビュー

```bash
cp .env.example .env
# .env に Client ID を記入
pnpm install
pnpm dev
```

## 4. OAuth リダイレクト URI（登録必須）

| プロバイダ | URI |
|------------|-----|
| Google | `https://loveclefinc.github.io/costume-coordinator/oauth/google/callback` |
| Dropbox | `https://loveclefinc.github.io/costume-coordinator/oauth/dropbox/callback` |

ローカル: `http://localhost:3000/costume-coordinator/oauth/...` も追加。
