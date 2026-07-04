"""Utilidades compartidas para fusionar enriquecimiento LLM con análisis base."""
from __future__ import annotations

from typing import Optional

from app.nlp.resonance import apply_resonance_to_result

ENGAGEMENT_TO_CATEGORY = {
    "question": "pregunta",
    "suggestion": "sugerencia",
    "problem": "problema",
    "support": "elogio",
    "criticism": "problema",
    "resonance": "otro",
    "neutral": "otro",
}


def _content_sentiment_from_engagement(engagement: str, sentiment: str) -> str:
    if engagement == "resonance":
        return "positive"
    if engagement == "support":
        return "positive"
    if engagement in ("criticism", "problem"):
        return "negative"
    if engagement == "suggestion":
        return "positive" if sentiment != "negative" else "neutral"
    return sentiment


def attach_batch_ids(batch: list[dict], batch_results: list[dict]) -> list[dict]:
    """Resuelve índices de lote (0-based o 1-based) al id real del comentario."""
    enriched: list[dict] = []
    for item in batch_results:
        row = dict(item)
        local_idx = row.get("index")
        comment_id = row.get("id")

        if not comment_id and isinstance(local_idx, int):
            if 0 <= local_idx < len(batch):
                comment_id = batch[local_idx]["id"]
            elif 1 <= local_idx <= len(batch):
                comment_id = batch[local_idx - 1]["id"]

        if comment_id:
            row["id"] = comment_id
            enriched.append(row)
    return enriched


def merge_llm_enrichment(
    base_analysis: dict,
    llm_analysis: dict,
    comment_text: str,
    video_title: Optional[str] = None,
    source_prefix: str = "",
) -> dict:
    """Combina análisis heurístico con campos del LLM y recalcula resonancia."""
    if not llm_analysis:
        return base_analysis

    refined = base_analysis.copy()
    sentiment = llm_analysis.get("sentiment")
    engagement = llm_analysis.get("engagement_type")
    topic = llm_analysis.get("topic", "")

    if sentiment:
        if source_prefix:
            refined[f"sentiment_{source_prefix}"] = sentiment
        refined["sentiment"] = sentiment

    if engagement:
        if source_prefix:
            refined[f"engagement_type_{source_prefix}"] = engagement
        refined["engagement_type"] = engagement
        refined["category"] = ENGAGEMENT_TO_CATEGORY.get(engagement, refined.get("category", "otro"))
        refined["content_sentiment"] = _content_sentiment_from_engagement(
            engagement, refined.get("sentiment", "neutral")
        )
        refined["is_resonance"] = engagement == "resonance"

    if topic:
        if source_prefix:
            refined[f"topic_{source_prefix}"] = topic
        refined["topic"] = topic

    if llm_analysis.get("relevance"):
        key = f"relevance_{source_prefix}" if source_prefix else "relevance"
        refined[key] = llm_analysis.get("relevance")

    if llm_analysis.get("intent"):
        key = f"intent_{source_prefix}" if source_prefix else "intent"
        refined[key] = llm_analysis.get("intent")

    if llm_analysis.get("key_phrase"):
        refined["key_phrase"] = llm_analysis.get("key_phrase")

    if not engagement:
        return apply_resonance_to_result(refined, comment_text, video_title)

    return refined


def extract_topic_from_result(result: dict) -> str:
    return (
        result.get("topic")
        or result.get("topic_openai")
        or result.get("topic_gemini")
        or result.get("category")
        or "general"
    )
