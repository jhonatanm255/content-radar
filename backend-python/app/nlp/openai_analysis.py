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
        
        # Limpiar extremadamente el contexto manteniendo saltos limpios
        cleaned_context = "\n".join([line.strip() for line in video_context.splitlines() if line.strip()])[:4000]
        title_line = f"Video: {video_title}\n" if video_title else ""
        
        prompt = f"""ANÁLISIS INDEPENDIENTE DE COMENTARIO - SESIÓN NUEVA
{title_line}
Contexto del video:
{cleaned_context}

---

Comentario del usuario (ÚNICO, no histórico):
"{comment_text.strip()}"

---

INSTRUCCIONES CRÍTICAS:
1. Este es un análisis NUEVO y AISLADO.
2. NO reutilices análisis anteriores.
3. Responde basado SOLO en este comentario y su contexto.
4. Sé independiente y objetivo.

[ALLOWED VALUES]
- relevance: "high", "medium", "low"
- sentiment: "positive", "neutral", "negative"
- engagement_type: "resonance", "support", "criticism", "question", "suggestion", "problem", "neutral"

Responde con la siguiente estructura JSON estricta:
{{
  "relevance": "high/medium/low", 
  "sentiment": "positive/neutral/negative", 
  "engagement_type": "resonance/support/criticism/question/suggestion/problem/neutral", 
  "topic": "string", 
  "intent": "string", 
  "key_phrase": "string"
}}"""

        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": "Eres un analista experto. CADA análisis es NUEVO. No contamines con historial. Responde SOLO JSON válido."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.10,
            max_tokens=500,
            response_format={"type": "json_object"}
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

    # Limpiar EXHAUSTIVAMENTE el contexto manteniendo saltos limpios
    cleaned_context = "\n".join([line.strip() for line in video_context.splitlines() if line.strip()])[:4000]
    
    for i in range(0, len(comments), max_batch):
        batch = comments[i : i + max_batch]
        try:
            # Serialización robusta de comentarios para mitigar inyecciones de código
            comments_payload = []
            for j, c in enumerate(batch):
                comments_payload.append(f'Index: {j}\nID: {c["id"]}\nContent: {c["text"].strip()[:600]}')
            comments_text = "\n---\n".join(comments_payload)
            
            prompt = f"""You are an expert Social Media Data Analyst. Your task is to perform an isolated, objective analysis on a batch of {len(batch)} YouTube comments based strictly on the provided video context.

[VIDEO INFORMATION]
Title: {video_title or 'Unknown'}
Context/Summary:
{cleaned_context}

[ALLOWED VALUES FOR FIELDS]
- relevance: "high", "medium", "low"
- sentiment: "positive", "neutral", "negative"
- engagement_type: "resonance", "support", "criticism", "question", "suggestion", "problem", "neutral"

[COMMENTS TO ANALYZE]
{comments_text}

[OUTPUT FORMAT]
Return a JSON object matching this exact structure. Do not add markdown blocks outside the JSON.

{{
  "comments": [
    {{
      "id": "The exact ID string provided in the comment",
      "relevance": "high/medium/low",
      "sentiment": "positive/neutral/negative",
      "engagement_type": "resonance/support/criticism/question/suggestion/problem/neutral",
      "topic": "Short specific topic (e.g., WinRAR, Video Codecs, Ares nostalgia)",
      "intent": "User intent in 1-2 words (e.g., Nostalgia, Praise, Debate)",
      "key_phrase": "Most representative short phrase from the comment"
    }}
  ],
  "analysis_report": "A concise executive summary of this specific batch trends (max 100 words in Spanish)."
}}"""

            response = client.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {"role": "system", "content": "You are a strict Data Analyst that outputs ONLY valid JSON matching the requested schema. No explanations."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.10,
                max_tokens=3000,
                response_format={"type": "json_object"}
            )

            text = response.choices[0].message.content.strip()
            parsed = _extract_json_from_response(text)

            batch_results: list[dict] = []
            if isinstance(parsed, dict):
                batch_results = parsed.get("comments", [])
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
    max_length: int = 1500,
) -> str:
    if not transcript or not has_openai_key():
        return ""

    client = _get_openai_client()
    if not client:
        return ""

    title_context = f"Título del Video: {video_title}\n" if video_title else ""
    
    # Se aumenta a los primeros 25k caracteres para asegurar una lectura del cuerpo completo del video
    sampled_transcript = transcript[:25000] 

    prompt = f"""{title_context}
A continuación tienes la transcripción de un video de YouTube. Genera un resumen ejecutivo de alta densidad informativa, priorizando hitos cronológicos, datos clave, nombres propios y conclusiones del video.

Transcripción:
{sampled_transcript}

Genera el resumen de manera directa, concisa y en español, ideal para usarlo como contexto de análisis de datos. Máximo {max_length} caracteres."""

    try:
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": "Eres un extractor de resúmenes de alta densidad técnica e informativa."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            max_tokens=600,
        )
        summary = response.choices[0].message.content.strip()
        if len(summary) > max_length:
            summary = summary[:max_length].rstrip() + "..."
        return summary
    except Exception as e:
        logger.error(f"Error generando resumen con OpenAI: {str(e)}")
        return ""