# Costume Coordinator PWA

グループイベント向けの衣装コーディネート PWA です。

## デモ

https://loveclefinc.github.io/costume-coordinator/

## 機能

- 衣装の登録（色・トーン・柄・写真）
- イベントとテーマ設定
- 参加者ごとの希望を踏まえた衣装の最適化
- オフライン対応（Service Worker）
- ホーム画面への追加（iOS / Android）

## 技術

- React 19 · TypeScript · Vite
- データはブラウザ内 IndexedDB
- 任意: Google Drive / Dropbox 同期（OAuth PKCE）
- 任意: オンライン提出 API（Cloudflare Workers + R2）

## 開発

```bash
pnpm install
pnpm dev
pnpm build
pnpm test
```

OAuth クライアント ID や API URL などの**セットアップ手順はこの公開リポジトリには含めていません**。運用ドキュメントはローカルで別管理してください。

## ライセンス

Private / All rights reserved（リポジトリ設定に従う）
