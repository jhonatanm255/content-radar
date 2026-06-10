from __future__ import annotations

import re
import unicodedata
from typing import Literal

Category = Literal["pregunta", "sugerencia", "problema", "elogio", "otro"]

POSITIVE_EMOJIS = re.compile(r"[❤️💕😍🔥🥰✨⭐🌟👏🙌💯😊🎉🎂]", re.UNICODE)
NEGATIVE_EMOJIS = re.compile(r"[💀😡🤮👎😤]", re.UNICODE)

QUESTION_STARTERS = [
    "que es",
    "q es",
    "k es",
    "que significa",
    "como se",
    "como puedo",
    "cuando es",
    "cuando sale",
    "donde esta",
    "quien es",
    "qn es",
    "qn sera",
    "alguien sabe",
    "saben que",
    "sabes que",
    "me pueden",
    "podrian",
    "pueden decir",
    "por que",
    "pq ",
    "pa que",
    "para que",
]

PRAISE_PHRASES = [
    "te amo", "me encanta", "buen video", "buen contenido", "gracias", "crack",
    "fav", "feliz cumple", "bendiciones", "hermoso", "increible", "genial",
    "espectacular", "sub", "suscrib", "apoyo", "saludos", "joya", "buenisimo",
]

PROBLEM_PHRASES = [
    "no funciona", "no me sale", "no sirve", "error", "bug", "problema",
    "fallo", "roto", "clickbait", "mentira", "fake", "estafa", "no entiendo", "no carga",
]

SUGGESTION_PHRASES = [
    "sugiero", "deberias", "haz un video", "haz un", "hacer un video",
    "podrias hacer", "me gustaria que", "estaria bueno", "habla de",
    "hablen de", "sube un video", "sube video", "proximo video",
]


def normalize_comment_text(text: str) -> str:
    normalized = unicodedata.normalize("NFD", text.lower())
    normalized = "".join(c for c in normalized if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", normalized).strip()


def contains_phrase(text: str, phrase: str) -> bool:
    normalized = normalize_comment_text(text)
    term = normalize_comment_text(phrase)
    if not term:
        return False
    pattern = rf"(?:^|[\s.,!?;:'\"¿¡()\[\]-]){re.escape(term)}(?:$|[\s.,!?;:'\"¿¡()\[\]-])"
    return bool(re.search(pattern, f" {normalized} "))


def looks_like_question(text: str) -> bool:
    trimmed = text.strip()
    if len(trimmed) > 220 and not trimmed.endswith("?"):
        return False
    if trimmed.endswith("?") and len(trimmed) <= 180:
        return True
    if "?" in trimmed and len(trimmed) <= 150:
        return True
    normalized = normalize_comment_text(trimmed)
    return any(normalized.startswith(s) or contains_phrase(trimmed, s) for s in QUESTION_STARTERS)


def categorize_comment(text: str) -> Category:
    trimmed = text.strip()
    normalized = normalize_comment_text(text)

    if any(contains_phrase(text, p) for p in PRAISE_PHRASES) or (
        len(trimmed) < 80 and POSITIVE_EMOJIS.search(text)
    ):
        return "elogio"

    if any(contains_phrase(text, p) for p in PROBLEM_PHRASES):
        return "problema"

    if looks_like_question(text):
        return "pregunta"

    if any(contains_phrase(text, p) for p in SUGGESTION_PHRASES):
        return "sugerencia"

    if len(normalized) > 100 and "?" not in trimmed:
        return "otro"

    return "otro"
