"""Pruebas unitarias para el algoritmo de análisis de comentarios con emojis."""
from app.nlp.emoji_analysis import (
    classify_emoji_comment,
    extract_emojis,
    is_emoji_only_comment,
    expand_emoji_comment_for_llm,
)
from app.nlp.comment_dedup import normalize_comment_text, cluster_comments_for_llm


def test_extract_emojis():
    emojis = extract_emojis("¡Increíble video! 🔥👏🚀")
    assert "🔥" in emojis
    assert "👏" in emojis
    assert "🚀" in emojis


def test_is_emoji_only_comment():
    assert is_emoji_only_comment("🔥🔥🔥") is True
    assert is_emoji_only_comment("👏!!") is True
    assert is_emoji_only_comment("???🤔") is True
    assert is_emoji_only_comment("❤️  🙌") is True
    assert is_emoji_only_comment("buen video 🔥") is False
    assert is_emoji_only_comment("hola") is False


def test_classify_support_emojis():
    result = classify_emoji_comment("🔥🔥🔥")
    assert result is not None
    assert result["sentiment"] == "positive"
    assert result["category"] == "elogio"
    assert result["engagement_type"] == "support"
    assert result["is_resonance"] is False

    result_praise = classify_emoji_comment("👏 👏 👏")
    assert result_praise is not None
    assert result_praise["sentiment"] == "positive"
    assert result_praise["engagement_type"] == "support"


def test_classify_humor_emojis():
    result = classify_emoji_comment("😂😂😂")
    assert result is not None
    assert result["sentiment"] == "positive"
    assert result["category"] == "elogio"
    assert result["engagement_type"] == "resonance"
    assert result["is_resonance"] is True


def test_classify_criticism_emojis():
    result = classify_emoji_comment("👎💩")
    assert result is not None
    assert result["sentiment"] == "negative"
    assert result["category"] == "problema"
    assert result["engagement_type"] == "criticism"


def test_classify_question_emojis():
    result = classify_emoji_comment("🤔❓")
    assert result is not None
    assert result["sentiment"] == "neutral"
    assert result["category"] == "pregunta"
    assert result["engagement_type"] == "question"


def test_expand_emoji_comment_for_llm():
    expanded = expand_emoji_comment_for_llm("🔥🔥")
    assert "🔥🔥" in expanded
    assert "support" in expanded

    regular = expand_emoji_comment_for_llm("buen video")
    assert regular == "buen video"


def test_emoji_dedup_does_not_mix_different_emojis():
    # Emojis distintos no deben colapsar en el mismo cluster
    comments = [
        {"id": "1", "text": "🔥🔥🔥"},
        {"id": "2", "text": "🔥"},
        {"id": "3", "text": "👎👎"},
        {"id": "4", "text": "😂😂"},
    ]
    representatives, member_map, stats = cluster_comments_for_llm(comments)

    assert stats["representative_count"] == 3  # Fuego, Dislike, Risa
    # Verificar que fuego y dislike no están juntos
    fire_members = next(ids for ids in member_map.values() if "1" in ids)
    assert "2" in fire_members
    assert "3" not in fire_members
    assert "4" not in fire_members
