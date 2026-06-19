ALTER TABLE costumes ADD COLUMN source_costume_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_costumes_participant_source
  ON costumes(participant_id, source_costume_id)
  WHERE source_costume_id IS NOT NULL;
