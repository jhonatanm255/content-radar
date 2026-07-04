from __future__ import annotations

from app.nlp.llm_enrichment import extract_topic_from_result
import re
from collections import Counter


def extract_short_request(result: dict) -> str:
    # Prioritize Ollama-provided intent/key phrase
    if result.get("intent_ollama"):
        return str(result.get("intent_ollama")).strip()
    if result.get("key_phrase"):
        return str(result.get("key_phrase")).strip()

    text = result.get("text", "")
    # If it's a question, return the question fragment
    q_match = re.search(r"([^\n\?]+\?)", text)
    if q_match:
        return q_match.group(1).strip()

    # Fallback: first 6 words
    words = re.findall(r"\w+", text)
    return " ".join(words[:6]) + ("…" if len(words) > 6 else "")


def generate_alerts(results: List[dict], max_top: int = 3) -> List[str]:
    alerts: List[str] = []
    if not results:
        return alerts

    engagement_counts = Counter(r.get("engagement_type") for r in results)
    sentiment_counts = Counter(r.get("sentiment") for r in results)

    # Top topics from Ollama or base category
    topics = [extract_topic_from_result(r) for r in results]
    topic_counts = Counter(t for t in topics if t)
    top_topics = topic_counts.most_common(max_top)

    # Alerts for criticism/complaints
    criticism = engagement_counts.get("criticism", 0)
    problems = engagement_counts.get("problem", 0)
    questions = engagement_counts.get("question", 0)
    resonance = engagement_counts.get("resonance", 0)

    if criticism >= 2:
        top = top_topics[0][0] if top_topics else "este tema"
        alerts.append(f"Varias quejas detectadas sobre {top} ({criticism} comentarios) — investigar causas y responder.")

    if problems >= 2:
        alerts.append(f"Usuarios reportan problemas técnicos ({problems} comentarios) — revisar errores y documentación.")

    if questions >= 3:
        top = top_topics[0][0] if top_topics else "temas frecuentes"
        alerts.append(f"Múltiples preguntas sobre {top} ({questions}) — considera crear una FAQ o responder en video.")

    if resonance >= 3:
        alerts.append(f"Alto nivel de resonancia detectado ({resonance}) — el hook está conectando; amplificar o replicar.")

    # Add topical alerts
    for t, cnt in top_topics:
        if cnt >= 4:
            alerts.append(f"Tema recurrente: {t} ({cnt} comentarios) — explorar ideas de contenido relacionadas.")

    # If many negatives overall
    neg = sentiment_counts.get("negative", 0)
    if neg >= max(3, len(results) // 5):
        alerts.append(f"Proporción alta de comentarios negativos ({neg}/{len(results)}) — priorizar respuestas y mitigación.")

    return alerts


def generate_short_requests(results: List[dict]) -> List[Dict[str, str]]:
    short = []
    for r in results:
        sid = r.get("id")
        text = extract_short_request(r)
        short.append({"id": sid, "short_request": text})
    return short
