from __future__ import annotations

import logging
from datetime import date, timedelta

from googleapiclient.discovery import build

from app.auth.youtube_oauth import get_google_credentials

logger = logging.getLogger(__name__)


def _default_dates() -> tuple[str, str]:
    end = date.today()
    start = end - timedelta(days=365)
    return start.isoformat(), end.isoformat()


def fetch_video_engagement(
    user_id: str,
    start_date: str | None = None,
    end_date: str | None = None,
) -> dict:
    """Likes y dislikes por video del canal conectado (YouTube Analytics)."""
    if not start_date or not end_date:
        start_date, end_date = _default_dates()

    creds = get_google_credentials(user_id)
    analytics = build("youtubeAnalytics", "v2", credentials=creds)

    response = (
        analytics.reports()
        .query(
            ids="channel==MINE",
            startDate=start_date,
            endDate=end_date,
            dimensions="video",
            metrics="likes,dislikes,views",
            sort="-views",
            maxResults=200,
        )
        .execute()
    )

    headers = [h["name"] for h in response.get("columnHeaders", [])]
    videos: list[dict] = []
    total_likes = 0
    total_dislikes = 0

    for row in response.get("rows", []):
        item = {headers[i]: row[i] for i in range(min(len(headers), len(row)))}
        likes = int(float(item.get("likes", 0)))
        dislikes = int(float(item.get("dislikes", 0)))
        views = int(float(item.get("views", 0)))
        video_id = str(item.get("video", ""))
        if not video_id:
            continue
        total_likes += likes
        total_dislikes += dislikes
        videos.append(
            {
                "youtube_video_id": video_id,
                "likes": likes,
                "dislikes": dislikes,
                "views": views,
            }
        )

    logger.info(
        "Video engagement user=%s videos=%s likes=%s dislikes=%s",
        user_id,
        len(videos),
        total_likes,
        total_dislikes,
    )

    return {
        "start_date": start_date,
        "end_date": end_date,
        "total_likes": total_likes,
        "total_dislikes": total_dislikes,
        "videos": videos,
    }
