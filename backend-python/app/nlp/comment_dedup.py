"""Agrupa comentarios repetidos o muy similares antes de llamar al LLM."""
from __future__ import annotations

import re
import unicodedata
from difflib import SequenceMatcher
from typing import TypedDict


class DedupStats(TypedDict):
    input_count: int
    representative_count: int
    exact_duplicate_groups: int
    fuzzy_clusters: int


_PUNCT_RE = re.compile(r"[^\w\s]", re.UNICODE)
_SPACE_RE = re.compile(r"\s+")


def normalize_comment_text(text: str) -> str:
    lowered = text.lower().strip()
    normalized = unicodedata.normalize("NFKD", lowered)
    without_accents = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    without_punct = _PUNCT_RE.sub(" ", without_accents)
    return _SPACE_RE.sub(" ", without_punct).strip()


def _similarity(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    if a == b:
        return 1.0
    return SequenceMatcher(None, a, b).ratio()


def _bucket_key(normalized: str) -> tuple[int, str]:
    length_bucket = len(normalized) // 25
    first_token = normalized.split(" ", 1)[0] if normalized else ""
    return length_bucket, first_token


def _pick_representative(cluster: list[dict]) -> dict:
    return max(cluster, key=lambda item: len(item.get("text", "")))


def cluster_comments_for_llm(
    comments: list[dict],
    *,
    similarity_threshold: float = 0.88,
    min_length_for_fuzzy: int = 12,
) -> tuple[list[dict], dict[str, list[str]], DedupStats]:
    """
    Devuelve representantes para el LLM y un mapa rep_id -> todos los ids del cluster.
    """
    if not comments:
        empty_stats: DedupStats = {
            "input_count": 0,
            "representative_count": 0,
            "exact_duplicate_groups": 0,
            "fuzzy_clusters": 0,
        }
        return [], {}, empty_stats

    exact_groups: dict[str, list[dict]] = {}
    for comment in comments:
        key = normalize_comment_text(comment.get("text", ""))
        exact_groups.setdefault(key, []).append(comment)

    exact_duplicate_groups = sum(1 for group in exact_groups.values() if len(group) > 1)

    exact_clusters = list(exact_groups.values())
    candidates = [_pick_representative(group) for group in exact_clusters]
    exact_member_ids = {
        rep["id"]: [member["id"] for member in group]
        for rep, group in zip(candidates, exact_clusters)
    }

    buckets: dict[tuple[int, str], list[dict]] = {}
    for candidate in candidates:
        normalized = normalize_comment_text(candidate.get("text", ""))
        buckets.setdefault(_bucket_key(normalized), []).append(candidate)

    fuzzy_clusters: list[list[dict]] = []
    fuzzy_cluster_count = 0

    for bucket_candidates in buckets.values():
        bucket_clusters: list[list[dict]] = []
        for candidate in bucket_candidates:
            normalized = normalize_comment_text(candidate.get("text", ""))
            if len(normalized) < min_length_for_fuzzy:
                bucket_clusters.append([candidate])
                continue

            placed = False
            for cluster in bucket_clusters:
                rep = cluster[0]
                rep_norm = normalize_comment_text(rep.get("text", ""))
                if _similarity(normalized, rep_norm) >= similarity_threshold:
                    cluster.append(candidate)
                    placed = True
                    if len(cluster) == 2:
                        fuzzy_cluster_count += 1
                    break
            if not placed:
                bucket_clusters.append([candidate])

        fuzzy_clusters.extend(bucket_clusters)

    representatives = [_pick_representative(cluster) for cluster in fuzzy_clusters]
    member_ids_by_rep: dict[str, list[str]] = {}

    for rep, cluster in zip(representatives, fuzzy_clusters):
        merged_ids: list[str] = []
        for candidate in cluster:
            merged_ids.extend(exact_member_ids.get(candidate["id"], [candidate["id"]]))
        member_ids_by_rep[rep["id"]] = list(dict.fromkeys(merged_ids))

    stats: DedupStats = {
        "input_count": len(comments),
        "representative_count": len(representatives),
        "exact_duplicate_groups": exact_duplicate_groups,
        "fuzzy_clusters": fuzzy_cluster_count,
    }
    return representatives, member_ids_by_rep, stats
