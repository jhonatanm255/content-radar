from __future__ import annotations

import re
import unicodedata
from typing import Literal, Optional

EngagementType = Literal[
    "resonance", "support", "criticism", "question", "suggestion", "problem", "neutral"
]

CRITICISM_PHRASES = [
    "no me gusta",
    "malo video",
    "mal video",
    "basura",
    "clickbait",
    "peor video",
    "no sirve",
    "odia",
    "hate",
    "cringe",
    "flop",
    "aburre",
    "mentira",
    "fake",
    "estafa",
]

TITLE_SLANG = [
    "escuelini",
    "escuela",
    "colegio",
    "celular",
    "celularcini",
    "mañana",
    "roblox",
    "rblx",
    "zepeto",
    "minecraft",
]

EMOJI_PATTERN = re.compile(
    r"[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F1E0-\U0001F1FF]+",
    re.UNICODE,
)


def normalize_text(text: str) -> str:
    normalized = unicodedata.normalize("NFD", text.lower())
    normalized = "".join(c for c in normalized if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", normalized).strip()


def _strip_emojis(text: str) -> str:
    return EMOJI_PATTERN.sub(" ", text).strip()


def _elongated_token(text: str) -> bool:
    cleaned = re.sub(r"[^\w]", "", normalize_text(text))
    if len(cleaned) < 3:
        return False
    if re.fullmatch(r"(no+|noo+|si+|sii+|ya+|bro+)", cleaned):
        return True
    collapsed = re.sub(r"(.)\1{2,}", r"\1", cleaned)
    return len(cleaned) >= 5 and len(set(collapsed)) <= 2


def _emoji_heavy_minimal(text: str) -> bool:
    without = _strip_emojis(text).strip()
    return len(without) <= 3 and len(text.strip()) >= 2


def extract_title_keywords(title: str) -> list[str]:
    normalized = normalize_text(_strip_emojis(title))
    words = [
        w
        for w in re.findall(r"[a-z0-9áéíóúñ]+", normalized)
        if len(w) >= 4 or w in TITLE_SLANG
    ]
    for slang in TITLE_SLANG:
        if slang in normalized and slang not in words:
            words.append(slang)
    if re.search(r"no{3,}", normalized):
        words.append("nooo")
    return list(dict.fromkeys(words))


def has_criticism(text: str) -> bool:
    normalized = normalize_text(text)
    return any(phrase in normalized for phrase in CRITICISM_PHRASES)


def echoes_video_title(text: str, title: Optional[str]) -> bool:
    if not title:
        return False

    text_norm = normalize_text(_strip_emojis(text))
    title_norm = normalize_text(_strip_emojis(title))

    if not text_norm and _emoji_heavy_minimal(text):
        return True

    keywords = extract_title_keywords(title)
    if keywords:
        matches = sum(1 for kw in keywords if kw in text_norm)
        if matches >= 1 and len(text_norm) <= 90:
            return True

    if re.search(r"no{3,}", text_norm) and re.search(r"no{3,}", title_norm):
        return True

    # Short comment mostly repeating title tokens
    if len(text_norm) <= 40:
        title_tokens = set(re.findall(r"[a-z0-9áéíóúñ]{3,}", title_norm))
        text_tokens = set(re.findall(r"[a-z0-9áéíóúñ]{3,}", text_norm))
        if text_tokens and text_tokens.issubset(title_tokens):
            return True

    return False


def is_resonance_comment(
    text: str,
    title: Optional[str],
    category: str,
) -> bool:
    if has_criticism(text):
        return False
    if category in ("problema", "pregunta", "sugerencia"):
        return False
    if category == "elogio":
        return False

    if echoes_video_title(text, title):
        return True
    if _elongated_token(text):
        return True
    if _emoji_heavy_minimal(text) and title:
        return True

    return False


def derive_hook_label(text: str, title: str) -> str:
    title_norm = normalize_text(_strip_emojis(title))
    keywords = extract_title_keywords(title)

    if any(k in ("escuelini", "escuela", "colegio") for k in keywords):
        return "Vuelta a clases / escuelini"
    if any(k in ("celular", "celularcini") for k in keywords):
        return "Sin celular / celularcini"
    if re.search(r"no{3,}", normalize_text(text)) and re.search(r"no{3,}", title_norm):
        return "Eco del hook («nooo» del título)"

    clean_title = _strip_emojis(title).strip()
    if len(clean_title) > 48:
        return f"{clean_title[:48]}…"
    return clean_title or "Hook del video"


def classify_engagement(
    text: str,
    title: Optional[str],
    category: str,
    raw_sentiment: str,
) -> tuple[EngagementType, str]:
    """Returns (engagement_type, content_sentiment toward creator)."""
    if category == "pregunta":
        return "question", raw_sentiment
    if category == "sugerencia":
        return "suggestion", "positive" if raw_sentiment != "negative" else "neutral"
    if category == "problema":
        return "problem", "negative"
    if category == "elogio":
        return "support", "positive"
    if is_resonance_comment(text, title, category):
        return "resonance", "positive"

    if raw_sentiment == "negative" and has_criticism(text):
        return "criticism", "negative"

    return "neutral", raw_sentiment


def apply_resonance_to_result(
    result: dict,
    text: str,
    video_title: Optional[str],
) -> dict:
    engagement, content_sentiment = classify_engagement(
        text,
        video_title,
        result.get("category", "otro"),
        result.get("sentiment", "neutral"),
    )
    result["engagement_type"] = engagement
    result["content_sentiment"] = content_sentiment
    if engagement == "resonance":
        result["is_resonance"] = True
    else:
        result["is_resonance"] = False
    return result
