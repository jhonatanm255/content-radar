"""
Módulo para extraer contexto de videos de YouTube (transcripción y resumen).
"""
from __future__ import annotations

import logging
from typing import Optional
import httpx
import google.generativeai as genai
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled
try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

from app.config import get_settings

logger = logging.getLogger(__name__)

# Configurar Gemini y Deep Seek (APIs en la nube)
_settings = get_settings()
if _settings.get("gemini_api_key"):
    genai.configure(api_key=_settings["gemini_api_key"])

_deepseek_client: Optional[OpenAI] = None
if _settings.get("openai_api_key") and OpenAI:
    _deepseek_client = OpenAI(
        api_key=_settings["openai_api_key"],
        base_url="https://api.deepseek.com/v1"
    )


def extract_video_id(url_or_id: str) -> str:
    """Extrae el video ID de una URL de YouTube o retorna el ID si ya lo es."""
    if "youtube.com/watch?v=" in url_or_id:
        return url_or_id.split("v=")[1].split("&")[0]
    elif "youtu.be/" in url_or_id:
        return url_or_id.split("youtu.be/")[1].split("?")[0]
    return url_or_id


def get_youtube_transcript(video_id: str, language: str = "es") -> Optional[str]:
    """
    Obtiene la transcripción de un video de YouTube.
    
    Args:
        video_id: ID del video de YouTube
        language: Idioma preferido (ej: 'es', 'en')
    
    Returns:
        Transcripción completa o None si no está disponible
    """
    try:
        video_id = extract_video_id(video_id)

        # Intentar varios métodos de extracción para soportar distintas versiones
        transcript_list = None

        # 1) API más directa (presente en versiones modernas)
        try:
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=[language])
        except AttributeError:
            # La clase no tiene ese método en algunas versiones
            transcript_list = None
        except Exception:
            transcript_list = None

        # 2) Intentar list_transcripts -> find_transcript -> fetch
        if transcript_list is None:
            try:
                transcripts = YouTubeTranscriptApi.list_transcripts(video_id)
                try:
                    t = transcripts.find_transcript([language])
                except Exception:
                    # fallback a cualquier transcript disponible
                    t = transcripts.find_transcript(transcripts._translations.keys())
                transcript_list = t.fetch()
            except Exception:
                transcript_list = None

        # 3) Intentar get_transcript sin idioma
        if transcript_list is None:
            try:
                transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
            except Exception:
                transcript_list = None

        if not transcript_list:
            raise Exception("No se pudo obtener transcripción con los métodos disponibles")

        # Combinar todos los segmentos en un solo texto
        transcript = " ".join([item.get("text", "") for item in transcript_list])
        return transcript

    except TranscriptsDisabled:
        logger.warning(f"Transcripciones deshabilitadas para video {video_id}")
        return None
    except Exception as e:
        logger.error(f"Error extrayendo transcripción de {video_id}: {str(e)}")
        return None


