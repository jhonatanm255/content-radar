from __future__ import annotations

from typing import Optional

import httpx
from fastapi import HTTPException

from app.config import get_settings


async def get_user_id_from_token(authorization: Optional[str]) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token de autenticación requerido")

    token = authorization.removeprefix("Bearer ").strip()
    settings = get_settings()

    if not settings["supabase_url"] or not settings["supabase_anon_key"]:
        raise HTTPException(status_code=500, detail="Supabase no configurado en el backend")

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{settings['supabase_url']}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": settings["supabase_anon_key"],
            },
        )

    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Sesión inválida o expirada")

    data = response.json()
    user_id = data.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Usuario no encontrado en la sesión")

    return user_id
