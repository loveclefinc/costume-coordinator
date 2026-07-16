-- 完成した装い（主衣装＋シャツ＋小物等）を1候補として保持する。
-- 既存衣装は components=[] の単品候補として後方互換。
ALTER TABLE costumes ADD COLUMN components_json TEXT NOT NULL DEFAULT '[]';
