# GitHub Pages 公開手順

## 前提

- リポジトリ: `loveclefinc/costume-coordinator`
- 公開 URL: `https://loveclefinc.github.io/costume-coordinator/`

## 1. OAuth 用 Client ID の設定（ビルド時）

GitHub リポジトリ → **Settings** → **Secrets and variables** → **Actions** → **Variables**:

| Name | 例 |
|------|-----|
| `VITE_GOOGLE_CLIENT_ID` | Google Cloud の Client ID |
| `VITE_DROPBOX_CLIENT_ID` | Dropbox App key |

※ Secret ではなく Variable で可（公開 Client ID のため）。漏洩リスクを下げるなら Secret でも可。

## 2. workflow の環境変数

`.github/workflows/deploy.yml` の Build ステップに以下を追加:

```yaml
- name: Build
  env:
    VITE_GOOGLE_CLIENT_ID: ${{ vars.VITE_GOOGLE_CLIENT_ID }}
    VITE_DROPBOX_CLIENT_ID: ${{ vars.VITE_DROPBOX_CLIENT_ID }}
  run: pnpm build
```

## 3. Pages 有効化

1. **Settings** → **Pages**
2. Source: **GitHub Actions**
3. `deploy.yml` が main へ push で自動デプロイ

## 4. ローカルプレビュー

```bash
cp .env.example .env
# .env に Client ID を記入
pnpm install
pnpm dev
```

`pnpm build && pnpm preview` で本番同等パスを確認。

## 5. OAuth リダイレクト URI（登録必須）

| プロバイダ | URI |
|------------|-----|
| Google | `https://loveclefinc.github.io/costume-coordinator/oauth/google/callback` |
| Dropbox | `https://loveclefinc.github.io/costume-coordinator/oauth/dropbox/callback` |

ローカル開発時は `http://localhost:3000/costume-coordinator/oauth/...` も追加。
