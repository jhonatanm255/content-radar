from __future__ import annotations

import asyncio
import logging
import math
import os
from typing import Callable, Optional

from app.config import is_llm_only_mode
from app.nlp.alerts import generate_alerts, generate_short_requests
from app.nlp.categorize import categorize_comment
from app.nlp.comment_dedup import cluster_comments_for_llm
from app.nlp.gemini_analysis import batch_analyze_with_context as batch_analyze_with_gemini
from app.nlp.gemini_analysis import has_gemini_key
from app.nlp.llm_enrichment import merge_llm_enrichment
from app.nlp.openai_analysis import batch_analyze_with_context as batch_analyze_with_openai
from app.nlp.openai_analysis import has_openai_key
from app.nlp.resonance import apply_resonance_to_result
from app.nlp.sentiment import analyze_sentiment_batch

logger = logging.getLogger(__name__)

BATCH_SIZE = 32


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name, str(default)).strip()
    try:
        return int(raw)
    except ValueError:
        return default


def _env_float(name: str, default: float) -> float:
    raw = os.getenv(name, str(default)).strip()
    try:
        return float(raw)
    except ValueError:
        return default


def _dedup_enabled() -> bool:
    return os.getenv("COMMENT_DEDUP_ENABLED", "true").strip().lower() in {"1", "true", "yes", "on"}


def _apply_llm_to_cluster(
    results: list[dict],
    results_by_id: dict[str, int],
    comments_by_id: dict[str, dict],
    member_ids_by_rep: dict[str, list[str]],
    llm_row: dict,
    video_title: str | None,
    source_prefix: str,
) -> None:
    rep_id = llm_row.get("id")
    if not rep_id:
        return

    member_ids = member_ids_by_rep.get(rep_id, [rep_id])
    for member_id in member_ids:
        idx = results_by_id.get(member_id)
        if idx is None:
            continue
        comment_text = comments_by_id[member_id]["text"]
        results[idx] = merge_llm_enrichment(
            results[idx],
            llm_row,
            comment_text,
            video_title,
            source_prefix=source_prefix,
        )


async def _run_llm_enrichment(
    comments: list[dict],
    results: list[dict],
    results_by_id: dict[str, int],
    *,
    video_title: str | None,
    effective_context: str,
) -> tuple[str, str, bool, dict]:
    logger.info("[ASYNC] Iniciando _run_llm_enrichment...")
    comments_by_id = {comment["id"]: comment for comment in comments}
    comments_for_llm = [{"id": c["id"], "text": c["text"]} for c in comments]
    member_ids_by_rep: dict[str, list[str]] = {c["id"]: [c["id"]] for c in comments_for_llm}
    dedup_stats: dict = {}

    if _dedup_enabled() and len(comments_for_llm) > 1:
        representatives, member_ids_by_rep, stats = cluster_comments_for_llm(
            comments_for_llm,
            similarity_threshold=_env_float("COMMENT_DEDUP_SIMILARITY", 0.88),
        )
        dedup_stats = dict(stats)
        logger.info(
            "Dedup LLM: %s comentarios -> %s representantes (exact=%s, fuzzy=%s)",
            stats["input_count"],
            stats["representative_count"],
            stats["exact_duplicate_groups"],
            stats["fuzzy_clusters"],
        )
        comments_for_llm = representatives

    analysis_report = ""
    deepseek_succeeded = False
    llm_batch_size = _env_int("LLM_BATCH_SIZE", 40)

    if has_openai_key():
        try:
            logger.info("Enriqueciendo %s representantes con Deep Seek...", len(comments_for_llm))
            openai_results, report = await batch_analyze_with_openai(
                comments_for_llm,
                effective_context,
                video_title,
                max_batch=llm_batch_size,
            )
            if openai_results:
                analysis_report = report
                deepseek_succeeded = True
                for llm_row in openai_results:
                    _apply_llm_to_cluster(
                        results,
                        results_by_id,
                        comments_by_id,
                        member_ids_by_rep,
                        llm_row,
                        video_title,
                        "openai",
                    )
        except Exception as exc:
            logger.warning("Error en enriquecimiento con Deep Seek: %s", exc)

    if not deepseek_succeeded:
        try:
            logger.info("Enriqueciendo %s representantes con Gemini...", len(comments_for_llm))
            gemini_results, report = await batch_analyze_with_gemini(
                comments_for_llm,
                effective_context,
                video_title,
                max_batch=llm_batch_size,
            )
            if gemini_results:
                analysis_report = report
                for llm_row in gemini_results:
                    _apply_llm_to_cluster(
                        results,
                        results_by_id,
                        comments_by_id,
                        member_ids_by_rep,
                        llm_row,
                        video_title,
                        "gemini",
                    )
        except Exception as exc:
            logger.warning("Error en enriquecimiento con Gemini: %s", exc)

    primary_engine = "heuristic"
    if deepseek_succeeded:
        primary_engine = "deepseek-chat"
    elif any("sentiment_gemini" in row or "engagement_type_gemini" in row for row in results):
        primary_engine = "gemini"

    return primary_engine, analysis_report, deepseek_succeeded, dedup_stats


