import os
from functools import lru_cache
from dotenv import load_dotenv

load_dotenv()

YOUTUBE_SCOPES = [
    "https://www.googleapis.com/auth/yt-analytics.readonly",
    "https://www.googleapis.com/auth/youtube.readonly",
    "openid",
    "email",
    "profile",
]


def _parse_cors_origins() -> list[str]:
    frontend = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
    origins = [
        frontend,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        # ── Producción ──
        "https://creator-radar-six.vercel.app",
    ]
    extra = os.getenv("CORS_ORIGINS", "")
    if extra:
        origins.extend(part.strip().rstrip("/") for part in extra.split(",") if part.strip())
    return list(dict.fromkeys(origins))


@lru_cache
def get_settings():
    return {
        "google_client_id": os.getenv("GOOGLE_CLIENT_ID", ""),
        "google_client_secret": os.getenv("GOOGLE_CLIENT_SECRET", ""),
        "google_redirect_uri": os.getenv(
            "GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/youtube/callback"
        ),
        "frontend_url": os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/"),
        "cors_origins": _parse_cors_origins(),
        "state_secret": os.getenv("STATE_SECRET", "dev-state-secret"),
        "supabase_url": os.getenv("SUPABASE_URL", ""),
        "supabase_service_role_key": os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
        "supabase_anon_key": os.getenv("SUPABASE_ANON_KEY", ""),
        "youtube_api_key": os.getenv("YOUTUBE_API_KEY", ""),
        "youtube_analytics_api_key": os.getenv("YOUTUBE_ANALYTICS_API_KEY", ""),
        "gemini_api_key": os.getenv("GEMINI_API_KEY", ""),
        "openai_api_key": os.getenv("OPENAI_API_KEY", ""),
        "nlp_mode": os.getenv("NLP_MODE", "local").strip().lower(),
    }


def is_llm_only_mode() -> bool:
    return get_settings()["nlp_mode"] == "llm"


def oauth_configured() -> bool:
    s = get_settings()
    return bool(
        s["google_client_id"]
        and s["google_client_secret"]
        and s["supabase_url"]
        and s["supabase_service_role_key"]
    )
