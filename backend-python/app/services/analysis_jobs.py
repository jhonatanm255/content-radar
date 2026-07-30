from __future__ import annotations

import asyncio
import threading
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Callable, Literal, Optional

JobStatus = Literal["queued", "processing", "completed", "failed", "cancelled"]


@dataclass
class AnalysisJobRecord:
    id: str
    user_id: str
    status: JobStatus = "queued"
    progress: float = 0.0
    message: str = "En cola"
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)
    result: Optional[dict[str, Any]] = None
    error: Optional[str] = None
    task: Optional[asyncio.Task] = None


class AnalysisJobStore:
    def __init__(self) -> None:
        self._jobs: dict[str, AnalysisJobRecord] = {}
        self._lock = threading.Lock()

    def create(self, user_id: str) -> AnalysisJobRecord:
        job = AnalysisJobRecord(id=str(uuid.uuid4()), user_id=user_id)
        with self._lock:
            self._jobs[job.id] = job
        return job

    def get(self, job_id: str) -> Optional[AnalysisJobRecord]:
        with self._lock:
            return self._jobs.get(job_id)

    def update(
        self,
        job_id: str,
        *,
        status: Optional[JobStatus] = None,
        progress: Optional[float] = None,
        message: Optional[str] = None,
        result: Optional[dict[str, Any]] = None,
        error: Optional[str] = None,
        task: Optional[asyncio.Task] = None,
    ) -> Optional[AnalysisJobRecord]:
        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return None
            if status is not None:
                job.status = status
            if progress is not None:
                job.progress = max(0.0, min(1.0, progress))
            if message is not None:
                job.message = message
            if result is not None:
                job.result = result
            if error is not None:
                job.error = error
            if task is not None:
                job.task = task
            job.updated_at = time.time()
            return job


analysis_job_store = AnalysisJobStore()


async def run_analysis_job(
    job_id: str,
    runner: Callable[..., Any],
) -> None:
    """Ejecuta runner() de forma async y persiste el resultado en el job store."""
    analysis_job_store.update(job_id, status="processing", progress=0.08, message="Procesando")

    def on_progress(message: str, progress: float) -> None:
        analysis_job_store.update(job_id, progress=progress, message=message)

    try:
        # El runner ya es async, lo ejecutamos directamente
        payload = await runner(on_progress)
        analysis_job_store.update(
            job_id,
            status="completed",
            progress=1.0,
            message="Completado",
            result=payload,
        )
    except asyncio.CancelledError:
        analysis_job_store.update(
            job_id,
            status="cancelled",
            progress=1.0,
            message="Cancelado por el usuario",
            error="El análisis fue cancelado",
        )
    except Exception as exc:
        analysis_job_store.update(
            job_id,
            status="failed",
            progress=1.0,
            message="Error",
            error=str(exc),
        )
