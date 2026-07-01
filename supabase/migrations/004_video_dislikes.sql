-- Dislikes por video (YouTube Analytics, solo canal propio con OAuth)

ALTER TABLE tracked_videos
  ADD COLUMN IF NOT EXISTS dislike_count BIGINT;
