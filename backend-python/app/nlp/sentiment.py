from __future__ import annotations

import logging
import math
import re
from typing import Literal, Optional

logger = logging.getLogger(__name__)

Sentiment = Literal["positive", "neutral", "negative"]

_analyzer = None
_analyzer_available: Optional[bool] = None

POSITIVE_EMOJIS = re.compile(r"[❤️💕😍🔥🥰✨⭐🌟👏🙌💯😊🎉🎂]", re.UNICODE)
NEGATIVE_EMOJIS = re.compile(r"[💀😡🤮👎😤]", re.UNICODE)


def _get_analyzer():
    global _analyzer, _analyzer_available
    if _analyzer_available is False:
        return None
    if _analyzer is not None:
        return _analyzer
    try:
        from pysentimiento import create_analyzer

        logger.info("Cargando modelo pysentimiento (sentiment, es)...")
        _analyzer = create_analyzer(task="sentiment", lang="es")
        _analyzer_available = True
        logger.info("Modelo pysentimiento listo.")
        return _analyzer
    except Exception as exc:
        logger.warning("pysentimiento no disponible, usando fallback: %s", exc)
        _analyzer_available = False
        return None


def _map_label(label: str) -> Sentiment:
    upper = label.upper()
    if upper in ("POS", "POSITIVE"):
        return "positive"
    if upper in ("NEG", "NEGATIVE"):
        return "negative"
    return "neutral"


def _safe_float(value: float, default: float = 0.75) -> float:
    try:
        result = float(value)
        return result if math.isfinite(result) else default
    except (TypeError, ValueError):
        return default


def _fallback_sentiment(text: str) -> tuple[Sentiment, float]:
    lower = text.lower()
    score = 0
    positive_words = ["te amo", "me encanta", "gracias", "genial", "buenisimo", "crack", "fav", "hermoso"]
    negative_words = ["malo", "no funciona", "error", "basura", "peor", "clickbait", "fake", "trash"]
    for w in positive_words:
        if w in lower:
            score += 2
    for w in negative_words:
        if w in lower:
            score -= 2
    if POSITIVE_EMOJIS.search(text):
        score += 2
    if NEGATIVE_EMOJIS.search(text):
        score -= 2
    if score >= 2:
        return "positive", 0.6
    if score <= -2:
        return "negative", 0.6
    return "neutral", 0.5


def get_sentiment_engine_name() -> str:
    return "pysentimiento" if _get_analyzer() else "heuristic"


def analyze_sentiment(text: str) -> tuple[Sentiment, float, str]:
    analyzer = _get_analyzer()
    if analyzer is None:
        sentiment, conf = _fallback_sentiment(text)
        return sentiment, conf, "heuristic"

    try:
        result = analyzer.predict(text)
        label = result.output if hasattr(result, "output") else str(result)
        probs = getattr(result, "probas", {}) or {}
        mapped = _map_label(label)
        confidence = _safe_float(float(max(probs.values())) if probs else 0.75)
        return mapped, confidence, "pysentimiento"
    except Exception as exc:
        logger.warning("Error pysentimiento, fallback: %s", exc)
        sentiment, conf = _fallback_sentiment(text)
        return sentiment, conf, "heuristic"


def analyze_sentiment_batch(texts: list[str]) -> list[tuple[Sentiment, float, str]]:
    analyzer = _get_analyzer()
    if analyzer is None or not texts:
        return [_fallback_sentiment(t) + ("heuristic",) for t in texts]

    try:
        results = analyzer.predict(texts)
        if not isinstance(results, list):
            results = [results]
        output = []
        for result in results:
            label = result.output if hasattr(result, "output") else str(result)
            probs = getattr(result, "probas", {}) or {}
            mapped = _map_label(label)
            confidence = _safe_float(float(max(probs.values())) if probs else 0.75)
            output.append((mapped, confidence, "pysentimiento"))
        return output
    except Exception as exc:
        logger.warning("Batch pysentimiento falló, fallback: %s", exc)
        return [_fallback_sentiment(t) + ("heuristic",) for t in texts]
