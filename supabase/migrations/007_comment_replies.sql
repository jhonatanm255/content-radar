-- Content Radar — Soporte para comentarios de segundo nivel (respuestas)
ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS parent_id TEXT,
  ADD COLUMN IF NOT EXISTS is_reply BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_is_reply ON comments(is_reply);
