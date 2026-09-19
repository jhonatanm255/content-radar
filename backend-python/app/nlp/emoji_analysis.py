"""
Módulo especializado para detección, clasificación y análisis semántico
de comentarios compuestos por emojis o donde los emojis determinan la intención.
"""
from __future__ import annotations

import re
from typing import TypedDict, Optional

try:
    import emoji
except ImportError:  # pragma: no cover
    emoji = None


class EmojiClassification(TypedDict):
    is_emoji_only: bool
    sentiment: str  # 'positive' | 'negative' | 'neutral'
    sentiment_confidence: float
    category: str   # 'elogio' | 'problema' | 'pregunta' | 'sugerencia' | 'otro'
    engagement_type: str  # 'support' | 'resonance' | 'criticism' | 'question' | 'suggestion' | 'problem' | 'neutral'
    content_sentiment: str
    topic: str
    is_resonance: bool
    semantic_description: str


# Grupos de emojis clasificados por intención
EMOJI_FAMILIES = {
    "support": {
        "chars": {
            "🔥", "👏", "🙌", "❤️", "💕", "💖", "💗", "💓", "😍", "🥰", "😘", "🤩",
            "✨", "⭐", "🌟", "😊", "😁", "😄", "😃", "👍", "🎉", "🥳", "🥂", "👑",
            "💎", "🎯", "⚡", "🔝", "💯", "🚀", "🏆", "🥇", "🦾", "🤝", "👌", "💪",
        },
        "sentiment": "positive",
        "category": "elogio",
        "engagement_type": "support",
        "topic": "Aprecio de la audiencia",
        "description": "Reacción de aprecio, admiración o apoyo entusiasta",
    },
    "humor": {
        "chars": {
            "😂", "🤣", "💀", "☠️", "😭", "😹", "😆",
        },
        "sentiment": "positive",
        "category": "elogio",
        "engagement_type": "resonance",
        "topic": "Humor / Reacción cómica",
        "description": "Risa o humor ante el contenido (resonancia cómica)",
    },
    "criticism": {
        "chars": {
            "👎", "🤮", "🤢", "💩", "😡", "🤬", "👿", "🤡", "😤", "😠", "🖕", "🙄",
            "😴", "🥱", "🗑️", "🤦", "🤦‍♂️", "🤦‍♀️", "📉",
        },
        "sentiment": "negative",
        "category": "problema",
        "engagement_type": "criticism",
        "topic": "Desaprobación / Crítica",
        "description": "Rechazo, crítica o disgusto hacia el video",
    },
    "question": {
        "chars": {
            "🤔", "🧐", "🤨", "❓", "❔", "🤷", "🤷‍♂️", "🤷‍♀️", "😶‍🌫️", "🤯",
        },
        "sentiment": "neutral",
        "category": "pregunta",
        "engagement_type": "question",
        "topic": "Duda / Curiosidad",
        "description": "Duda, curiosidad o reflexión sobre el tema",
    },
    "sadness": {
        "chars": {
            "💔", "🥺", "😢", "😞", "😔", "😥", "😿",
        },
        "sentiment": "negative",
        "category": "problema",
        "engagement_type": "problem",
        "topic": "Frustración / Tristeza",
        "description": "Tristeza o frustración relacionada con el contenido",
    },
    "suggestion": {
        "chars": {
            "🙏", "💡", "📝", "📌", "🙋", "🙋‍♂️", "🙋‍♀️",
        },
        "sentiment": "positive",
        "category": "sugerencia",
        "engagement_type": "suggestion",
        "topic": "Sugerencia / Petición",
        "description": "Petición o sugerencia de la audiencia",
    },
}

_PUNCT_AND_SPACE_RE = re.compile(r"[\s\.,!¡?¿\-_:;~]+", re.UNICODE)


def extract_emojis(text: str) -> list[str]:
    """Extrae todos los caracteres de emojis presentes en un texto."""
    if emoji:
        return [c["emoji"] for c in emoji.emoji_list(text)]
    # Fallback si emoji lib no estuviera disponible
    all_chars = set()
    for fam in EMOJI_FAMILIES.values():
        all_chars.update(fam["chars"])
    return [ch for ch in text if ch in all_chars]


def is_emoji_only_comment(text: str) -> bool:
    """
    Determina si un comentario está compuesto solo por emojis, espacios y signos
    de puntuación simples (ej. '🔥🔥🔥', '👏!!', '???🤔', '❤️🙌').
    """
    stripped = text.strip()
    if not stripped:
        return False

    emojis = extract_emojis(stripped)
    if not emojis:
        return False

    # Eliminar emojis y signos de puntuación/espacios
    text_without_emojis = stripped
    if emoji:
        text_without_emojis = emoji.replace_emoji(stripped, replace="")
    else:
        for em in emojis:
            text_without_emojis = text_without_emojis.replace(em, "")

    remaining = _PUNCT_AND_SPACE_RE.sub("", text_without_emojis).strip()
    return len(remaining) == 0


def classify_emoji_comment(text: str) -> Optional[EmojiClassification]:
    """
    Si el comentario es de solo emojis (o emoji-dominante), clasifica su intención,
    sentimiento y categoría correspondiente. Retorna None si no es emoji-only.
    """
    if not is_emoji_only_comment(text):
        return None

    emojis = extract_emojis(text)
    if not emojis:
        return None

    # Contar ocurrencias por familia
    family_counts: dict[str, int] = {k: 0 for k in EMOJI_FAMILIES}
    for em in emojis:
        for family_name, data in EMOJI_FAMILIES.items():
            if em in data["chars"]:
                family_counts[family_name] += 1

    # Prioridad: crítica > pregunta > sugerencia > tristeza > humor > support
    # (si hay crítica explícita como 👎 junto a 🔥, prevalece la crítica)
    dominant_family = "support"
    max_count = 0
    for fam_name in ["criticism", "question", "suggestion", "sadness", "humor", "support"]:
        cnt = family_counts.get(fam_name, 0)
        if cnt > max_count:
            max_count = cnt
            dominant_family = fam_name

    data = EMOJI_FAMILIES[dominant_family]
    is_resonance = dominant_family == "humor"

    return {
        "is_emoji_only": True,
        "sentiment": data["sentiment"],
        "sentiment_confidence": 0.95,
        "category": data["category"],
        "engagement_type": data["engagement_type"],
        "content_sentiment": data["sentiment"],
        "topic": data["topic"],
        "is_resonance": is_resonance,
        "semantic_description": data["description"],
    }


def expand_emoji_comment_for_llm(text: str) -> str:
    """
    Si el comentario es de emojis puros, lo expande agregando la intención semántica
    entre corchetes para que el LLM lo procese con contexto y no lo trate como ruido.
    """
    classification = classify_emoji_comment(text)
    if not classification:
        return text

    return f"{text} [{classification['semantic_description']} -> {classification['engagement_type']}]"
