-- Content Radar — Comentarios analizados por video rastreado

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracked_video_id UUID NOT NULL REFERENCES tracked_videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  youtube_comment_id TEXT NOT NULL,
  author_name TEXT NOT NULL DEFAULT '',
  author_avatar TEXT,
  text TEXT NOT NULL,
  published_at TIMESTAMPTZ,
  sentiment TEXT NOT NULL DEFAULT 'neutral',
  category TEXT NOT NULL DEFAULT 'otro',
  like_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tracked_video_id, youtube_comment_id)
);

CREATE INDEX IF NOT EXISTS idx_comments_tracked_video_id ON comments(tracked_video_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_category ON comments(category);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_comments" ON comments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_comments" ON comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_comments" ON comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "users_delete_own_comments" ON comments
  FOR DELETE USING (auth.uid() = user_id);
