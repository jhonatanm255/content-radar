-- Content Radar — Campos enriquecidos de análisis LLM y reportes por video

ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS content_sentiment TEXT,
  ADD COLUMN IF NOT EXISTS engagement_type TEXT,
  ADD COLUMN IF NOT EXISTS topic TEXT,
  ADD COLUMN IF NOT EXISTS key_phrase TEXT,
  ADD COLUMN IF NOT EXISTS is_resonance BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE tracked_videos
  ADD COLUMN IF NOT EXISTS analysis_report TEXT,
  ADD COLUMN IF NOT EXISTS strategic_report JSONB;

CREATE INDEX IF NOT EXISTS idx_comments_engagement_type ON comments(engagement_type);
CREATE INDEX IF NOT EXISTS idx_comments_topic ON comments(topic);
