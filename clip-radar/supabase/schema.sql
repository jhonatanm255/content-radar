-- ==============================================================================
-- CLIP-RADAR: ESQUEMA DE BASE DE DATOS DEDICADO E INDEPENDIENTE (SUPABASE)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla de Proyectos de Video
CREATE TABLE IF NOT EXISTS clip_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID, -- Opcional si usas Supabase Auth
    title VARCHAR(255) NOT NULL,
    original_video_url TEXT,
    original_storage_path TEXT,
    duration_seconds FLOAT,
    status VARCHAR(50) DEFAULT 'uploaded', -- 'uploaded', 'processing_audio', 'transcribing', 'analyzing', 'ready', 'failed'
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Transcripciones estructuradas
CREATE TABLE IF NOT EXISTS clip_transcriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES clip_projects(id) ON DELETE CASCADE,
    full_text TEXT NOT NULL,
    segments JSONB NOT NULL, -- [{start: float, end: float, text: string}]
    language VARCHAR(10) DEFAULT 'es',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Clips generados (Highlights detectados y refinados)
CREATE TABLE IF NOT EXISTS clip_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES clip_projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    hook_sentence TEXT,
    summary TEXT,
    start_time FLOAT NOT NULL,
    end_time FLOAT NOT NULL,
    virality_score INT CHECK (virality_score BETWEEN 0 AND 100),
    virality_reason TEXT,
    status VARCHAR(50) DEFAULT 'suggested', -- 'suggested', 'queued_render', 'rendering', 'completed', 'failed'
    output_video_url TEXT,
    output_storage_path TEXT,
    aspect_ratio VARCHAR(10) DEFAULT '9:16', -- '9:16', '16:9', '1:1'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Historial de Refinamiento por Chat (Prompt History)
CREATE TABLE IF NOT EXISTS clip_chat_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES clip_projects(id) ON DELETE CASCADE,
    user_prompt TEXT NOT NULL,
    ai_response_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de consulta de alto rendimiento
CREATE INDEX IF NOT EXISTS idx_clip_items_project_id ON clip_items(project_id);
CREATE INDEX IF NOT EXISTS idx_clip_transcriptions_project ON clip_transcriptions(project_id);
