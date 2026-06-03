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
2. 種類: **ウェブアプリケーション**
3. **承認済みの JavaScript 生成元**（任意）:
   - `https://loveclefinc.github.io`
   - `http://localhost:3000`
4. **承認済みのリダイレクト URI**:
   - `https://loveclefinc.github.io/costume-coordinator/oauth/google/callback`
   - `http://localhost:3000/costume-coordinator/oauth/google/callback`
5. Client ID をコピー → `VITE_GOOGLE_CLIENT_ID` に設定

## 4. 重要

- **Client Secret は生成されてもアプリに設定しない**（PKCE 公開クライアント）
- Secret をリポジトリにコミットしない
- API キー（ブラウザ用）は本アプリでは **不要**（Drive は OAuth のみ）

## 5. 保存先

アプリはユーザーの Drive 内に `CostumeCoordinator/data.json` を作成する（`drive.file` スコープでアプリが作成したファイルのみアクセス）。