def generate_video_summary(
    transcript: str,
    video_title: Optional[str] = None,
    max_length: int = 500,
) -> str:
    """
    Genera un resumen del video usando Deep Seek o Gemini.
    Prioriza APIs en la nube sobre opciones locales.

    Args:
        transcript: Transcripción completa del video
        video_title: Título del video (opcional, para contexto)
        max_length: Longitud máxima del resumen en caracteres

    Returns:
        Resumen del contenido del video
    """
    if not transcript:
        return ""

    title_context = f"Título del video: {video_title}\n\n" if video_title else ""
    source_text = transcript[:12000] if len(transcript) > 12000 else transcript
    prompt = f"""{title_context}Transcripción del video:

{source_text}

Por favor, genera un resumen conciso (máximo {max_length} caracteres) del contenido de este video.
El resumen debe capturar los puntos principales, el tema central y el tono del contenido.
Mantén el idioma español."""

    # 1. Intentar Deep Seek primero (mejor relación precio-calidad)
    if _deepseek_client:
        try:
            logger.info("Generando resumen con Deep Seek...")
            response = _deepseek_client.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {"role": "system", "content": "Eres un generador de resúmenes experto. Sé conciso y preciso."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.2,
                max_tokens=300,
            )
            summary = response.choices[0].message.content.strip()
            if len(summary) > max_length:
                summary = summary[:max_length].rstrip() + "..."
            logger.info("✓ Resumen generado con Deep Seek")
            return summary
        except Exception as e:
            logger.warning(f"Error con Deep Seek, probando Gemini: {str(e)}")

    # 2. Fallback a Gemini
    if _settings.get("gemini_api_key"):
        try:
            logger.info("Generando resumen con Gemini...")
            model = genai.GenerativeModel("gemini-2.5-flash")
            response = model.generate_content(prompt)
            summary = response.text
            if len(summary) > max_length:
                summary = summary[:max_length] + "..."
            logger.info("✓ Resumen generado con Gemini")
            return summary
        except Exception as e:
            logger.error(f"Error generando resumen con Gemini: {str(e)}")

    logger.warning("No se pudo generar resumen: Deep Seek y Gemini no disponibles")
    return ""


def _transcript_excerpt(transcript: str, max_chars: int = 3000) -> str:
    """Extrae inicio y final de la transcripción para contexto rico sin exceder límites."""
    if len(transcript) <= max_chars:
        return transcript
    half = max_chars // 2
    return (
        f"{transcript[:half].rstrip()} … "
        f"[transcripción truncada] … "
        f"{transcript[-half:].lstrip()}"
    )


def build_full_context(
    video_title: Optional[str],
    summary: Optional[str],
    transcript: Optional[str],
    description: Optional[str],
    max_chars: int = 4000,
) -> str:
    parts: list[str] = []
    if video_title:
        parts.append(f"Video: {video_title}")
    if summary:
        parts.append(f"Resumen: {summary}")
    if transcript:
        parts.append(f"Extracto de transcripción:\n{_transcript_excerpt(transcript, 2800)}")
    elif description:
        parts.append(f"Descripción: {description[:1500]}")

    full = "\n\n".join(parts)
    return full[:max_chars] if len(full) > max_chars else full


def fetch_video_description(video_id: str) -> Optional[str]:
    settings = get_settings()
    api_key = settings.get("youtube_api_key")
    if not api_key:
        return None

    try:
        response = httpx.get(
            "https://www.googleapis.com/youtube/v3/videos",
            params={
                "part": "snippet",
                "id": video_id,
                "key": api_key,
            },
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
        items = data.get("items", [])
        if not items:
            return None
        snippet = items[0].get("snippet", {})
        description = snippet.get("description", "")
        return description.strip() or None
    except Exception as e:
        logger.warning(f"No se pudo obtener descripción de YouTube para {video_id}: {e}")
        return None


def get_video_context(
    video_id: str,
    video_title: Optional[str] = None,
    use_transcript: bool = True,
    use_summary: bool = True,
) -> dict:
    """
    Obtiene el contexto completo de un video (transcripción + resumen).

    Args:
        video_id: ID del video de YouTube
        video_title: Título del video
        use_transcript: Si obtener la transcripción
        use_summary: Si generar resumen

    Returns:
        Dict con 'transcript', 'summary' y 'full_context'
    """
    transcript = None
    summary = None
    description = None

    if use_transcript:
        transcript = get_youtube_transcript(video_id)

    if use_summary and transcript:
        summary = generate_video_summary(transcript, video_title)

    if not transcript and use_summary:
        description = fetch_video_description(video_id)
        if description:
            summary = generate_video_summary(description, video_title)
            logger.info(f"Resumen generado a partir de descripción de video {video_id}")

    # Construir contexto enriquecido para análisis LLM
    full_context = build_full_context(video_title, summary, transcript, description)

    return {
        "transcript": transcript,
        "summary": summary,
        "full_context": full_context,
    }
