from app.nlp.comment_dedup import cluster_comments_for_llm, normalize_comment_text


def test_normalize_comment_text_strips_punctuation_and_accents():
    assert normalize_comment_text("¡Excelente vídeo!") == "excelente video"


def test_cluster_exact_duplicates():
    comments = [
        {"id": "1", "text": "Buen video"},
        {"id": "2", "text": "buen video"},
        {"id": "3", "text": "buen video!!!"},
        {"id": "4", "text": "otro comentario distinto"},
    ]
    representatives, member_map, stats = cluster_comments_for_llm(comments)

    assert stats["input_count"] == 4
    assert stats["representative_count"] == 2
    assert stats["exact_duplicate_groups"] == 1

    rep_ids = {rep["id"] for rep in representatives}
    assert len(rep_ids) == 2

    merged_for_buen = next(ids for rep_id, ids in member_map.items() if "1" in ids or "2" in ids)
    assert set(merged_for_buen) == {"1", "2", "3"}


def test_cluster_fuzzy_similar_comments():
    comments = [
        {"id": "a", "text": "excelente video me encanto mucho"},
        {"id": "b", "text": "excelente video me encanto bastante"},
        {"id": "c", "text": "como editas tus videos?"},
    ]
    representatives, member_map, stats = cluster_comments_for_llm(
        comments,
        similarity_threshold=0.85,
    )

    assert stats["input_count"] == 3
    assert stats["representative_count"] == 2
    assert stats["fuzzy_clusters"] >= 1

    fuzzy_group = next(
        (ids for ids in member_map.values() if "a" in ids and "b" in ids),
        None,
    )
    assert fuzzy_group is not None
