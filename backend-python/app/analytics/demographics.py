from __future__ import annotations

import logging
from datetime import date, timedelta

from googleapiclient.discovery import build
from fastapi import HTTPException
import google.auth.exceptions

from app.auth.youtube_oauth import get_google_credentials, get_connection_status

logger = logging.getLogger(__name__)

AGE_LABELS = {
    "age13-17": "13-17 años",
    "age18-24": "18-24 años",
    "age25-34": "25-34 años",
    "age35-44": "35-44 años",
    "age45-54": "45-54 años",
    "age55-64": "55-64 años",
    "age65-": "65+ años",
}

GENDER_LABELS = {
    "female": "Mujeres",
    "male": "Hombres",
    "user_specified": "Otro / no especificado",
}

COUNTRY_NAMES = {
    "MX": "México",
    "ES": "España",
    "AR": "Argentina",
    "CO": "Colombia",
    "CL": "Chile",
    "PE": "Perú",
    "US": "Estados Unidos",
    "VE": "Venezuela",
    "EC": "Ecuador",
    "BO": "Bolivia",
    "UY": "Uruguay",
    "PY": "Paraguay",
    "CR": "Costa Rica",
    "PA": "Panamá",
    "GT": "Guatemala",
    "DO": "Rep. Dominicana",
    "BR": "Brasil",
}


def _date_range(days: int) -> tuple[str, str]:
    end = date.today()
    start = end - timedelta(days=days)
    return start.isoformat(), end.isoformat()


def _default_dates() -> tuple[str, str]:
    return _date_range(28)


def _query_report(analytics, dimensions: str, metrics: str, start_date: str, end_date: str):
    return (
        analytics.reports()
        .query(
            ids="channel==MINE",
            startDate=start_date,
            endDate=end_date,
            dimensions=dimensions,
            metrics=metrics,
            sort=f"-{metrics.split(',')[0]}",
        )
        .execute()
    )


def _parse_rows(response: dict) -> list[dict]:
    headers = [h["name"] for h in response.get("columnHeaders", [])]
    rows = []
    for row in response.get("rows", []):
        item = {}
        for i, value in enumerate(row):
            if i < len(headers):
                item[headers[i]] = value
        rows.append(item)
    return rows


def _fetch_channel_info(creds) -> dict:
    youtube = build("youtube", "v3", credentials=creds)
    response = (
        youtube.channels()
        .list(part="snippet,statistics", mine=True)
        .execute()
    )
    items = response.get("items", [])
    if not items:
        return {"youtube_channel_id": None, "youtube_channel_title": None, "subscriber_count": 0}

    item = items[0]
    return {
        "youtube_channel_id": item.get("id"),
        "youtube_channel_title": item.get("snippet", {}).get("title"),
        "subscriber_count": int(item.get("statistics", {}).get("subscriberCount", 0)),
    }


def _build_demographics_payload(
    analytics,
    start_date: str,
    end_date: str,
) -> dict:
    age_gender_resp = _query_report(
        analytics, "ageGroup,gender", "viewerPercentage", start_date, end_date
    )
    country_resp = _query_report(analytics, "country", "views", start_date, end_date)
    device_resp = _query_report(analytics, "deviceType", "views", start_date, end_date)

    age_groups: dict[str, float] = {}
    genders: dict[str, float] = {}

    age_gender_rows = _parse_rows(age_gender_resp)
    for row in age_gender_rows:
        age = row.get("ageGroup", "")
        gender = row.get("gender", "")
        pct = float(row.get("viewerPercentage", 0))
        if age:
            age_groups[age] = age_groups.get(age, 0) + pct
        if gender:
            genders[gender] = genders.get(gender, 0) + pct

    countries_raw = _parse_rows(country_resp)
    total_country_views = sum(float(r.get("views", 0)) for r in countries_raw)
    countries = []
    for row in countries_raw[:10]:
        code = row.get("country", "")
        views = int(float(row.get("views", 0)))
        countries.append(
            {
                "code": code,
                "name": COUNTRY_NAMES.get(code, code),
                "views": views,
                "percentage": round((views / total_country_views) * 100, 1) if total_country_views else 0,
            }
        )

    devices_raw = _parse_rows(device_resp)
    total_device_views = sum(float(r.get("views", 0)) for r in devices_raw)
    devices = []
    for row in devices_raw:
        device = row.get("deviceType", "")
        views = int(float(row.get("views", 0)))
        devices.append(
            {
                "type": device,
                "label": {
                    "MOBILE": "Móvil",
                    "DESKTOP": "Escritorio",
                    "TABLET": "Tablet",
                    "TV": "TV",
                    "GAME_CONSOLE": "Consola",
                    "UNKNOWN": "Desconocido",
                }.get(device, device),
                "views": views,
                "percentage": round((views / total_device_views) * 100, 1) if total_device_views else 0,
            }
        )

    return {
        "start_date": start_date,
        "end_date": end_date,
        "age_groups": [
            {
                "key": key,
                "label": AGE_LABELS.get(key, key),
                "percentage": round(value, 1),
            }
            for key, value in sorted(age_groups.items(), key=lambda x: -x[1])
        ],
        "genders": [
            {
                "key": key,
                "label": GENDER_LABELS.get(key, key),
                "percentage": round(value, 1),
            }
            for key, value in sorted(genders.items(), key=lambda x: -x[1])
        ],
        "countries": countries,
        "devices": sorted(devices, key=lambda x: -x["percentage"]),
        "total_views": int(total_country_views),
        "has_demographics": bool(age_groups or genders),
        "has_data": bool(age_groups or genders or countries or devices),
        "_row_counts": {
            "age_gender": len(age_gender_rows),
            "countries": len(countries_raw),
            "devices": len(devices_raw),
        },
    }


