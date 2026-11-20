from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import shutil
import os
import uuid
import time
import re

try:
    import static_ffmpeg
    static_ffmpeg.add_paths()
except Exception:
    pass

from app.core.config import settings
from app.workers.pipeline_worker import process_video_pipeline, get_supabase
from app.services.deepseek_service import DeepSeekService
from app.services.ffmpeg_service import FFmpegService
from app.services.r2_storage_service import R2StorageService

app = FastAPI(
    title="ClipRadar Autonomous Microservice",
    description="Microservicio desacoplado para corte inteligente de videos y generación de clips virales",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "clip-radar-api"}

@app.post("/api/v1/videos/upload")
async def upload_video(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    supabase = get_supabase()
    project_id = str(uuid.uuid4())
    temp_dir = f"/tmp/{project_id}"
    os.makedirs(temp_dir, exist_ok=True)
    local_path = os.path.join(temp_dir, file.filename)

    with open(local_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    storage_path = f"raw_videos/{project_id}_{file.filename}"
    
    # Subida al bucket dedicado en Cloudflare R2
    public_url = R2StorageService.upload_file(local_path, storage_path, content_type=file.content_type or "video/mp4")

    # Insertar en tabla clip_projects
    supabase.table("clip_projects").insert({
        "id": project_id,
        "title": file.filename,
        "original_video_url": public_url,
        "original_storage_path": storage_path,
        "status": "uploaded"
    }).execute()

    # Ejecutar pipeline en background
    background_tasks.add_task(process_video_pipeline, project_id, local_path)

    return {"project_id": project_id, "status": "processing_queued"}


@app.get("/api/v1/projects")
async def list_projects():
    supabase = get_supabase()
    res = supabase.table("clip_projects").select("*, clip_items(id, status)").order("created_at", desc=True).execute()
    projects = []
    for item in (res.data or []):
        clips = item.pop("clip_items", []) or []
        item["clip_count"] = len(clips)
        item["completed_clips_count"] = sum(1 for c in clips if c.get("status") == "completed")
        if not item.get("original_video_url") and item.get("original_storage_path"):
            item["original_video_url"] = R2StorageService.get_public_url(item["original_storage_path"])
        projects.append(item)
    return {"projects": projects}


@app.get("/api/v1/projects/{project_id}")
async def get_project_status(project_id: str):
    supabase = get_supabase()
    proj = supabase.table("clip_projects").select("*").eq("id", project_id).single().execute()
    if not proj.data:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    project_data = proj.data
    if not project_data.get("original_video_url") and project_data.get("original_storage_path"):
        project_data["original_video_url"] = R2StorageService.get_public_url(project_data["original_storage_path"])
    
    clips = supabase.table("clip_items").select("*").eq("project_id", project_id).order("virality_score", desc=True).execute()
    return {
        "project": project_data,
        "clips": clips.data or []
    }


class BatchDeleteProjectsRequest(BaseModel):
    project_ids: list[str]


@app.delete("/api/v1/projects/{project_id}")
async def delete_project(project_id: str):
    supabase = get_supabase()
    proj_res = supabase.table("clip_projects").select("*").eq("id", project_id).single().execute()
    if not proj_res.data:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    project = proj_res.data
    # Eliminar video original de R2
    if project.get("original_storage_path"):
        R2StorageService.delete_file(project["original_storage_path"])

    # Eliminar clips exportados de R2
    clips_res = supabase.table("clip_items").select("output_storage_path").eq("project_id", project_id).execute()
    for clip in (clips_res.data or []):
        if clip.get("output_storage_path"):
            R2StorageService.delete_file(clip["output_storage_path"])

    # Eliminar de la base de datos (ON DELETE CASCADE limpia tablas relacionadas)
    supabase.table("clip_projects").delete().eq("id", project_id).execute()
    return {"status": "success", "deleted_id": project_id}


@app.post("/api/v1/projects/batch-delete")
async def batch_delete_projects(body: BatchDeleteProjectsRequest):
    if not body.project_ids:
        return {"status": "success", "deleted_count": 0}

    supabase = get_supabase()
    for pid in body.project_ids:
        try:
            proj_res = supabase.table("clip_projects").select("original_storage_path").eq("id", pid).single().execute()
            if proj_res.data and proj_res.data.get("original_storage_path"):
                R2StorageService.delete_file(proj_res.data["original_storage_path"])

            clips_res = supabase.table("clip_items").select("output_storage_path").eq("project_id", pid).execute()
            for clip in (clips_res.data or []):
                if clip.get("output_storage_path"):
                    R2StorageService.delete_file(clip["output_storage_path"])
        except Exception as e:
            print(f"[batch_delete] Error eliminando archivos del proyecto {pid}: {e}")

    supabase.table("clip_projects").delete().in_("id", body.project_ids).execute()
    return {"status": "success", "deleted_count": len(body.project_ids)}


class ChatRefineRequest(BaseModel):
    project_id: str
    user_prompt: str

@app.post("/api/v1/clips/refine")
async def refine_clips(body: ChatRefineRequest):
    supabase = get_supabase()
    res = supabase.table("clip_transcriptions").select("segments").eq("project_id", body.project_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Transcripción no encontrada")

    deepseek = DeepSeekService()
    new_clips = deepseek.refine_with_prompt(res.data["segments"], body.user_prompt)

    inserted = []
    for c in new_clips:
        item = supabase.table("clip_items").insert({
            "project_id": body.project_id,
            "title": c.get("title", "Clip Personalizado"),
            "hook_sentence": c.get("hook_sentence", ""),
            "summary": c.get("summary", ""),
            "start_time": c.get("start_time", 0.0),
            "end_time": c.get("end_time", 30.0),
            "virality_score": c.get("virality_score", 90),
            "virality_reason": c.get("virality_reason", "Generado por prompt personalizado"),
            "status": "suggested"
        }).execute()
        if item.data:
            inserted.append(item.data[0])

    supabase.table("clip_chat_history").insert({
        "project_id": body.project_id,
        "user_prompt": body.user_prompt,
        "ai_response_summary": f"Generados {len(new_clips)} clips"
    }).execute()

    return {"clips": inserted}


class UpdateClipRequest(BaseModel):
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    title: Optional[str] = None

@app.patch("/api/v1/clips/{clip_id}")
async def update_clip(clip_id: str, body: UpdateClipRequest):
    supabase = get_supabase()
    payload = {}
    if body.start_time is not None:
        payload["start_time"] = body.start_time
    if body.end_time is not None:
        payload["end_time"] = body.end_time
    if body.title is not None:
        payload["title"] = body.title

    if not payload:
        raise HTTPException(status_code=400, detail="No se enviaron datos para actualizar")

    res = supabase.table("clip_items").update(payload).eq("id", clip_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Clip no encontrado")
    return {"status": "success", "clip": res.data[0]}


class ExportClipRequest(BaseModel):
    clip_id: str
    aspect_ratio: str = "9:16"
    crop_x_percent: float = 50.0  # 0.0 izquierda, 50.0 centro, 100.0 derecha
    start_time: Optional[float] = None
    end_time: Optional[float] = None

@app.post("/api/v1/clips/export")
async def export_and_clean_video(body: ExportClipRequest, background_tasks: BackgroundTasks):
    supabase = get_supabase()
    clip_res = supabase.table("clip_items").select("*, clip_projects(*)").eq("id", body.clip_id).single().execute()
    if not clip_res.data:
        raise HTTPException(status_code=404, detail="Clip no encontrado")

    clip = clip_res.data
    project = clip["clip_projects"]

    # Determinar tiempos finales (tomando los ajustados manualmente por el usuario si existen)
    start_t = float(body.start_time) if body.start_time is not None else float(clip["start_time"])
    end_t = float(body.end_time) if body.end_time is not None else float(clip["end_time"])

    # Actualizar estado e inicios/fines en la BD si fueron modificados por el usuario
    update_data = {
        "status": "rendering",
        "start_time": start_t,
        "end_time": end_t
    }
    supabase.table("clip_items").update(update_data).eq("id", body.clip_id).execute()

    def run_export_and_cleanup():
        temp_input = f"/tmp/in_{clip['id']}.mp4"
        temp_output = f"/tmp/out_{clip['id']}.mp4"
        try:
            # 1. Descargar video original desde Cloudflare R2
            if not project.get("original_storage_path"):
                raise RuntimeError("El archivo de video original ya ha sido eliminado para ahorrar espacio.")
            
            R2StorageService.download_file(project["original_storage_path"], temp_input)

            # 2. Recorte y ajuste de proporción con encuadre horizontal y tiempos personalizados
            FFmpegService.cut_clip(
                temp_input,
                temp_output,
                start_t,
                end_t,
                body.aspect_ratio,
                crop_x_percent=body.crop_x_percent
            )

            # Si ya existía un clip exportado previamente en R2, borrarlo para no consumir almacenamiento innecesario
            if clip.get("output_storage_path"):
                try:
                    R2StorageService.delete_file(clip["output_storage_path"])
                except Exception as del_err:
                    print(f"[export_clip] Notice limpiando clip previo en R2: {del_err}")

            # 3. Subir nuevo clip recortado a Cloudflare R2 con sufijo de tiempo para invalidar caché del navegador
            timestamp = int(time.time())
            clip_storage_path = f"exported_clips/{clip['id']}_{timestamp}.mp4"
            clip_url = R2StorageService.upload_file(temp_output, clip_storage_path, content_type="video/mp4")

            supabase.table("clip_items").update({
                "status": "completed",
                "output_video_url": clip_url,
                "output_storage_path": clip_storage_path,
                "aspect_ratio": body.aspect_ratio,
                "start_time": start_t,
                "end_time": end_t
            }).eq("id", body.clip_id).execute()

        except Exception as e:
            print(f"[export_clip] Error renderizando clip {clip['id']}: {e}")
            import traceback
            traceback.print_exc()
            supabase.table("clip_items").update({"status": "failed"}).eq("id", body.clip_id).execute()
        finally:
            if os.path.exists(temp_input):
                try: os.remove(temp_input)
                except Exception: pass
            if os.path.exists(temp_output):
                try: os.remove(temp_output)
                except Exception: pass

    background_tasks.add_task(run_export_and_cleanup)
    return {"message": "Exportación iniciada exitosamente"}


@app.get("/api/v1/clips/{clip_id}/download")
async def download_clip_file(clip_id: str):
    import unicodedata
    supabase = get_supabase()
    clip_res = supabase.table("clip_items").select("*").eq("id", clip_id).single().execute()
    if not clip_res.data:
        raise HTTPException(status_code=404, detail="Clip no encontrado")

    clip = clip_res.data
    storage_path = clip.get("output_storage_path")
    if not storage_path:
        raise HTTPException(status_code=400, detail="Este clip aún no ha sido exportado a R2")

    raw_title = clip.get("title", f"clip_{clip_id[:8]}")
    # Normalizar acentos a caracteres ASCII estándar (ej. 'sabía' -> 'sabia')
    normalized = unicodedata.normalize('NFKD', raw_title).encode('ASCII', 'ignore').decode('utf-8')
    clean_title = re.sub(r'[^a-zA-Z0-9_\- ]', '', normalized).strip() or f"clip_{clip_id[:8]}"
    clean_title = clean_title.replace(" ", "_")
    filename = f"{clean_title}.mp4"

    try:
        obj = R2StorageService.get_object(storage_path)
        content_length = obj.get("ContentLength")
        headers = {
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Accept-Ranges": "bytes"
        }
        if content_length:
            headers["Content-Length"] = str(content_length)

        def iter_chunks():
            for chunk in obj["Body"].iter_chunks(chunk_size=128 * 1024):
                yield chunk

        return StreamingResponse(
            iter_chunks(),
            media_type="video/mp4",
            headers=headers
        )
    except Exception as e:
        print(f"[download_clip] Error obteniendo {storage_path} de R2: {e}")
        raise HTTPException(status_code=500, detail=f"Error obteniendo video de Cloudflare R2: {e}")


@app.delete("/api/v1/clips/{clip_id}")
async def delete_single_clip(clip_id: str):
    supabase = get_supabase()
    clip_res = supabase.table("clip_items").select("*").eq("id", clip_id).single().execute()
    if not clip_res.data:
        raise HTTPException(status_code=404, detail="Clip no encontrado")

    clip = clip_res.data
    # 1. Eliminar archivo renderizado de Cloudflare R2 si existe
    if clip.get("output_storage_path"):
        try:
            R2StorageService.delete_file(clip["output_storage_path"])
        except Exception as e:
            print(f"[delete_clip] Error borrando archivo {clip['output_storage_path']} en R2: {e}")

    # 2. Eliminar registro de Supabase
    supabase.table("clip_items").delete().eq("id", clip_id).execute()
    return {"status": "success", "deleted_id": clip_id}

