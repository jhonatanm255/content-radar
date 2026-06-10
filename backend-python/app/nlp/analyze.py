from __future__ import annotations

from app.nlp.categorize import categorize_comment
from app.nlp.resonance import apply_resonance_to_result
from app.nlp.sentiment import analyze_sentiment_batch

BATCH_SIZE = 32


def analyze_comments_batch(
    comments: list[dict],
    video_title: str | None = None,
) -> tuple[list[dict], str]:
    """
    Analiza sentimiento (pysentimiento) + categoría (intención) por comentario.
    comments: [{ "id": str, "text": str }, ...]
    """
    if not comments:
        return [], "none"

    results: list[dict] = []
    engine_counts: dict[str, int] = {}

    for i in range(0, len(comments), BATCH_SIZE):
        chunk = comments[i : i + BATCH_SIZE]
        texts = [c["text"] for c in chunk]
        sentiments = analyze_sentiment_batch(texts)

        for comment, (sentiment, confidence, engine) in zip(chunk, sentiments):
            engine_counts[engine] = engine_counts.get(engine, 0) + 1
            base = {
                "id": comment["id"],
                "sentiment": sentiment,
                "sentiment_confidence": round(confidence, 3),
                "category": categorize_comment(comment["text"]),
            }
            title = comment.get("video_title") or video_title
            results.append(apply_resonance_to_result(base, comment["text"], title))

    primary_engine = max(engine_counts, key=engine_counts.get) if engine_counts else "heuristic"
    return results, primary_engine
