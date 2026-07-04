"""
Análisis contextual de comentarios usando Deep Seek (compatible con OpenAI API).
Complementa el análisis actual con un modelo de lenguaje accesible via API key.
"""
from __future__ import annotations

import json
import logging
from typing import Optional

from app.config import get_settings
from app.nlp.llm_enrichment import attach_batch_ids

logger = logging.getLogger(__name__)

try:
    from openai import OpenAI
except ImportError:  # pragma: no cover
    OpenAI = None  # type: ignore

_settings = get_settings()


def _get_openai_client() -> Optional[OpenAI]:
    """Crea un cliente OpenAI fresco para cada operación (evita caché/sesión compartida)."""
    if _settings.get("openai_api_key") and OpenAI:
        return OpenAI(
            api_key=_settings["openai_api_key"],
            base_url="https://api.deepseek.com/v1"
        )
    return None


def has_openai_key() -> bool:
    """Verifica si OpenAI API key está configurada."""
    return bool(_settings.get("openai_api_key") and OpenAI)


def _escape_newlines_in_json_strings(json_text: str) -> str:
    """Escapa saltos de línea y tabs dentro de valores de cadena JSON."""
    escaped = []
    in_string = False
    escaping = False

    for char in json_text:
        if in_string:
            if escaping:
                escaped.append(char)
                escaping = False
                continue
            if char == "\\":
                escaped.append(char)
                escaping = True
                continue
            if char == '"':
                escaped.append(char)
                in_string = False
                continue
            if char == "\n":
                escaped.append("\\n")
                continue
            if char == "\r":
                escaped.append("\\r")
                continue
            if char == "\t":
                escaped.append("\\t")
                continue
            escaped.append(char)
            continue

        escaped.append(char)
        if char == '"':
            in_string = True

    return "".join(escaped)


def _extract_json_from_response(response_text: str) -> dict | list:
    """Extrae JSON del texto de respuesta, tolerante con caracteres especiales."""
    json_text = response_text.strip()

    # Buscar bloques de código
    if "```json" in json_text:
        json_text = json_text.split("```json")[1].split("```")[0].strip()
    elif "```" in json_text:
        json_text = json_text.split("```")[1].split("```")[0].strip()

    try:
        return json.loads(json_text)
    except json.JSONDecodeError as e:
        logger.warning(f"JSON parse error: {str(e)}. Intentando limpieza...")

        cleaned = _escape_newlines_in_json_strings(json_text)
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            pass

        # Intenta extraer el substring entre { y }
        start = json_text.find("{")
        end = json_text.rfind("}")
        if start != -1 and end != -1 and start < end:
            candidate = json_text[start : end + 1]
            try:
                return json.loads(candidate)
            except json.JSONDecodeError:
                candidate = _escape_newlines_in_json_strings(candidate)
                try:
                    return json.loads(candidate)
                except Exception:
                    pass

        # Si todo falla, devolver dict vacío en lugar de crashear
        logger.error(f"No se pudo parsear JSON: {response_text[:200]}")
        return {}


def analyze_comment_with_context(
    comment_text: str,
    video_context: str,
    video_title: Optional[str] = None,
) -> dict:
    if not has_openai_key():
        return {}

    try:
        client = _get_openai_client()
        if not client:
            return {}
        
        # Limpiar extremadamente el contexto
        cleaned_context = (
            video_context
            .replace("\n\n\n", "\n")
            .replace("\r\r", "\r")
            .replace("\r", "")
            .strip()
        )[:3500]
        
        title_line = f"Video: {video_title}\n" if video_title else ""
        
        prompt = f"""ANÁLISIS INDEPENDIENTE DE COMENTARIO - SESIÓN NUEVA
{title_line}
Contexto del video:
{cleaned_context}

---

Comentario del usuario (ÚNICO, no histórico):
"{comment_text}"

---

INSTRUCCIONES CRÍTICAS:
1. Este es un análisis NUEVO y AISLADO
2. NO reutilices análisis anteriores
3. Responde basado SOLO en este comentario y su contexto
4. Sé independiente y objetivo

Responde SOLO JSON (sin prefacio):
{{"relevance": "high|medium|low", "sentiment": "positive|neutral|negative", "engagement_type": "resonance|support|criticism|question|suggestion|problem|neutral", "topic": "string", "intent": "string", "key_phrase": "string"}}"""

        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": "Eres un analista experto. CADA análisis es NUEVO. No contamines con historial. Responde SOLO JSON."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.15,
            max_tokens=500,
        )

        text = response.choices[0].message.content.strip()
        result = _extract_json_from_response(text)
        return result
    except Exception as e:
        logger.error(f"Error analizando comentario con OpenAI: {str(e)}")
        return {}


