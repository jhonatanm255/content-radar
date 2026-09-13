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

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{settings['supabase_url']}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": settings["supabase_anon_key"],
                },
            )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Tiempo de espera agotado al verificar sesión")
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="No se pudo conectar con el servicio de autenticación")
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Error de red al verificar sesión: {exc}")

    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Sesión inválida o expirada")

    try:
        data = response.json()
    except Exception:
        raise HTTPException(status_code=502, detail="Respuesta inválida del servicio de autenticación")

    user_id = data.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Usuario no encontrado en la sesión")

    return user_id
