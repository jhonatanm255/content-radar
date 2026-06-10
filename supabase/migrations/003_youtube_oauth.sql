-- YouTube Analytics OAuth credentials (solo accesible vía service role en backend)

CREATE TABLE IF NOT EXISTS youtube_oauth_credentials (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  google_email TEXT,
  refresh_token TEXT NOT NULL,
  access_token TEXT,
  token_expires_at TIMESTAMPTZ,
  youtube_channel_id TEXT,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE youtube_oauth_credentials ENABLE ROW LEVEL SECURITY;

-- Sin políticas para usuarios autenticados: el backend usa service role.
-- El frontend consulta el estado vía API del backend.

CREATE INDEX IF NOT EXISTS idx_youtube_oauth_user_id ON youtube_oauth_credentials(user_id);