def batch_analyze_with_context(
    comments: list[dict],
    video_context: str,
    video_title: Optional[str] = None,
    max_batch: int = 10,
) -> tuple[list[dict], str]:
    if not has_openai_key():
        return [], ""

    results: list[dict] = []
    analysis_report = ""
    client = _get_openai_client()  # Cliente NUEVO por cada batch
    
    if not client:
        return [], ""

    # Limpiar EXHAUSTIVAMENTE el contexto
    cleaned_context = (
        video_context
        .replace("\n\n\n", "\n")
        .replace("\n\n", "\n")
        .replace("\r\r", "\r")
        .replace("\r", "")
        .strip()
    )[:3500]
    
    for i in range(0, len(comments), max_batch):
        batch = comments[i : i + max_batch]
        try:
            comments_text = "\n".join(
                [
                    f'{j}. id="{c["id"]}" texto="{c["text"].strip()[:800]}"'
                    for j, c in enumerate(batch)
                ]
            )
            
            prompt = f"""ANÁLISIS DE LOTE - SESIÓN NUEVA E INDEPENDIENTE

**Video:** {video_title or 'SIN TÍTULO'}

**Contexto del video:**
{cleaned_context}

---

ANALIZA ESTOS {len(batch)} COMENTARIOS en relación al contexto del video.

Instrucciones:
- Cada comentario es un análisis independiente
- Usa el campo "id" exacto de cada comentario en la respuesta
- Sé preciso con el tema, la intención y el tipo de engagement
- "resonance" = eco del hook/título del video, no crítica al creador

Responde SOLO este JSON:
{{
  "comments": [
    {{
      "id": "id exacto del comentario",
      "relevance": "high" | "medium" | "low",
      "sentiment": "positive" | "neutral" | "negative",
      "engagement_type": "resonance" | "support" | "criticism" | "question" | "suggestion" | "problem" | "neutral",
      "topic": "tema específico detectado",
      "intent": "intención en 1-2 palabras",
      "key_phrase": "frase clave si existe"
    }}
  ],
  "analysis_report": "resumen de ESTE lote SOLO (máx 100 palabras)"
}}

Comentarios para analizar:
{comments_text}

RESPONDE SOLO EL JSON ANTERIOR. SIN PREFACIO NI EXPLICACIONES."""

            response = client.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {"role": "system", "content": "Eres un analista de comentarios EXACTO y PRECISO. Responde SOLO JSON válido."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.15,
                max_tokens=2500,
            )

            text = response.choices[0].message.content.strip()
            parsed = _extract_json_from_response(text)

            batch_results: list[dict] = []
            if isinstance(parsed, dict):
                if isinstance(parsed.get("comments"), list):
                    batch_results = parsed.get("comments", [])
                elif isinstance(parsed, list):
                    batch_results = parsed
                analysis_report = parsed.get("analysis_report", "").strip() or analysis_report
            elif isinstance(parsed, list):
                batch_results = parsed

            results.extend(attach_batch_ids(batch, batch_results))
        except Exception as e:
            logger.error(f"Error en análisis en lote con OpenAI: {str(e)}")
            continue

    return results, analysis_report


def refine_analysis(
    base_analysis: dict,
    openai_analysis: dict,
) -> dict:
    if not openai_analysis:
        return base_analysis

    refined = base_analysis.copy()
    if openai_analysis.get("sentiment"):
        refined["sentiment_openai"] = openai_analysis.get("sentiment")
        refined["sentiment"] = openai_analysis.get("sentiment")

    if openai_analysis.get("engagement_type"):
        refined["engagement_type_openai"] = openai_analysis.get("engagement_type")
        refined["engagement_type"] = openai_analysis.get("engagement_type")

    refined["topic_openai"] = openai_analysis.get("topic", "")
    refined["relevance_openai"] = openai_analysis.get("relevance", "")
    refined["intent_openai"] = openai_analysis.get("intent", "")
    refined["key_phrase"] = openai_analysis.get("key_phrase", "")

    return refined


def generate_video_summary(
    transcript: str,
    video_title: Optional[str] = None,
    max_length: int = 500,
) -> str:
    if not transcript or not has_openai_key():
        return ""

    client = _get_openai_client()
    if not client:
        return ""

    title_context = f"Título: {video_title}\n" if video_title else ""
    prompt = f"""{title_context}Resumir en {max_length} caracteres:
{transcript[:800]}"""

    try:
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": "Generador de resúmenes conciso."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            max_tokens=100,
        )
        summary = response.choices[0].message.content.strip()
        if len(summary) > max_length:
            summary = summary[:max_length].rstrip() + "..."
        return summary
    except Exception as e:
        logger.error(f"Error generando resumen con OpenAI: {str(e)}")
        return ""
