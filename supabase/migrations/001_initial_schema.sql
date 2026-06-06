-- Content Radar — Paso 0: histórico de canal y videos rastreados
-- Ejecutar en Supabase → SQL Editor

-- Canales vinculados por usuario
CREATE TABLE IF NOT EXISTS channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  youtube_channel_id TEXT NOT NULL,
  name TEXT NOT NULL,
  handle TEXT NOT NULL,
  avatar_url TEXT,
  subscriber_count BIGINT NOT NULL DEFAULT 0,
  total_views BIGINT NOT NULL DEFAULT 0,
  video_count INT NOT NULL DEFAULT 0,
  views_30d BIGINT NOT NULL DEFAULT 0,
  videos_30d INT NOT NULL DEFAULT 0,
  engagement_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_competitor BOOLEAN NOT NULL DEFAULT false,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_sync_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, youtube_channel_id)
);

-- Snapshot diario del canal (histórico para gráficos)
CREATE TABLE IF NOT EXISTS channel_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  subscriber_count BIGINT NOT NULL,
  total_views BIGINT NOT NULL,
  video_count INT NOT NULL,
  views_30d BIGINT NOT NULL DEFAULT 0,
  engagement_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (channel_id, snapshot_date)
);

-- Videos que el usuario carga manualmente (Paso 1)
CREATE TABLE IF NOT EXISTS tracked_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  youtube_video_id TEXT NOT NULL,
  title TEXT NOT NULL,
  thumbnail_url TEXT,
  published_at TIMESTAMPTZ,
  view_count BIGINT NOT NULL DEFAULT 0,
  like_count BIGINT NOT NULL DEFAULT 0,
  comment_count BIGINT NOT NULL DEFAULT 0,
  comments_analyzed_at TIMESTAMPTZ,
  comments_fetched_at TIMESTAMPTZ,
  last_metrics_sync_at TIMESTAMPTZ,
  analysis_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, youtube_video_id)
);

-- Snapshot diario de métricas por video rastreado
CREATE TABLE IF NOT EXISTS video_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracked_video_id UUID NOT NULL REFERENCES tracked_videos(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  view_count BIGINT NOT NULL,
  like_count BIGINT NOT NULL,
  comment_count BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tracked_video_id, snapshot_date)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_channels_user_id ON channels(user_id);
CREATE INDEX IF NOT EXISTS idx_channel_snapshots_channel_date ON channel_snapshots(channel_id, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_tracked_videos_user_id ON tracked_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_video_snapshots_video_date ON video_snapshots(tracked_video_id, snapshot_date);

-- Row Level Security
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracked_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_snapshots ENABLE ROW LEVEL SECURITY;

-- Políticas: channels
CREATE POLICY "users_select_own_channels" ON channels
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_channels" ON channels
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_own_channels" ON channels
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users_delete_own_channels" ON channels
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas: channel_snapshots (via canal del usuario)
CREATE POLICY "users_select_own_snapshots" ON channel_snapshots
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM channels c WHERE c.id = channel_id AND c.user_id = auth.uid())
  );
CREATE POLICY "users_insert_own_snapshots" ON channel_snapshots
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM channels c WHERE c.id = channel_id AND c.user_id = auth.uid())
  );
CREATE POLICY "users_update_own_snapshots" ON channel_snapshots
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM channels c WHERE c.id = channel_id AND c.user_id = auth.uid())
  );

-- Políticas: tracked_videos
CREATE POLICY "users_select_own_tracked_videos" ON tracked_videos
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_tracked_videos" ON tracked_videos
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_own_tracked_videos" ON tracked_videos
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users_delete_own_tracked_videos" ON tracked_videos
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas: video_snapshots (via tracked_video del usuario)
CREATE POLICY "users_select_own_video_snapshots" ON video_snapshots
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM tracked_videos tv WHERE tv.id = tracked_video_id AND tv.user_id = auth.uid())
  );
CREATE POLICY "users_insert_own_video_snapshots" ON video_snapshots
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM tracked_videos tv WHERE tv.id = tracked_video_id AND tv.user_id = auth.uid())
  );
