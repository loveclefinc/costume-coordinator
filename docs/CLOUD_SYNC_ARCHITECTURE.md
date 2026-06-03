# クラウド同期アーキテクチャ設計書

## 1. 目的

Costume Coordinator を **GitHub Pages 上の静的 PWA** として運用し、**サーバーレス・完全無料**で Google Drive / Dropbox へのデータ同期を実現する。

## 2. 制約

| 項目 | 方針 |
|------|------|
| ホスティング | GitHub Pages（`basename: /costume-coordinator/`） |
| バックエンド | 不使用（OAuth トークン交換もブラウザ内 PKCE） |
| 認証 | OAuth 2.0 **PKCE** のみ（Client Secret 禁止） |
| 秘密情報 | リポジトリに埋め込まない。Client ID はビルド時 `VITE_*` のみ |
| ローカル | IndexedDB（既存 `CostumeCoordinator` DB） |
| トークン | Access Token はメモリのみ。Refresh Token は IndexedDB + AES-GCM |

## 3. コンポーネント構成

```
┌─────────────────────────────────────────────────────────────┐
│                     React UI (Settings)                      │
│              useCloudSync / CloudSyncSettings                │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    CloudSyncService                            │
│  sync() / pull() / push() / resolveConflicts()                 │
└──────┬───────────────────────────────┬──────────────────────┘
       │                               │
┌──────▼──────┐                 ┌──────▼──────┐
│ MergeEngine │                 │ TokenManager │
│ + Conflict  │                 │ (memory+IDB) │
└──────┬──────┘                 └──────┬──────┘
       │                               │
┌──────▼───────────────────────────────▼──────────────────────┐
│           CloudStorageProvider (interface)                   │
├─────────────────────┬───────────────────────────────────────┤
│ GoogleDriveStorage  │         DropboxStorage                 │
└─────────────────────┴───────────────────────────────────────┘
       │                               │
┌──────▼──────┐                 ┌──────▼──────┐
│ GoogleOAuth │                 │ DropboxOAuth │
│   (PKCE)    │                 │   (PKCE)     │
└─────────────┘                 └─────────────┘
```

## 4. データモデル（クラウド JSON）

パス: `CostumeCoordinator/data.json`

```typescript
interface CloudSyncDocument {
  version: 1;
  updatedAt: string; // ISO 8601（ドキュメント全体）
  records: SyncRecord[];
}

interface SyncRecord {
  id: string;
  type: 'event' | 'costume' | 'usageHistory';
  updatedAt: number; // Unix ms
  data: Event | Costume | UsageHistory;
}
```

## 5. 同期フロー

### 5.1 手動同期

1. `storage.init()` でローカル全件取得
2. `CloudStorageProvider.download()` で `data.json` 取得（無ければ空ドキュメント）
3. `mergeRecords(local, remote)` — ID + `updatedAt` で LWW（Last-Write-Wins）
4. 競合: 同一 ID で双方が前回同期後に更新 → `SyncConflict` として記録し新しい方を採用（UI に警告）
5. マージ結果をローカル IndexedDB に `bulkApply`
6. `CloudStorageProvider.upload()` でクラウドへ書き戻し
7. `syncMeta`（IndexedDB）に `lastSyncAt` 保存

### 5.2 自動同期

- `online` かつ接続済みのとき 5 分間隔 + `visibilitychange`（visible 時）
- オフライン時はキューせず、次回 online で実行

### 5.3 差分

- レコード単位の `updatedAt` 比較（フル JSON 置換ではなくマージ）

## 6. OAuth PKCE フロー

1. `generatePkcePair()` → `code_verifier`, `code_challenge` (S256)
2. `sessionStorage` に `oauth_pkce_verifier`, `oauth_provider` を保存（タブ限定・短命）
3. プロバイダ認可 URL へリダイレクト
4. コールバック `/oauth/google/callback` または `/oauth/dropbox/callback`
5. `exchangeCodeForTokens(code, verifier)` — **Client Secret なし**
6. `refresh_token` を `SecureTokenStore`（IndexedDB 暗号化）へ
7. `access_token` を `AccessTokenCache`（メモリ Map）へ
8. 期限切れ時 `refreshAccessToken()` で更新

## 7. プロバイダ別 API

### Google Drive

- Scope: `https://www.googleapis.com/auth/drive.file`
- フォルダ `CostumeCoordinator` を検索 or 作成
- `data.json` を `files.create` / `files.update`（media upload）

### Dropbox

- App folder モード（パス `/CostumeCoordinator/data.json`）
- `files/upload` / `files/download` with `Dropbox-API-Arg`

## 8. エラー処理

| コード | 条件 | UI |
|--------|------|-----|
| `AUTH_EXPIRED` | 401 / invalid_grant | 再接続を促す |
| `NETWORK_OFFLINE` | navigator.offLine / fetch failed | オフライン表示 |
| `RATE_LIMITED` | 429 | リトライ案内 |
| `FILE_CORRUPT` | JSON parse / schema 不正 | クラウド復元スキップ |
| `SYNC_CONFLICT` | 競合検出 | 警告バナー + 最終同期時刻 |

## 9. Firebase 撤去

- `AuthContext` の Firebase 依存を削除し、**ローカル利用はログイン不要**
- クラウド接続は設定画面から任意で行う
- `src/config/firebase.ts` 削除

## 10. 環境変数（ビルド時のみ）

| 変数 | 用途 |
|------|------|
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth 公開 Client ID |
| `VITE_DROPBOX_CLIENT_ID` | Dropbox OAuth 公開 App key |

`.env.example` にプレースホルダのみ。実値は GitHub Actions Variables またはローカル `.env`（gitignore）。

## 11. テスト戦略

- `pkce.ts` — challenge 形式の単体テスト
- `merge.ts` — LWW・競合検出
- `sync-service.ts` — モック `CloudStorageProvider`
- OAuth / 実 API は E2E 手動（CI では秘密なし）
