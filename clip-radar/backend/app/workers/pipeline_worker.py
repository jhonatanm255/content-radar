import os
import traceback
import assemblyai as aai
from app.core.config import settings
from app.services.ffmpeg_service import FFmpegService
from app.services.deepseek_service import DeepSeekService
from supabase import create_client

def get_supabase():
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

def process_video_pipeline(project_id: str, local_video_path: str):
    """
    Ejecución del pipeline en background:
    1. Extracción de audio con FFmpeg
    2. Transcripción con AssemblyAI
    3. Detección de momentos virales con DeepSeek API
    4. Guardado en Supabase aislado
    """
    supabase = get_supabase()
    audio_path = f"/tmp/{project_id}.mp3"
    aai.settings.api_key = settings.ASSEMBLYAI_API_KEY

    try:
        # 1. Extracción de audio
        supabase.table("clip_projects").update({"status": "processing_audio"}).eq("id", project_id).execute()
        FFmpegService.extract_audio(local_video_path, audio_path)

        # 2. Transcripción con marcas de tiempo precisas
        supabase.table("clip_projects").update({"status": "transcribing"}).eq("id", project_id).execute()
        transcriber = aai.Transcriber()
        config = aai.TranscriptionConfig(
            language_detection=True
        )
        transcript = transcriber.transcribe(audio_path, config=config)

        if transcript.status == aai.TranscriptStatus.error:
            raise RuntimeError(f"AssemblyAI Error: {transcript.error}")

        # Estructurar párrafos y marcas de tiempo
        segments = []
        try:
            paragraphs = transcript.get_paragraphs()
            for paragraph in paragraphs:
                segments.append({
                    "start": paragraph.start / 1000.0,
                    "end": paragraph.end / 1000.0,
                    "text": paragraph.text
                })
        except Exception as pe:
            print(f"[pipeline_worker] Notice extracting paragraphs: {pe}")

        # Fallback a oraciones si los párrafos están vacíos
        if not segments:
            try:
                sentences = transcript.get_sentences()
                for s in sentences:
                    segments.append({
                        "start": s.start / 1000.0,
                        "end": s.end / 1000.0,
                        "text": s.text
                    })
            except Exception as se:
                print(f"[pipeline_worker] Notice extracting sentences: {se}")

        # Fallback a texto completo si no hay divisiones
        if not segments and transcript.text:
            segments.append({
                "start": 0.0,
                "end": float(transcript.audio_duration or 60.0),
                "text": transcript.text
            })

        # Almacenar transcripción completa y duración
        supabase.table("clip_projects").update({
            "duration_seconds": transcript.audio_duration
        }).eq("id", project_id).execute()

        supabase.table("clip_transcriptions").insert({
            "project_id": project_id,
            "full_text": transcript.text or "",
            "segments": segments
        }).execute()

        # 3. Análisis con DeepSeek API
        supabase.table("clip_projects").update({"status": "analyzing"}).eq("id", project_id).execute()
        deepseek = DeepSeekService()
        highlights = deepseek.extract_highlights(segments)

        # 4. Guardar sugerencias de clips en Supabase
        for clip in highlights:
            supabase.table("clip_items").insert({
                "project_id": project_id,
                "title": clip.get("title", "Clip Destacado"),
                "hook_sentence": clip.get("hook_sentence", ""),
                "summary": clip.get("summary", ""),
                "start_time": clip.get("start_time", 0.0),
                "end_time": clip.get("end_time", 30.0),
                "virality_score": clip.get("virality_score", 85),
                "virality_reason": clip.get("virality_reason", ""),
                "status": "suggested"
            }).execute()

        # Marcar como listo
        supabase.table("clip_projects").update({"status": "ready"}).eq("id", project_id).execute()

    except Exception as e:
        print(f"[pipeline_worker] Error processing video {project_id}: {e}")
        traceback.print_exc()
        supabase.table("clip_projects").update({
            "status": "failed",
            "error_message": str(e)
        }).eq("id", project_id).execute()
    finally:
        # Limpieza de temporales locales
        if os.path.exists(audio_path):
            try:
                os.remove(audio_path)
            except Exception:
                pass
        if os.path.exists(local_video_path):
            try:
                os.remove(local_video_path)
            except Exception:
                pass
