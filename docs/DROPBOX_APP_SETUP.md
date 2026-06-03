# Dropbox App 設定手順（App folder・PKCE）

## 1. アプリ作成

1. [Dropbox App Console](https://www.dropbox.com/developers/apps)
2. **Create app**
3. Choose an API: **Scoped access**
4. Type of access: **App folder**
5. Name: `Costume Coordinator`（表示名）

## 2. 権限（Permissions）

**Files and folders** で最低限:

- `files.metadata.read`
- `files.content.read`
- `files.content.write`

## 3. OAuth 2

1. 対象アプリの **Settings** → **Redirect URIs** → **Add**
2. アプリの **設定画面に表示される URI をコピー**して貼り付け（通常は次のとおり）:
   - `https://loveclefinc.github.io/costume-coordinator/oauth/dropbox/callback`
   - `http://localhost:3000/costume-coordinator/oauth/dropbox/callback`（ローカル用）
3. **Save** を押して反映を待つ（数分かかることがあります）
4. **Allow public clients (Implicit Grant & PKCE)** を **有効化**（PKCE 必須）
5. 同じアプリの **App key** を `loveclefinc/costume-coordinator` の `VITE_DROPBOX_CLIENT_ID` に設定

### `Invalid redirect_uri` のとき

- エラーメッセージに表示された URI を**そのまま** Redirect URIs に追加する
- 別の Dropbox アプリの App key を GitHub に入れていないか確認（key と Redirect URI は**同じアプリ**）
- `http` / `https`、末尾の `/` の有無が一致しているか確認

## 4. 重要

- **App secret はコードに埋め込まない**
- PKCE フローのみ使用
- 保存パス: `/CostumeCoordinator/data.json`（App folder ルート相対）

## 5. 動作確認

設定画面から「Dropbox に接続」→ 認可 → 「今すぐ同期」で App folder 内に JSON が作成されることを確認。
