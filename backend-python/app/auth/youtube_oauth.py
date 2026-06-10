import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx
from fastapi import HTTPException
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

from app.config import YOUTUBE_SCOPES, get_settings, oauth_configured
from app.db.supabase_client import delete_credentials, get_credentials, upsert_credentials


def _sign_state(user_id: str) -> str:
    settings = get_settings()
    nonce = secrets.token_urlsafe(16)
    payload = f"{user_id}:{nonce}"
    signature = hmac.new(
        settings["state_secret"].encode(),
        payload.encode(),
        hashlib.sha256,
    ).hexdigest()
    return f"{payload}:{signature}"


def _verify_state(state: str) -> str:
    settings = get_settings()
    parts = state.split(":")
    if len(parts) != 3:
        raise HTTPException(status_code=400, detail="Estado OAuth inválido")

    user_id, nonce, signature = parts
    payload = f"{user_id}:{nonce}"
    expected = hmac.new(
        settings["state_secret"].encode(),
        payload.encode(),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(signature, expected):
        raise HTTPException(status_code=400, detail="Estado OAuth no válido")

    return user_id


def build_auth_url(user_id: str) -> str:
    if not oauth_configured():
        raise HTTPException(status_code=500, detail="OAuth de Google no configurado en el backend")

    settings = get_settings()
    params = {
        "client_id": settings["google_client_id"],
        "redirect_uri": settings["google_redirect_uri"],
        "response_type": "code",
        "scope": " ".join(YOUTUBE_SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "state": _sign_state(user_id),
    }
    return f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"


async def handle_callback(code: str, state: str) -> str:
    user_id = _verify_state(state)
    settings = get_settings()

    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings["google_client_id"],
                "client_secret": settings["google_client_secret"],
                "redirect_uri": settings["google_redirect_uri"],
                "grant_type": "authorization_code",
            },
        )

    if token_response.status_code != 200:
        raise HTTPException(status_code=400, detail="No se pudo intercambiar el código OAuth")

    tokens = token_response.json()
    refresh_token = tokens.get("refresh_token")
    access_token = tokens.get("access_token")

    if not refresh_token:
        raise HTTPException(
            status_code=400,
            detail="Google no devolvió refresh_token. Revoca el acceso en tu cuenta Google y vuelve a conectar.",
        )

    google_email = None
    youtube_channel_id = None

    async with httpx.AsyncClient() as client:
        userinfo = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if userinfo.status_code == 200:
            google_email = userinfo.json().get("email")

    try:
        creds = Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings["google_client_id"],
            client_secret=settings["google_client_secret"],
            scopes=YOUTUBE_SCOPES,
        )
        youtube = build("youtube", "v3", credentials=creds)
        channels = (
            youtube.channels()
            .list(part="id", mine=True)
            .execute()
        )
        items = channels.get("items", [])
        if items:
            youtube_channel_id = items[0]["id"]
    except Exception:
        pass

    expires_in = tokens.get("expires_in", 3600)
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=int(expires_in))

    upsert_credentials(
        user_id,
        {
            "google_email": google_email,
            "refresh_token": refresh_token,
            "access_token": access_token,
            "token_expires_at": expires_at.isoformat(),
            "youtube_channel_id": youtube_channel_id,
            "connected_at": datetime.now(timezone.utc).isoformat(),
        },
    )

    return user_id


def get_connection_status(user_id: str) -> dict:
    row = get_credentials(user_id)
    if not row:
        return {"connected": False}

    return {
        "connected": True,
        "google_email": row.get("google_email"),
        "youtube_channel_id": row.get("youtube_channel_id"),
        "connected_at": row.get("connected_at"),
    }


def disconnect(user_id: str) -> None:
    delete_credentials(user_id)


def get_google_credentials(user_id: str) -> Credentials:
    row = get_credentials(user_id)
    if not row or not row.get("refresh_token"):
        raise HTTPException(
            status_code=403,
            detail="No hay cuenta de YouTube Analytics conectada. Conéctala en Ajustes.",
        )

    settings = get_settings()
    creds = Credentials(
        token=row.get("access_token"),
        refresh_token=row["refresh_token"],
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings["google_client_id"],
        client_secret=settings["google_client_secret"],
        scopes=YOUTUBE_SCOPES,
    )

    if not creds.valid:
        creds.refresh(Request())
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=3600)
        upsert_credentials(
            user_id,
            {
                "access_token": creds.token,
                "token_expires_at": expires_at.isoformat(),
            },
        )

    return creds
