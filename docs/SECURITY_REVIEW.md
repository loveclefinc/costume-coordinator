# セキュリティレビュー（クラウド同期実装）

**日付:** 2026-06-04  
**対象:** costume-coordinator フロントエンドのみクラウド同期

## 1. 脅威モデル

| 脅威 | 影響 | 対策 |
|------|------|------|
| リポジトリへの秘密漏洩 | 全ユーザー影響 | Client ID のみ `VITE_*`、Secret/Token 直書き禁止 |
| XSS によるトークン窃取 | クラウドデータ改ざん | Refresh Token を localStorage 禁止、IndexedDB 暗号化 |
| CSRF（OAuth） | 不正連携 | PKCE + state パラメータ |
| 中間者 | トークン漏洩 | HTTPS のみ（GitHub Pages） |
| 競合データ破損 | データ欠損 | レコード LWW + 競合ログ |

## 2. 要件適合チェック

| 要件 | 判定 | 実装 |
|------|------|------|
| Client Secret 禁止 | ✅ | PKCE のみ、トークン POST に secret なし |
| Access Token 永続保存禁止 | ✅ | `AccessTokenCache`（メモリのみ） |
| Refresh Token 安全管理 | ✅ | `SecureTokenStore` + AES-GCM + 端末鍵（IndexedDB） |
| localStorage 秘密禁止 | ✅ | `backup_config` 廃止、トークンは IDB |
| OAuth PKCE 必須 | ✅ | S256 |
| API キー埋め込み禁止 | ✅ | Firebase 設定削除 |
| サーバー不使用 | ✅ | トークン交換はブラウザから直接 |

## 3. 残存リスク（許容）

- **公開 Client ID** — OAuth 公開クライアントとして想定内。Google/Dropbox 側でリダイレクト URI を固定すること。
- **端末侵害** — ブラウザ内暗号化は完全な HSM ではない。PWA の一般的限界。
- **Firebase 履歴** — 過去コミットに API Key が残る可能性。キー再発行推奨（運用手順参照）。

## 4. 実装前の除去対象

- `src/config/firebase.ts`（ハードコード API Key）
- `backupService` の `localStorage` トークン保存
- `OAuthCallback` の `/api/oauth/token` サーバー依存

## 5. 承認

上記対策を実装コードに反映したうえで本番ビルド可能と判断する。
