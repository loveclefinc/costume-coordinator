-- Production recovery migration for databases created before costume attributes were added.
-- Run once only against a database whose costumes table has none of these four columns.
ALTER TABLE costumes ADD COLUMN silhouette TEXT;
ALTER TABLE costumes ADD COLUMN suit_style TEXT;
ALTER TABLE costumes ADD COLUMN suit_breasting TEXT;
ALTER TABLE costumes ADD COLUMN suit_lapel TEXT;
