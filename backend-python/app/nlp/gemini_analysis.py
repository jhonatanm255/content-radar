"""
Análisis contextual de comentarios usando Gemini.
Complementa el análisis actual con un modelo de lenguaje.
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Optional
import google.generativeai as genai

from app.config import get_settings
from app.nlp.llm_enrichment import attach_batch_ids

logger = logging.getLogger(__name__)

_settings = get_settings()
if _settings.get("gemini_api_key"):
    genai.configure(api_key=_settings["gemini_api_key"])


def has_gemini_key() -> bool:
    """Verifica si Gemini API key está configurada."""
    return bool(_settings.get("gemini_api_key"))


def _merge_batch_reports(reports: list[str]) -> str:
    """
    Fusiona los reportes estructurados de múltiples batches en un resumen único.
    """
    if not reports:
        return ""
    if len(reports) == 1:
        return reports[0]
    return " // ".join(r for r in reports if r)


async def analyze_comment_with_context(
    comment_text: str,
    video_context: str,
    video_title: Optional[str] = None,
) -> dict:
    """
    Analiza un comentario usando Gemini con contexto del video.

    Args:
        comment_text: Texto del comentario
        video_context: Contexto/resumen del video
        video_title: Título del video (opcional)

    Returns:
        Dict con análisis enriquecido
    """
    if not _settings.get("gemini_api_key"):
        return {}

    try:
        model = genai.GenerativeModel("gemini-2.5-flash")

        cleaned_context = (
            video_context
            .replace("\n\n\n", "\n")
            .replace("\n\n", "\n")
            .replace("\r\r", "\r")
            .replace("\r", "")
            .strip()
        )[:3500]

        title_line = f"Video: {video_title}\n" if video_title else ""

        prompt = f"""{title_line}Contexto del video:
{cleaned_context}

---

Comentario del usuario (ÚNICO, no histórico):
"{comment_text}"

---

INSTRUCCIONES CRÍTICAS:
- Este es un análisis NUEVO
- NO reutilices análisis anteriores
- Analiza SOLO este comentario
- Responde EXCLUSIVAMENTE en JSON, sin explicaciones

[DEFINICIÓN DE engagement_type - LEE CON ATENCIÓN]
- "resonance": El comentario REPITE o ECO una frase, idea o emoción del video. NO es crítica al creador.
- "support": Elogio o apoyo EXPLÍCITO al creador o al contenido.
- "criticism": Crítica DIRECTA al creador, formato, calidad o decisiones del video.
- "question": El viewer hace una pregunta genuina sobre el tema o contenido.
- "suggestion": El viewer propone contenido nuevo, un cambio o mejora.
- "problem": El viewer reporta un error, bug, falla técnica o dificultad concreta.
- "neutral": Comentario sin intención clara (spam, off-topic, emoji solo).

[NORMALIZACIÓN DE TEMAS]
- "topic" debe ser el tema canónico, en español, capitalizado (ej: "Kubernetes", no "k8s").
- Si es off-topic o vacío, usa "General".

Responde en JSON con estos campos:
{{
    "relevance": "high" | "medium" | "low",
    "sentiment": "positive" | "neutral" | "negative",
    "engagement_type": "resonance" | "support" | "criticism" | "question" | "suggestion" | "problem" | "neutral",
    "topic": "string",
    "intent": "string",
    "key_phrase": "string",
    "explains_content": boolean
}}"""

        response = await model.generate_content_async(prompt, safety_settings=None)

        json_text = response.text.strip()

        if "```json" in json_text:
            json_text = json_text.split("```json")[1].split("```")[0].strip()
        elif "```" in json_text:
            json_text = json_text.split("```")[1].split("```")[0].strip()

        result = json.loads(json_text)
        return result

    except json.JSONDecodeError as e:
        logger.error(f"Error decodificando JSON de Gemini: {str(e)}")
        return {}
    except Exception as e:
        logger.error(f"Error analizando comentario con Gemini: {str(e)}")
        return {}


def _extract_json_from_response(response_text: str) -> dict | list:
    json_text = response_text.strip()
    if "```json" in json_text:
        json_text = json_text.split("```json")[1].split("```")[0].strip()
    elif "```" in json_text:
        json_text = json_text.split("```")[1].split("```")[0].strip()

    try:
        return json.loads(json_text)
    except json.JSONDecodeError:
        start = json_text.find("{")
        end = json_text.rfind("}")
        if start != -1 and end != -1 and start < end:
            try:
                return json.loads(json_text[start : end + 1])
            except Exception:
                pass
        raise


async def batch_analyze_with_context(
    comments: list[dict],  # [{"id": str, "text": str}, ...]
    video_context: str,
    video_title: Optional[str] = None,
    max_batch: int = 40,
) -> tuple[list[dict], str]:
    if not _settings.get("gemini_api_key"):
        return [], ""

    results: list[dict] = []
    all_batch_reports: list[str] = []

    cleaned_context = (
        video_context
        .replace("\n\n\n", "\n")
        .replace("\r", "")
        .strip()
    )[:3500]

    batches = [comments[i : i + max_batch] for i in range(0, len(comments), max_batch)]

    logger.info(f"[ASYNC] Gemini: Iniciando análisis asíncrono de {len(batches)} lotes...")

    async def process_single_batch(batch: list[dict]) -> tuple[list[dict], str]:
        logger.info(f"[ASYNC] Gemini: Procesando lote de {len(batch)} comentarios...")
        try:
            model = genai.GenerativeModel(
                "gemini-2.5-flash",
                generation_config={"temperature": 0.15},
            )

            comments_text = "\n".join(
                [
                    f'{j}. id="{c["id"]}" texto="{c["text"].strip()[:600]}"'
                    for j, c in enumerate(batch)
                ]
            )

            title_line = f"Video: {video_title}\n" if video_title else ""

            prompt = f"""{title_line}Contexto del video:
{cleaned_context}

