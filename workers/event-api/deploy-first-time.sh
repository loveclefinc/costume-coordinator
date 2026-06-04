#!/usr/bin/env bash
# 初回デプロイ: wrangler login 済みであること
set -euo pipefail
cd "$(dirname "$0")"

echo "=== Wrangler 認証確認 ==="
if ! npx wrangler whoami 2>&1 | grep -qiE 'email|account id'; then
  echo "未ログインです。先に実行してください:"
  echo "  npx wrangler login"
  exit 1
fi

echo "=== R2 バケット ==="
npx wrangler r2 bucket create costume-event-photos 2>&1 || true

PLACEHOLDER='00000000-0000-0000-0000-000000000001'
if grep -q "$PLACEHOLDER" wrangler.toml; then
  echo "=== D1 データベース作成 ==="
  OUT=$(npx wrangler d1 create costume-events 2>&1) || true
  echo "$OUT"
  DB_ID=$(echo "$OUT" | sed -n 's/.*database_id = "\([^"]*\)".*/\1/p' | head -1)
  if [ -z "$DB_ID" ]; then
    DB_ID=$(echo "$OUT" | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)
  fi
  if [ -z "$DB_ID" ]; then
    echo "database_id を取得できませんでした。次を確認してください:"
    echo "  npx wrangler d1 list"
    echo "表示された id を wrangler.toml の database_id に手で貼り付けてから再実行"
    exit 1
  fi
  if [[ "$(uname)" == Darwin ]]; then
    sed -i '' "s/database_id = \"$PLACEHOLDER\"/database_id = \"$DB_ID\"/" wrangler.toml
  else
    sed -i "s/database_id = \"$PLACEHOLDER\"/database_id = \"$DB_ID\"/" wrangler.toml
  fi
  echo "wrangler.toml を更新: database_id = $DB_ID"
fi

echo "=== D1 スキーマ適用（remote） ==="
npx wrangler d1 execute costume-events --remote --file=./schema.sql

echo "=== Worker デプロイ ==="
DEPLOY_LOG=$(npx wrangler deploy 2>&1)
echo "$DEPLOY_LOG"
WORKER_URL=$(echo "$DEPLOY_LOG" | grep -oE 'https://[a-zA-Z0-9.-]+\.workers\.dev' | head -1)

echo ""
echo "============================================"
if [ -n "$WORKER_URL" ]; then
  echo "API URL: $WORKER_URL"
  echo ""
  echo "次の作業:"
  echo "  1) GitHub → Settings → Actions → Variables"
  echo "     VITE_EVENT_API_URL = $WORKER_URL"
  echo "  2) main を push するか Actions で Pages を再デプロイ"
  echo "  3) 確認: curl -s \"$WORKER_URL/api/health\""
else
  echo "デプロイは完了した可能性があります。URL は Cloudflare ダッシュボードで確認してください。"
fi
echo "============================================"
