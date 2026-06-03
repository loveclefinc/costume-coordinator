# Google Cloud 設定手順（Drive 同期・PKCE）

## 1. プロジェクト作成

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクト作成
2. **API とサービス** → **ライブラリ** → **Google Drive API** を有効化

## 2. OAuth 同意画面

1. **OAuth 同意画面** → 外部（テスト）または内部
2. スコープ追加: `https://www.googleapis.com/auth/drive.file` のみ
3. テストユーザーに自分の Google アカウントを追加（テストモード時）

## 3. OAuth クライアント ID

1. **認証情報** → **認証情報を作成** → **OAuth クライアント ID**
2. 種類: **ウェブアプリケーション**（デスクトップアプリではない）
3. **承認済みの JavaScript 生成元**（必須・パスなし）:
   - `https://loveclefinc.github.io`
   - `http://localhost:3000`（ローカル開発時）
4. **承認済みのリダイレクト URI**（アプリ設定画面の「コピー」と**完全一致**）:
   - `https://loveclefinc.github.io/costume-coordinator/oauth/google/callback`
   - `http://localhost:3000/costume-coordinator/oauth/google/callback`
5. Client ID をコピー → `loveclefinc/costume-coordinator` の `VITE_GOOGLE_CLIENT_ID`

### 「Access blocked: This app's request is invalid」のとき

| 確認項目 | 内容 |
|----------|------|
| リダイレクト URI | 上記 URL を**1文字も変えず**追加（末尾スラッシュなし） |
| JavaScript 生成元 | `https://loveclefinc.github.io` を追加 |
| クライアント種別 | **ウェブアプリケーション** |
| 同意画面のスコープ | `https://www.googleapis.com/auth/drive.file` を追加 |
| テストユーザー | 同意画面が「テスト」なら自分の Gmail をテストユーザーに追加 |
| Client ID | GitHub Variables の ID と、コンソールの OAuth クライアントが**同一** |

## 4. 重要

- **Client Secret は生成されてもアプリに設定しない**（PKCE 公開クライアント）
- Secret をリポジトリにコミットしない
- API キー（ブラウザ用）は本アプリでは **不要**（Drive は OAuth のみ）

## 5. 保存先

アプリはユーザーの Drive 内に `CostumeCoordinator/data.json` を作成する（`drive.file` スコープでアプリが作成したファイルのみアクセス）。
