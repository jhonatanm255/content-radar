"""
Análisis contextual de comentarios usando Deep Seek (compatible con OpenAI API).
Complementa el análisis actual con un modelo de lenguaje accesible via API key.
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Optional

from app.config import get_settings
from app.nlp.llm_enrichment import attach_batch_ids

logger = logging.getLogger(__name__)

try:
    from openai import AsyncOpenAI
except ImportError:  # pragma: no cover
    AsyncOpenAI = None  # type: ignore

_settings = get_settings()


def _get_async_openai_client() -> Optional[AsyncOpenAI]:
    """Crea un cliente AsyncOpenAI fresco para cada operación."""
    if _settings.get("openai_api_key") and AsyncOpenAI:
        return AsyncOpenAI(
            api_key=_settings["openai_api_key"],
            base_url="https://api.deepseek.com/v1"
        )
    return None


def has_openai_key() -> bool:
    """Verifica si OpenAI API key está configurada."""
    return bool(_settings.get("openai_api_key") and AsyncOpenAI)


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

        logger.error(f"No se pudo parsear JSON: {response_text[:200]}")
        return {}


def _merge_batch_reports(reports: list[str]) -> str:
    """
    Fusiona los reportes estructurados de múltiples batches en un resumen único.
    Cada reporte tiene formato: dominant_theme | main_friction | top_opportunity
    """
    if not reports:
        return ""
    if len(reports) == 1:
        return reports[0]
    # Concatenar como lista de observaciones de cada batch
    return " // ".join(r for r in reports if r)


async def analyze_comment_with_context(
    comment_text: str,
    video_context: str,
    video_title: Optional[str] = None,
) -> dict:
    if not has_openai_key():
        return {}

    try:
        client = _get_async_openai_client()
        if not client:
            return {}

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

[DEFINICIÓN DE engagement_type - LEE CON ATENCIÓN]
- "resonance": El comentario REPITE o ECO una frase, idea o emoción del video (ej: el viewer cita el título, replica el hook). NO es crítica al creador.
- "support": Elogio o apoyo EXPLÍCITO al creador o al contenido (ej: "excelente video", "gracias").
- "criticism": Crítica DIRECTA al creador, formato, calidad o decisiones del video.
- "question": El viewer hace una pregunta genuina sobre el tema o contenido.
- "suggestion": El viewer propone contenido nuevo, un cambio o mejora.
- "problem": El viewer reporta un error, bug, falla técnica o dificultad concreta.
- "neutral": Comentario sin intención clara (spam, off-topic, emoji solo).

[NORMALIZACIÓN DE TEMAS]
- El campo "topic" debe ser el tema canónico, en español, capitalizado (ej: "Kubernetes", no "k8s" ni "kubernetes").
- Si el comentario es off-topic o vacío, usa "General".

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

        response = await client.chat.completions.create(
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


async def batch_analyze_with_context(
    comments: list[dict],
    video_context: str,
    video_title: Optional[str] = None,
    max_batch: int = 40,
) -> tuple[list[dict], str]:
    if not has_openai_key():
        return [], ""

    results: list[dict] = []
    all_batch_reports: list[str] = []
    client = _get_async_openai_client()

    if not client:
        return [], ""

    cleaned_context = "\n".join([line.strip() for line in video_context.splitlines() if line.strip()])[:4000]

    batches = [comments[i : i + max_batch] for i in range(0, len(comments), max_batch)]

    logger.info(f"[ASYNC] OpenAI: Iniciando análisis asíncrono de {len(batches)} lotes...")

    async def process_single_batch(batch: list[dict]) -> tuple[list[dict], str]:
        """Procesa un solo lote de comentarios de manera independiente contra DeepSeek."""
        logger.info(f"[ASYNC] OpenAI: Procesando lote de {len(batch)} comentarios...")
        try:
            comments_payload = []
            for j, c in enumerate(batch):
                comments_payload.append(f'Index: {j}\nID: {c["id"]}\nContent: {c["text"].strip()[:600]}')
            comments_text = "\n---\n".join(comments_payload)

            prompt = f"""You are an expert Social Media Data Analyst. Perform an isolated, objective analysis on a batch of {len(batch)} YouTube comments based strictly on the provided video context.

[VIDEO INFORMATION]
Title: {video_title or 'Unknown'}
Context/Summary:
{cleaned_context}

