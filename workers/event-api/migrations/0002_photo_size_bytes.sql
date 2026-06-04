-- 既存 DB に 1 回だけ実行: wrangler d1 execute costume-events --remote --file=./migrations/0002_photo_size_bytes.sql
ALTER TABLE photos ADD COLUMN size_bytes INTEGER NOT NULL DEFAULT 0;
