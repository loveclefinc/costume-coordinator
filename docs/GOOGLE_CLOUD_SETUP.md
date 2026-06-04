# Google Cloud 設定手順（Drive 同期・PKCE）

## 1. プロジェクト作成

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクト作成
2. **API とサービス** → **ライブラリ** → **Google Drive API** を有効化

## 2. OAuth 同意画面

1. **OAuth 同意画面** → **外部**（不特定の利用者向け）  
   - Google Workspace **組織内だけ**なら「内部」でも可（社内のみ）
2. スコープ追加: `https://www.googleapis.com/auth/drive.file` のみ
3. **アプリ情報**を入力（アプリ名、ユーザーサポートメール、デベロッパー連絡先）
4. **プライバシーポリシー URL**（本番公開・審査で必須になりやすい）:
   - `https://loveclefinc.github.io/costume-coordinator/privacy-policy`

### 本番公開（テストユーザー以外にも使わせる）

テストユーザーは**開発用**です。衣装コーディネーターを不特定の利用者に使わせるには **本番（In production）** が必要です。

1. **OAuth 同意画面** → **公開ステータス** → **アプリを公開**（Testing → In production）
2. スコープは `drive.file` のみにしておく（**非センシティブ**で、フル Drive より審査が軽い）
3. 初回は **「未確認アプリ」** の警告が出ることがある → **確認申請（Verification）** を提出
   - デモ動画: ログイン〜Drive 接続〜同期〜`CostumeCoordinator/data.json` 作成まで（英語 UI 推奨）
   - スコープの利用理由: 「ユーザーが作成した同期用 JSON の読み書きのみ」
4. 審査通過後、**テストユーザー登録なし**で一般の Google アカウントが接続可能

※ 審査は数日〜数週間かかることがあります。待ちの間はテストユーザーのみ利用可です。

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

### 「審査プロセスを完了していません」「テスト中でテスターのみ」（Error 403: access_denied）

OAuth 同意画面の**公開ステータスが「テスト」**のときに出ます。GitHub Pages やリダイレクト URI の不備ではありません。

**対処（利用者が少ない間・推奨）**

1. [Google Cloud Console](https://console.cloud.google.com/) → 対象プロジェクト
2. **API とサービス** → **OAuth 同意画面**
3. **テストユーザー** → **ユーザーを追加**
4. **連携しようとしている Google アカウントのメール**を 1 件ずつ追加（最大 100 件）
5. ブラウザで一度 Google からログアウトし、追加したアカウントで再度「Google Drive に接続」

※ テストユーザーに**入っていない Gmail**では必ずこのエラーになります。家族・参加者にも使わせる場合は、それぞれの Gmail を追加するか、下記「本番公開」を検討してください。

**本番公開（不特定多数に使わせる場合）**

1. 同意画面で **アプリを公開**（Publishing status: In production）
2. `drive.file` は比較的制限が緩いが、Google により**アプリの確認（審査）**を求められることがあります
3. 審査にはプライバシーポリシー URL（例: `https://loveclefinc.github.io/costume-coordinator/privacy-policy`）やアプリ説明が必要な場合があります

個人・小規模利用なら、まず **テストユーザー追加**で足りることがほとんどです。

### 「Access blocked: This app's request is invalid」のとき

| 確認項目 | 内容 |
|----------|------|
| リダイレクト URI | 上記 URL を**1文字も変えず**追加（末尾スラッシュなし） |
| JavaScript 生成元 | `https://loveclefinc.github.io` を追加 |
| クライアント種別 | **ウェブアプリケーション** |
| 同意画面のスコープ | `https://www.googleapis.com/auth/drive.file` を追加 |
| テストユーザー | 同意画面が「テスト」なら**接続する全員**の Gmail をテストユーザーに追加 |
| Client ID | GitHub Variables の ID と、コンソールの OAuth クライアントが**同一** |

## 4. 重要

- **Client Secret は生成されてもアプリに設定しない**（PKCE 公開クライアント）
- Secret をリポジトリにコミットしない
- API キー（ブラウザ用）は本アプリでは **不要**（Drive は OAuth のみ）

## 5. 保存先

アプリはユーザーの Drive 内に `CostumeCoordinator/data.json` を作成する（`drive.file` スコープでアプリが作成したファイルのみアクセス）。