async def _build_base_results(
    comments: list[dict],
    video_title: str | None,
    on_progress: Optional[Callable[[str, float], None]] = None,
) -> list[dict]:
    logger.info("[ASYNC] Iniciando _build_base_results (con to_thread para inferencia)...")
    results: list[dict] = []
    total = len(comments)
    for i in range(0, total, BATCH_SIZE):
        chunk = comments[i : i + BATCH_SIZE]
        texts = [comment["text"] for comment in chunk]
        # analyze_sentiment_batch puede ser CPU-bound (pysentimiento), ejecutar en hilo
        sentiments = await asyncio.to_thread(analyze_sentiment_batch, texts)

        for comment, (sentiment, confidence, _engine) in zip(chunk, sentiments):
            safe_confidence = confidence if isinstance(confidence, float) and math.isfinite(confidence) else 0.0
            base = {
                "id": comment["id"],
                "text": comment["text"],
                "sentiment": sentiment,
                "sentiment_confidence": round(safe_confidence, 3),
                "category": categorize_comment(comment["text"]),
            }
            title = comment.get("video_title") or video_title
            results.append(apply_resonance_to_result(base, comment["text"], title))

        if on_progress and total > 0:
            progress = min(0.55, 0.1 + (min(i + len(chunk), total) / total) * 0.45)
            on_progress("Análisis base de comentarios", progress)

    return results


def _build_stub_results(comments: list[dict], video_title: str | None) -> list[dict]:
    """Resultados mínimos antes del enriquecimiento LLM (modo NLP_MODE=llm)."""
    results: list[dict] = []
    for comment in comments:
        base = {
            "id": comment["id"],
            "text": comment["text"],
            "sentiment": "neutral",
            "sentiment_confidence": 0.5,
            "category": categorize_comment(comment["text"]),
        }
        title = comment.get("video_title") or video_title
        results.append(apply_resonance_to_result(base, comment["text"], title))
    return results


async def analyze_comments_batch(
    comments: list[dict],
    video_title: str | None = None,
    video_context: str | None = None,
    on_progress: Optional[Callable[[str, float], None]] = None,
) -> tuple[list[dict], str, list, list, str, dict]:
    logger.info("[ASYNC] Ejecutando analyze_comments_batch...")
    if not comments:
        return [], "none", [], [], "", {}

    if on_progress:
        on_progress("Preparando comentarios", 0.05)

    use_llm_primary = is_llm_only_mode() and (has_openai_key() or has_gemini_key())
    if use_llm_primary:
        results = _build_stub_results(comments, video_title)
    else:
        results = await _build_base_results(comments, video_title, on_progress)
    results_by_id = {row["id"]: index for index, row in enumerate(results)}

    effective_context = (video_context or video_title or "").strip()
    analysis_report = ""
    primary_engine = "heuristic"
    dedup_stats: dict = {}

    llm_context = effective_context or (video_title if use_llm_primary else "")
    if llm_context:
        if on_progress:
            on_progress("Enriquecimiento con IA", 0.6)
        primary_engine, analysis_report, _, dedup_stats = await _run_llm_enrichment(
            comments,
            results,
            results_by_id,
            video_title=video_title,
            effective_context=llm_context,
        )

    if on_progress:
        on_progress("Generando alertas", 0.9)

    alerts = generate_alerts(results)
    short_requests = generate_short_requests(results)
    return results, primary_engine, alerts, short_requests, analysis_report, dedup_stats
