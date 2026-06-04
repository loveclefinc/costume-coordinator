# Dropbox App 設定手順（App folder・PKCE）

## 1. アプリ作成（3ステップウィザード）

[Dropbox App Console](https://www.dropbox.com/developers/apps) → **Create app**

### Step 1 — Configure app settings

| 項目 | 選ぶ値 |
|------|--------|
| Choose an API | **Scoped access** |
| Choose the type of access | **App folder**（フル Dropbox 全体は**不要**） |
| Name your app | `Costume Coordinator`（英数字・スペース可） |

**App folder** にすると、ユーザーの Dropbox 内の「アプリ専用フォルダ」だけに  
`/CostumeCoordinator/data.json` を置けます。衣装コーディネーターは**それ以外のファイルには触れません**。

### Step 2 — Select access scopes

**Files and folders** で次の3つにチェック（これだけで同期は動きます）:

| スコープ | 用途 |
|----------|------|
| `files.metadata.read` | ファイルの有無確認 |
| `files.content.read` | `data.json` のダウンロード |
| `files.content.write` | フォルダ作成・`data.json` のアップロード |

**Account**（任意だが推奨）:

| スコープ | 用途 |
|----------|------|
| `account_info.read` | 接続後に設定画面へ表示するメール名の取得（`get_current_account`） |

それ以外（`sharing.*` `files.permanent_delete` など）は**付けない**（審査も通りやすい）。

#### OpenID Connect のスコープについて（表示される注意書き）

コンソールに次のような説明が出ることがあります:

> Scopes used for OpenID Connect. … OpenID scopes must be explicitly set in the "scope" parameter on /oauth2/authorize

**衣装コーディネーターでは OpenID Connect は使いません。** Dropbox を「ログイン ID」として使うのではなく、**App folder 内の JSON 同期**だけです。

| 種類 | 例 | このアプリ |
|------|-----|------------|
| **API スコープ**（Step 2 で選ぶ） | `files.content.read` など | **必要** |
| **OpenID スコープ** | `openid` `profile` `email` | **不要・選ばない** |

- OpenID 用のチェックボックスがあっても **オフのまま**で問題ありません。
- **Team-scoped app**（チーム向けアプリ）の場合は OpenID が使えない、という注意です。一般利用なら **ユーザー向け App folder アプリ** を作成してください。
- 認可 URL に `scope=openid` などを付けない限り、OpenID は要求されません（本アプリのコードも付けていません）。

### Step 3 — Add branding

本番申請（Production）で求められます。次を用意して入力:

| 項目 | 例 |
|------|-----|
| App website / Redirect domain のベース | `https://loveclefinc.github.io` |
| 説明（英語推奨） | `PWA for costume coordination. Syncs one JSON file in the user App folder only.` |
| Privacy policy URL | `https://loveclefinc.github.io/costume-coordinator/privacy-policy` |
| アイコン | `public/icon-64.png`（64×64）・`public/icon-256.png`（256×256）。元画像は `assets/images/icon.png` |

[Dropbox developer branding guide](https://www.dropbox.com/developers/reference/branding-guide) に沿ってください。

---

## 2. 作成後 — Settings（OAuth・本番）

アプリ作成後、左メニュー **Settings** で以下を設定します。

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

## 4. Permissions タブ（ウィザード後に変更する場合）

**Permissions** で Step 2 と同じスコープだけ有効か確認。追加したら **Submit** / 保存し、**既存ユーザーは再接続**が必要になることがあります。

## 5. 重要

- **App secret はコードに埋め込まない**
- PKCE フローのみ使用
- 保存パス: `/CostumeCoordinator/data.json`（App folder ルート相対）

## 6. 動作確認

設定画面から「Dropbox に接続」→ 認可 → 「今すぐ同期」で App folder 内に JSON が作成されることを確認。

## 7. 「This app has reached its user limit」

開発モード（Development）の Dropbox アプリには **連携できるユーザー数の上限** があります。上限に達するとこのメッセージが出ます。**テストユーザーを増やしても本番利用にはなりません。**

### 対処: 本番ステータス（Production）を申請

1. [Dropbox App Console](https://www.dropbox.com/developers/apps) → 対象アプリ
2. **Settings** タブ
3. **Status**: Development → **Apply for production**（または **Apply for Production status**）
4. 申請フォームに必要事項を記入（例）:
   - アプリの説明: 衣装管理 PWA。ユーザーの App folder 内に `CostumeCoordinator/data.json` のみ読み書き
   - 公開 URL: `https://loveclefinc.github.io/costume-coordinator/`
   - プライバシーポリシー: `https://loveclefinc.github.io/costume-coordinator/privacy-policy`
   - OAuth: PKCE、App secret はサーバーに置かない（ブラウザのみ）
5. Dropbox の [ブランディングガイド](https://www.dropbox.com/developers/reference/branding-guide)・利用規約に沿っていることを確認
6. 承認後、ユーザー上限が緩和され、一般利用者が接続できる

### 開発中の一時対処

- **Settings** → **Development users** → **Enable additional users** で開発用枠を広げられる場合あり（**本番の代替にはならない**）
- 連携数が **50 を超える**と、Dropbox は **2 週間以内の本番申請**を求めることがある（[開発者ガイド](https://www.dropbox.com/developers/reference/developer-guide)）

### Google Drive との違い

| | Google | Dropbox |
|---|--------|---------|
| 開発のみ | テストユーザー最大 100 | 開発モードは少数〜上限あり |
| 一般公開 | 同意画面を「本番」+ 確認申請 | Production 申請・承認 |
| このアプリの権限 | `drive.file` のみ | App folder 内ファイルのみ |
