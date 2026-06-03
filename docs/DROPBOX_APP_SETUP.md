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

1. **Redirect URIs** に追加:
   - `https://loveclefinc.github.io/costume-coordinator/oauth/dropbox/callback`
   - `http://localhost:3000/costume-coordinator/oauth/dropbox/callback`
2. **Allow public clients (Implicit Grant & PKCE)** を **有効化**（PKCE 必須）
3. App key を `VITE_DROPBOX_CLIENT_ID` に設定

## 4. 重要

- **App secret はコードに埋め込まない**
- PKCE フローのみ使用
- 保存パス: `/CostumeCoordinator/data.json`（App folder ルート相対）

## 5. 動作確認

設定画面から「Dropbox に接続」→ 認可 → 「今すぐ同期」で App folder 内に JSON が作成されることを確認。