[ENGAGEMENT TYPE DEFINITIONS - READ CAREFULLY]
- "resonance": Comment ECHOES or REPEATS a phrase/idea/emotion from the video (e.g., viewer quotes the title, mirrors the hook). NOT criticism.
- "support": EXPLICIT praise or encouragement directed at the creator or content (e.g., "great video", "thank you").
- "criticism": DIRECT negative critique of the creator, format, quality, or content decisions.
- "question": Viewer asks a genuine question about the topic or content.
- "suggestion": Viewer proposes new content, a change, or an improvement.
- "problem": Viewer reports a concrete error, bug, technical failure, or difficulty.
- "neutral": No clear intent (spam, off-topic, emoji only).

[TOPIC NORMALIZATION]
- The "topic" field MUST be the canonical topic name, in Spanish, title-cased (e.g., "Kubernetes", not "k8s" or "kubernetes").
- Group synonyms under one canonical name.
- If off-topic or unclear, use "General".

[ALLOWED VALUES]
- relevance: "high", "medium", "low"
- sentiment: "positive", "neutral", "negative"
- engagement_type: "resonance", "support", "criticism", "question", "suggestion", "problem", "neutral"

[COMMENTS TO ANALYZE]
{comments_text}

[OUTPUT FORMAT]
Return a JSON object with this exact structure. No markdown blocks outside the JSON.

{{
  "comments": [
    {{
      "id": "The exact ID string provided in the comment",
      "relevance": "high/medium/low",
      "sentiment": "positive/neutral/negative",
      "engagement_type": "resonance/support/criticism/question/suggestion/problem/neutral",
      "topic": "Canonical topic in Spanish (e.g., Kubernetes, Docker, Instalación)",
      "intent": "User intent in 1-2 words in Spanish (e.g., Nostalgia, Elogio, Debate)",
      "key_phrase": "Most representative short phrase from the comment"
    }}
  ],
  "analysis_report": {{
    "dominant_theme": "El tema más mencionado en este lote (1 frase corta)",
    "main_friction": "La fricción o problema más recurrente, o null si no hay",
    "top_opportunity": "La oportunidad de contenido más clara detectada, o null si no hay"
  }}
}}"""

            response = await client.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {"role": "system", "content": "You are a strict Data Analyst that outputs ONLY valid JSON matching the requested schema. No explanations."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.10,
                max_tokens=6000,
                response_format={"type": "json_object"}
            )

            text = response.choices[0].message.content.strip()
            parsed = _extract_json_from_response(text)

            batch_results: list[dict] = []
            report = ""
            if isinstance(parsed, dict):
                batch_results = parsed.get("comments", [])
                raw_report = parsed.get("analysis_report", "")
                if isinstance(raw_report, dict):
                    # Serializar el report estructurado a string legible
                    parts = []
                    if raw_report.get("dominant_theme"):
                        parts.append(f"Tema dominante: {raw_report['dominant_theme']}")
                    if raw_report.get("main_friction"):
                        parts.append(f"Fricción principal: {raw_report['main_friction']}")
                    if raw_report.get("top_opportunity"):
                        parts.append(f"Oportunidad detectada: {raw_report['top_opportunity']}")
                    report = " · ".join(parts)
                elif isinstance(raw_report, str):
                    report = raw_report.strip()
            elif isinstance(parsed, list):
                batch_results = parsed

            return attach_batch_ids(batch, batch_results), report
        except Exception as e:
            logger.error(f"Error en análisis en lote con OpenAI: {str(e)}")
            return [], ""

    # Ejecuta hasta 5 consultas simultáneas a la API de DeepSeek
    semaphore = asyncio.Semaphore(5)

    async def _limited(batch: list[dict]) -> tuple[list[dict], str]:
        async with semaphore:
            return await process_single_batch(batch)

    batch_results_list = await asyncio.gather(*[_limited(b) for b in batches])

    for batch_res, batch_rep in batch_results_list:
        results.extend(batch_res)
        if batch_rep:
            all_batch_reports.append(batch_rep)

    # Consolidar todos los reportes de batches en uno solo coherente
    consolidated_report = _merge_batch_reports(all_batch_reports)

    return results, consolidated_report


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


async def generate_video_summary(
    transcript: str,
    video_title: Optional[str] = None,
    max_length: int = 1500,
) -> str:
    logger.info("[ASYNC] OpenAI: Generando resumen del video asíncronamente...")
    if not transcript or not has_openai_key():
        return ""

    client = _get_async_openai_client()
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
        response = await client.chat.completions.create(
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