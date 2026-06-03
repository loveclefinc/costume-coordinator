# セキュリティチェックリスト（公開リポジトリ）

リリース前にすべて確認すること。

## リポジトリ

- [ ] `git grep -E 'AIza|ghp_|gho_|AKIA|service_role|BEGIN PRIVATE|client_secret\s*='` がヒットしない
- [ ] `.env` / `.env.production` が git に含まれていない
- [ ] `credentials.json` / `*-service-account*.json` が含まれていない
- [ ] Firebase Admin SDK JSON が含まれていない

## コード

- [ ] Client Secret をコード・CI・ドキュメント例に書いていない
- [ ] Access Token を localStorage / sessionStorage に永続保存していない
- [ ] Refresh Token は `SecureTokenStore`（IndexedDB 暗号化）のみ
- [ ] OAuth は PKCE（S256）のみ
- [ ] Client ID は `import.meta.env.VITE_*` 経由のみ

## クラウドコンソール

- [ ] Google: OAuth クライアント種別「ウェブアプリ」、リダイレクト URI を Pages URL に限定
- [ ] Dropbox: App folder、リダイレクト URI 登録済み
- [ ] 不要な OAuth スコープを付与していない（Drive は `drive.file` のみ）

## GitHub

- [ ] Secrets は Repository Secrets / Variables のみ（コードにない）
- [ ] Pages デプロイ workflow に秘密がログ出力されていない

## 侵害時

- [ ] OAuth クライアントの再発行手順を把握
- [ ] ユーザーへの「再接続」案内文を準備
