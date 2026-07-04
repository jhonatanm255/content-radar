from __future__ import annotations

import logging
import math
from app.nlp.categorize import categorize_comment
from app.nlp.resonance import apply_resonance_to_result
from app.nlp.sentiment import analyze_sentiment_batch
from app.nlp.gemini_analysis import batch_analyze_with_context as batch_analyze_with_gemini
from app.nlp.openai_analysis import batch_analyze_with_context as batch_analyze_with_openai, has_openai_key
from app.nlp.llm_enrichment import merge_llm_enrichment
from app.nlp.alerts import generate_alerts, generate_short_requests

logger = logging.getLogger(__name__)

BATCH_SIZE = 32


def analyze_comments_batch(
    comments: list[dict],
    video_title: str | None = None,
    video_context: str | None = None,
) -> tuple[list[dict], str, list, list, str]:
    """
    Analiza sentimiento (pysentimiento) + categoría (intención) por comentario.
    Si video_context está disponible, también usa Deep Seek o Gemini para análisis contextual.
    
    Returns: (results, engine, alerts, short_requests, analysis_report)
    """
    if not comments:
        return [], "none", [], [], ""

    results: list[dict] = []
    engine_counts: dict[str, int] = {}

    # Paso 1: Análisis base con heurísticas
    for i in range(0, len(comments), BATCH_SIZE):
        chunk = comments[i : i + BATCH_SIZE]
        texts = [c["text"] for c in chunk]
        sentiments = analyze_sentiment_batch(texts)

        for comment, (sentiment, confidence, engine) in zip(chunk, sentiments):
            engine_counts[engine] = engine_counts.get(engine, 0) + 1
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

    analysis_report = ""
    deepseek_succeeded = False

    # Paso 2: Enriquecimiento con IA contextual si hay contexto o título
    effective_context = video_context or video_title or ""
    
    if effective_context and len(results) > 0:
        comments_for_llm = [{"id": c["id"], "text": c["text"]} for c in comments]
        results_by_id = {r["id"]: i for i, r in enumerate(results)}

        if has_openai_key():
            try:
                logger.info(f"Enriqueciendo análisis de {len(results)} comentarios con Deep Seek...")
                openai_results, report = batch_analyze_with_openai(
                    comments_for_llm,
                    effective_context,
                    video_title,
                )
                
                if openai_results:
                    analysis_report = report
                    deepseek_succeeded = True
                    logger.info("✓ Deep Seek enriquecimiento completado")

                    for orr in openai_results:
                        comment_id = orr.get("id")
                        if not comment_id or comment_id not in results_by_id:
                            continue
                        idx = results_by_id[comment_id]
                        results[idx] = merge_llm_enrichment(
                            results[idx],
                            orr,
                            comments[idx]["text"],
                            video_title,
                            source_prefix="openai",
                        )
                else:
                    logger.warning("Deep Seek devolvió resultados vacíos, intentando Gemini...")
            except Exception as e:
                logger.warning(f"Error en enriquecimiento con Deep Seek: {str(e)}")
        
        if not deepseek_succeeded:
            try:
                logger.info("Intentando enriquecimiento con Gemini como fallback...")
                gemini_results, report = batch_analyze_with_gemini(
                    comments_for_llm,
                    effective_context,
                    video_title,
                )
                
                if gemini_results:
                    analysis_report = report
                    logger.info("✓ Gemini enriquecimiento completado")

                    for gr in gemini_results:
                        comment_id = gr.get("id")
                        if not comment_id or comment_id not in results_by_id:
                            continue
                        idx = results_by_id[comment_id]
                        results[idx] = merge_llm_enrichment(
                            results[idx],
                            gr,
                            comments[idx]["text"],
                            video_title,
                            source_prefix="gemini",
                        )
            except Exception as e:
                logger.warning(f"Error en enriquecimiento con Gemini: {str(e)}")

    primary_engine = "heuristic"
    
    if effective_context and len(results) > 0:
        if deepseek_succeeded:
            primary_engine = "deepseek-chat"
            logger.info("✓ Motor principal: deepseek-chat")
        elif any("sentiment_gemini" in r or "engagement_type_gemini" in r for r in results):
            primary_engine = "gemini"
            logger.info("✓ Motor principal: gemini (Deep Seek falló)")
        else:
            primary_engine = "heuristic"
            logger.info("✓ Motor principal: heuristic (sin enriquecimiento)")
    else:
        primary_engine = "heuristic"
        logger.info("✓ Motor principal: heuristic (sin contexto de video)")

    alerts = generate_alerts(results)
    short_requests = generate_short_requests(results)

    return results, primary_engine, alerts, short_requests, analysis_report
