"""
Análisis contextual de comentarios usando Gemini.
Complementa el análisis actual con un modelo de lenguaje.
"""
from __future__ import annotations

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


def analyze_comment_with_context(
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
        
        # Limpiar extremadamente el contexto
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
        
        response = model.generate_content(prompt, safety_settings=None)
        
        # Extraer JSON de la respuesta
        json_text = response.text.strip()
        
        # Si viene en markdown code block, extraer el JSON
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


def batch_analyze_with_context(
    comments: list[dict],  # [{"id": str, "text": str}, ...]
    video_context: str,
    video_title: Optional[str] = None,
    max_batch: int = 10,
) -> tuple[list[dict], str]:
    """
    Analiza múltiples comentarios en lotes con Gemini.
    
    Args:
        comments: Lista de comentarios
        video_context: Contexto del video
        video_title: Título del video
        max_batch: Número de comentarios a procesar juntos
    
    Returns:
        Tuple con la lista de análisis para cada comentario y un resumen estratégico.
    """
    if not _settings.get("gemini_api_key"):
        return [], ""
    
    results: list[dict] = []
    analysis_report = ""
    
    cleaned_context = (
        video_context
        .replace("\n\n\n", "\n")
        .replace("\r", "")
        .strip()
    )[:3500]
    
    for i in range(0, len(comments), max_batch):
        batch = comments[i : i + max_batch]
        try:
            model = genai.GenerativeModel(
                "gemini-2.5-flash",
                generation_config={"temperature": 0.15},
            )
            
            comments_text = "\n".join(
                [
                    f'{j}. id="{c["id"]}" texto="{c["text"].strip()[:800]}"'
                    for j, c in enumerate(batch)
                ]
            )
            
            title_line = f"Video: {video_title}\n" if video_title else ""
            
            prompt = f"""{title_line}Contexto del video:
{cleaned_context}

---

Analiza estos {len(batch)} comentarios en relación al video.
Usa el campo "id" exacto de cada comentario en la respuesta.
"resonance" = eco del hook/título, no crítica al creador.

Responde SOLO JSON:
{{
    "comments": [
        {{
            "id": "id exacto del comentario",
            "relevance": "high" | "medium" | "low",
            "sentiment": "positive" | "neutral" | "negative",
            "engagement_type": "resonance" | "support" | "criticism" | "question" | "suggestion" | "problem" | "neutral",
            "topic": "string",
            "intent": "string",
            "key_phrase": "string"
        }}
    ],
    "analysis_report": "resumen de patrones clave (máx 100 palabras)"
}}

Comentarios:
{comments_text}

RESPONDE SOLO JSON, SIN PREFACIO O EXPLICACIONES."""
            
            response = model.generate_content(prompt, safety_settings=None)
            parsed = _extract_json_from_response(response.text)

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
            logger.error(f"Error en análisis en lote: {str(e)}")
            continue
    
    return results, analysis_report


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
