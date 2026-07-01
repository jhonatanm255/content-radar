"""
Análisis contextual de comentarios usando Ollama (local).
Complementa el análisis actual con un modelo de lenguaje local.
"""
from __future__ import annotations

import json
import logging
from typing import Optional
from ollama import Client
from app.nlp.resonance import apply_resonance_to_result

logger = logging.getLogger(__name__)

# Cliente de Ollama (localhost:11434)
_client = Client(host="http://localhost:11434")
_model = "mistral:latest"  # Modelo local 4GB disponible en Ollama


def analyze_comment_with_context(
    comment_text: str,
    video_context: str,
    video_title: Optional[str] = None,
) -> dict:
    """
    Analiza un comentario usando Ollama con contexto del video.
    
    Args:
        comment_text: Texto del comentario
        video_context: Contexto/resumen del video
        video_title: Título del video (opcional)
    
    Returns:
        Dict con análisis enriquecido
    """
    try:
        title_line = f"Video: {video_title}\n" if video_title else ""
        
        prompt = f"""{title_line}Contexto del video:
{video_context}

Comentario del usuario:
"{comment_text}"

Analiza este comentario en relación al video. Responde en JSON con estos campos:
{{
    "relevance": "high" | "medium" | "low" (¿qué tan relacionado está con el video?),
    "sentiment": "positive" | "neutral" | "negative",
    "engagement_type": "resonance" | "support" | "criticism" | "question" | "suggestion" | "problem" | "neutral",
    "topic": "string" (tema principal que toca el comentario),
    "intent": "string" (qué intenta comunicar el usuario en 1-2 palabras),
    "key_phrase": "string" (frase clave si la hay),
    "explains_content": boolean (¿entiende realmente el contenido del video?)
}}

Responde SOLO el JSON, sin explicaciones adicionales."""
        
        response = _client.generate(
            model=_model,
            prompt=prompt,
            stream=False,
        )
        
        # Extraer JSON de la respuesta
        json_text = response["response"].strip()
        
        # Si viene en markdown code block, extraer el JSON
        if "```json" in json_text:
            json_text = json_text.split("```json")[1].split("```")[0].strip()
        elif "```" in json_text:
            json_text = json_text.split("```")[1].split("```")[0].strip()
        
        result = json.loads(json_text)
        return result
    
    except json.JSONDecodeError as e:
        logger.error(f"Error decodificando JSON de Ollama: {str(e)}")
        return {}
    except Exception as e:
        logger.error(f"Error analizando comentario con Ollama: {str(e)}")
        return {}


def batch_analyze_with_context(
    comments: list[dict],  # [{"id": str, "text": str}, ...]
    video_context: str,
    video_title: Optional[str] = None,
    max_batch: int = 10,
) -> list[dict]:
    """
    Analiza múltiples comentarios en lotes con Ollama.
    
    Args:
        comments: Lista de comentarios
        video_context: Contexto del video
        video_title: Título del video
        max_batch: Número de comentarios a procesar juntos
    
    Returns:
        Lista de análisis para cada comentario
    """
    results = []
    
    # Procesar en lotes para eficiencia
    for i in range(0, len(comments), max_batch):
        batch = comments[i : i + max_batch]
        
        try:
            # Preparar comentarios formateados
            comments_text = "\n".join(
                [f'{j+1}. "{c["text"]}"' for j, c in enumerate(batch)]
            )
            
            title_line = f"Video: {video_title}\n" if video_title else ""
            
            prompt = f"""{title_line}Contexto del video:
{video_context}

Analiza estos {len(batch)} comentarios en relación al video.
Responde con un JSON array donde cada elemento tiene la estructura:
{{
    "index": número (posición en la lista),
    "relevance": "high" | "medium" | "low",
    "sentiment": "positive" | "neutral" | "negative",
    "engagement_type": "resonance" | "support" | "criticism" | "question" | "suggestion" | "problem" | "neutral",
    "topic": "string",
    "intent": "string"
}}

Comentarios:
{comments_text}

Responde SOLO el JSON array, sin explicaciones."""
            
            response = _client.generate(
                model=_model,
                prompt=prompt,
                stream=False,
            )
            
            json_text = response["response"].strip()
            
            # Extraer JSON
            if "```json" in json_text:
                json_text = json_text.split("```json")[1].split("```")[0].strip()
            elif "```" in json_text:
                json_text = json_text.split("```")[1].split("```")[0].strip()
            
            batch_results = json.loads(json_text)
            results.extend(batch_results)
        
        except Exception as e:
            logger.error(f"Error en análisis en lote con Ollama: {str(e)}")
            # Continuar con el siguiente lote
            continue
    
    return results


def refine_analysis(
    base_analysis: dict,
    ollama_analysis: dict,
    video_title: Optional[str] = None,
) -> dict:
    """
    Combina análisis existente con el de Ollama para obtener resultado mejorado.
    
    Args:
        base_analysis: Análisis actual del sistema
        ollama_analysis: Análisis de Ollama
    
    Returns:
        Análisis combinado y mejorado
    """
    if not ollama_analysis:
        return base_analysis
    
    refined = base_analysis.copy()

    # Priorizar Ollama: si devuelve sentiment, sobrescribir el sentimiento base
    if ollama_analysis.get("sentiment"):
        refined["sentiment_ollama"] = ollama_analysis.get("sentiment")
        refined["sentiment"] = ollama_analysis.get("sentiment")

    # Guardar engagement_type devuelto por Ollama como auxiliar
    if ollama_analysis.get("engagement_type"):
        refined["engagement_type_ollama"] = ollama_analysis.get("engagement_type")

    # Añadir nuevos campos de contexto
    refined["topic_ollama"] = ollama_analysis.get("topic", "")
    refined["relevance_ollama"] = ollama_analysis.get("relevance", "")
    refined["intent_ollama"] = ollama_analysis.get("intent", "")
    refined["key_phrase"] = ollama_analysis.get("key_phrase", "")

    # Recalcular engagement/content_sentiment basados en el nuevo `sentiment`
    try:
        refined = apply_resonance_to_result(refined, refined.get("text", ""), video_title)
    except Exception:
        pass

    return refined