def _build_message(payload: dict, channel_info: dict) -> str | None:
    if not channel_info.get("youtube_channel_id"):
        return (
            "La cuenta Google conectada no tiene un canal de YouTube asociado. "
            "Conecta con la cuenta dueña del canal."
        )

    if not payload["has_data"]:
        return (
            "YouTube Analytics no devolvió datos en este período. Suele pasar si: "
            "(1) la cuenta conectada no es la dueña del canal que analizas, "
            "(2) el canal tuvo pocas o ninguna vista en esas fechas, o "
            "(3) el canal es muy nuevo. Prueba ampliar el rango de fechas."
        )

    if not payload["has_demographics"] and (payload["countries"] or payload["devices"]):
        return (
            "YouTube oculta edad y género por políticas de privacidad cuando no hay "
            "suficientes espectadores (común en canales pequeños o contenido infantil). "
            "Países y dispositivos sí están disponibles abajo."
        )

    if payload["total_views"] == 0:
        return "Hay registros pero con 0 vistas en el período seleccionado."

    return None


def fetch_demographics(user_id: str, start_date: str | None = None, end_date: str | None = None) -> dict:
    try:
        creds = get_google_credentials(user_id)
        analytics = build("youtubeAnalytics", "v2", credentials=creds)
        channel_info = _fetch_channel_info(creds)
    except google.auth.exceptions.RefreshError:
        # Refresh token expired or revoked
        raise HTTPException(status_code=401, detail="YouTube credentials expired or revoked. Please reauthorize the account.")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    oauth_status = get_connection_status(user_id)

    # Ampliar rango automáticamente si el período pedido viene vacío
    ranges_days = []
    if start_date and end_date:
        ranges_days.append((start_date, end_date))
    else:
        for days in (28, 90, 365):
            ranges_days.append(_date_range(days))

    payload = None
    for range_start, range_end in ranges_days:
        try:
            candidate = _build_demographics_payload(analytics, range_start, range_end)
            logger.info(
                "Demographics user=%s range=%s..%s rows=%s views=%s",
                user_id,
                range_start,
                range_end,
                candidate["_row_counts"],
                candidate["total_views"],
            )
            if candidate["has_data"] or range_start == ranges_days[-1][0]:
                payload = candidate
                if candidate["has_data"]:
                    break
        except google.auth.exceptions.RefreshError:
            # If credentials expire while querying
            logger.warning("Demographics query failed due to expired credentials for %s..%s", range_start, range_end)
            raise HTTPException(status_code=401, detail="YouTube credentials expired or revoked. Please reauthorize the account.")
        except Exception as exc:
            logger.warning("Demographics query failed for %s..%s: %s", range_start, range_end, exc)
            if range_start == ranges_days[-1][0]:
                raise

    if payload is None:
        start, end = _default_dates()
        payload = _build_demographics_payload(analytics, start, end)

    payload.pop("_row_counts", None)
    message = _build_message(payload, channel_info)

    return {
        **payload,
        "youtube_channel_id": channel_info.get("youtube_channel_id") or oauth_status.get("youtube_channel_id"),
        "youtube_channel_title": channel_info.get("youtube_channel_title"),
        "google_email": oauth_status.get("google_email"),
        "message": message,
    }
