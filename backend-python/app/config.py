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


@lru_cache
def get_settings():
    return {
        "google_client_id": os.getenv("GOOGLE_CLIENT_ID", ""),
        "google_client_secret": os.getenv("GOOGLE_CLIENT_SECRET", ""),
        "google_redirect_uri": os.getenv(
            "GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/youtube/callback"
        ),
        "frontend_url": os.getenv("FRONTEND_URL", "http://localhost:5173"),
        "state_secret": os.getenv("STATE_SECRET", "dev-state-secret"),
        "supabase_url": os.getenv("SUPABASE_URL", ""),
        "supabase_service_role_key": os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
        "supabase_anon_key": os.getenv("SUPABASE_ANON_KEY", ""),
    }


def oauth_configured() -> bool:
    s = get_settings()
    return bool(
        s["google_client_id"]
        and s["google_client_secret"]
        and s["supabase_url"]
        and s["supabase_service_role_key"]
    )
