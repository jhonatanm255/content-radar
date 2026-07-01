from __future__ import annotations

import logging
import math
from app.nlp.categorize import categorize_comment
from app.nlp.resonance import apply_resonance_to_result
from app.nlp.sentiment import analyze_sentiment_batch
from app.nlp.gemini_analysis import batch_analyze_with_context as batch_analyze_with_gemini, refine_analysis as refine_gemini_analysis
from app.nlp.openai_analysis import batch_analyze_with_context as batch_analyze_with_openai, refine_analysis as refine_openai_analysis, has_openai_key
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
    # Si no hay contexto pero hay título, usar título como contexto mínimo
    effective_context = video_context or video_title or ""
    
    if effective_context and len(results) > 0:
        if has_openai_key():
            try:
                logger.info(f"Enriqueciendo análisis de {len(results)} comentarios con Deep Seek...")
                comments_for_openai = [{"id": c["id"], "text": c["text"]} for c in comments]
                openai_results, report = batch_analyze_with_openai(
                    comments_for_openai,
                    effective_context,
                    video_title,
                )
                
                # Solo marcar como exitoso si hay resultados
                if openai_results:
                    analysis_report = report
                    deepseek_succeeded = True
                    logger.info(f"✓ Deep Seek enriquecimiento completado")

                    openai_map = {}
                    for orr in openai_results:
                        if "index" in orr:
                            idx = orr["index"]
                            if idx < len(comments):
                                comment_id = comments[idx]["id"]
                                openai_map[comment_id] = orr

                    for i, result in enumerate(results):
                        comment_id = result["id"]
                        if comment_id in openai_map:
                            openai_data = openai_map[comment_id]
                            results[i] = refine_openai_analysis(result, openai_data)
                else:
                    logger.warning(f"Deep Seek devolvió resultados vacíos, intentando Gemini...")
            except Exception as e:
                logger.warning(f"Error en enriquecimiento con Deep Seek: {str(e)}")
        
        # Fallback a Gemini si Deep Seek falló o no está disponible
        if not deepseek_succeeded:
            try:
                logger.info(f"Intentando enriquecimiento con Gemini como fallback...")
                comments_for_gemini = [{"id": c["id"], "text": c["text"]} for c in comments]
                gemini_results, report = batch_analyze_with_gemini(
                    comments_for_gemini,
                    effective_context,
                    video_title,
                )
                
                if gemini_results:
                    analysis_report = report
                    logger.info(f"✓ Gemini enriquecimiento completado")

                    gemini_map = {}
                    for gr in gemini_results:
                        if "index" in gr:
                            idx = gr["index"]
                            if idx < len(comments):
                                comment_id = comments[idx]["id"]
                                gemini_map[comment_id] = gr

                    for i, result in enumerate(results):
                        comment_id = result["id"]
                        if comment_id in gemini_map:
                            gemini_data = gemini_map[comment_id]
                            results[i] = refine_gemini_analysis(result, gemini_data)
            except Exception as e:
                logger.warning(f"Error en enriquecimiento con Gemini: {str(e)}")

    primary_engine = "heuristic"
    
    # Determinar el motor principal basado en enriquecimiento contextual
    if effective_context and len(results) > 0:
        if deepseek_succeeded:
            primary_engine = "deepseek-chat"
            logger.info(f"✓ Motor principal: deepseek-chat")
        else:
            # Fallback: verificar si Gemini tuvo éxito
            if any("sentiment_gemini" in r or "engagement_type_gemini" in r for r in results):
                primary_engine = "gemini"
                logger.info(f"✓ Motor principal: gemini (Deep Seek falló)")
            else:
                # Sin enriquecimiento exitoso
                primary_engine = "heuristic"
                logger.info(f"✓ Motor principal: heuristic (sin enriquecimiento)")
    else:
        primary_engine = "heuristic"
        logger.info(f"✓ Motor principal: heuristic (sin contexto de video)")

    # Generar alertas y resúmenes cortos
    alerts = generate_alerts(results)
    short_requests = generate_short_requests(results)

    return results, primary_engine, alerts, short_requests, analysis_report
