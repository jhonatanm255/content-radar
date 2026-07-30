from __future__ import annotations

from typing import Callable, Optional

from app.nlp.analyze import analyze_comments_batch
from app.nlp.strategic_analysis import generate_strategic_report
import logging

logger = logging.getLogger(__name__)


async def run_comment_analysis(
    *,
    comments: list[dict],
    video_title: Optional[str],
    video_context: Optional[str],
    video_id: Optional[str],
    channel_name: Optional[str],
    include_strategic: bool,
    on_progress: Optional[Callable[[str, float], None]] = None,
) -> dict:
    logger.info("[ASYNC] Iniciando run_comment_analysis asíncrono...")
    results, engine, alerts, short_requests, analysis_report, dedup_stats = await analyze_comments_batch(
        comments,
        video_title=video_title,
        video_context=video_context,
        on_progress=on_progress,
    )

    strategic_report = None
    if include_strategic:
        if on_progress:
            on_progress("Generando reporte estratégico", 0.92)
        try:
            strategic_report = await generate_strategic_report(
                comments=comments,
                video_title=video_title or "Video sin título",
                channel_name=channel_name or "Content Radar User",
                video_id=video_id,
                analysis_results=results,
                video_context=video_context,
            )
        except Exception:
            strategic_report = None

    if on_progress:
        on_progress("Finalizando", 0.98)

    return {
        "results": results,
        "engine": engine,
        "count": len(results),
        "alerts": alerts,
        "short_requests": short_requests,
        "analysis_report": analysis_report,
        "strategic_report": strategic_report,
        "dedup_stats": dedup_stats,
    }