---

Analiza estos {len(batch)} comentarios en relación al video.
Usa el campo "id" exacto de cada comentario en la respuesta.

[DEFINICIÓN DE engagement_type - LEE CON ATENCIÓN]
- "resonance": El comentario REPITE o ECO una frase, idea o emoción del video. NO es crítica al creador.
- "support": Elogio o apoyo EXPLÍCITO al creador o al contenido.
- "criticism": Crítica DIRECTA al creador, formato, calidad o decisiones del video.
- "question": El viewer hace una pregunta genuina sobre el tema o contenido.
- "suggestion": El viewer propone contenido nuevo, un cambio o mejora.
- "problem": El viewer reporta un error, bug, falla técnica o dificultad concreta.
- "neutral": Comentario sin intención clara (spam, off-topic, emoji solo).

[NORMALIZACIÓN DE TEMAS]
- "topic" debe ser el tema canónico, en español, capitalizado (ej: "Kubernetes", no "k8s").
- Agrupa sinónimos bajo un nombre canónico.
- Si es off-topic o vacío, usa "General".

Responde SOLO JSON:
{{
    "comments": [
        {{
            "id": "id exacto del comentario",
            "relevance": "high" | "medium" | "low",
            "sentiment": "positive" | "neutral" | "negative",
            "engagement_type": "resonance" | "support" | "criticism" | "question" | "suggestion" | "problem" | "neutral",
            "topic": "string canónico en español",
            "intent": "string",
            "key_phrase": "string"
        }}
    ],
    "analysis_report": {{
        "dominant_theme": "El tema más mencionado en este lote (1 frase corta en español)",
        "main_friction": "La fricción o problema más recurrente, o null si no hay",
        "top_opportunity": "La oportunidad de contenido más clara detectada, o null si no hay"
    }}
}}

Comentarios:
{comments_text}

RESPONDE SOLO JSON, SIN PREFACIO O EXPLICACIONES."""

            response = await model.generate_content_async(prompt, safety_settings=None)
            parsed = _extract_json_from_response(response.text)

            batch_results: list[dict] = []
            report = ""
            if isinstance(parsed, dict):
                if isinstance(parsed.get("comments"), list):
                    batch_results = parsed.get("comments", [])
                elif isinstance(parsed, list):
                    batch_results = parsed
                raw_report = parsed.get("analysis_report", "")
                if isinstance(raw_report, dict):
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
            logger.error(f"Error en análisis en lote con Gemini: {str(e)}")
            return [], ""

    # Limitar concurrencia a 4 llamadas simultáneas a Gemini
    semaphore = asyncio.Semaphore(4)

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
    gemini_analysis: dict,
) -> dict:
    """
    Combina análisis existente con el de Gemini para obtener resultado mejorado.

    Args:
        base_analysis: Análisis actual del sistema
        gemini_analysis: Análisis de Gemini

    Returns:
        Análisis combinado y mejorado
    """
    if not gemini_analysis:
        return base_analysis

    refined = base_analysis.copy()

    if gemini_analysis.get("sentiment"):
        refined["sentiment_gemini"] = gemini_analysis.get("sentiment")
        refined["sentiment"] = gemini_analysis.get("sentiment")

    if gemini_analysis.get("engagement_type"):
        refined["engagement_type_gemini"] = gemini_analysis.get("engagement_type")
        refined["engagement_type"] = gemini_analysis.get("engagement_type")

    refined["topic_gemini"] = gemini_analysis.get("topic", "")
    refined["relevance_gemini"] = gemini_analysis.get("relevance", "")
    refined["intent_gemini"] = gemini_analysis.get("intent", "")
    refined["key_phrase"] = gemini_analysis.get("key_phrase", "")

    return refined
