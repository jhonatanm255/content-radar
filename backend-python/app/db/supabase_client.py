from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from supabase import create_client

from app.config import get_settings


def _client():
    settings = get_settings()
    return create_client(settings["supabase_url"], settings["supabase_service_role_key"])


def get_credentials(user_id: str) -> dict[str, Any] | None:
    result = (
        _client()
        .table("youtube_oauth_credentials")
        .select("*")
        .eq("user_id", user_id)
        .execute()
    )
    if result.data:
        return result.data[0]
    return None


def upsert_credentials(user_id: str, data: dict[str, Any]) -> None:
    payload = {
        "user_id": user_id,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        **data,
    }
    _client().table("youtube_oauth_credentials").upsert(payload).execute()


def delete_credentials(user_id: str) -> None:
    _client().table("youtube_oauth_credentials").delete().eq("user_id", user_id).execute()
