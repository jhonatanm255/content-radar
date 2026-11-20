import React, { useState, useEffect } from 'react';
import {
  Film,
  Trash2,
  PlayCircle,
  Clock,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Search,
  CheckSquare,
  Square,
  Loader2,
  ChevronRight
} from 'lucide-react';

export interface VideoProject {
  id: string;
  title: string;
  status: string;
  error_message?: string;
  created_at: string;
  clip_count: number;
  completed_clips_count: number;
  duration_seconds?: number;
  original_storage_path?: string;
}

interface VideoListProps {
  onSelectProject: (projectId: string) => void;
  activeProjectId?: string | null;
  refreshTrigger?: number;
  onListUpdated?: () => void;
}

export const VideoList: React.FC<VideoListProps> = ({
  onSelectProject,
  activeProjectId,
  refreshTrigger,
  onListUpdated,
}) => {
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [deleting, setDeleting] = useState<boolean>(false);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    open: boolean;
    ids: string[];
    isBatch: boolean;
  }>({ open: false, ids: [], isBatch: false });

  const apiUrl = import.meta.env.VITE_CLIP_API_URL || 'http://localhost:8001';

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiUrl}/api/v1/projects`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [refreshTrigger]);

  const toggleSelectOne = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredProjects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProjects.map((p) => p.id)));
    }
  };

  const handleTriggerSingleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteModal({
      open: true,
      ids: [id],
      isBatch: false,
    });
  };

  const handleTriggerBatchDelete = () => {
    if (selectedIds.size === 0) return;
    setConfirmDeleteModal({
      open: true,
      ids: Array.from(selectedIds),
      isBatch: true,
    });
  };

  const executeDelete = async () => {
    if (confirmDeleteModal.ids.length === 0) return;

    setDeleting(true);
    try {
      if (confirmDeleteModal.ids.length === 1) {
        const id = confirmDeleteModal.ids[0];
        const res = await fetch(`${apiUrl}/api/v1/projects/${id}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error('Error eliminando el proyecto');
      } else {
        const res = await fetch(`${apiUrl}/api/v1/projects/batch-delete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project_ids: confirmDeleteModal.ids }),
        });
        if (!res.ok) throw new Error('Error eliminando los proyectos seleccionados');
      }

      // Limpiar selección y refrescar
      setSelectedIds(new Set());
      setConfirmDeleteModal({ open: false, ids: [], isBatch: false });
      await fetchProjects();
      onListUpdated?.();
    } catch (err) {
      console.error('Error in deletion:', err);
      alert('Ocurrió un error al eliminar los videos. Revisa la consola.');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: string, clipCount: number) => {
    switch (status) {
      case 'ready':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            {clipCount > 0 ? `${clipCount} clips listos` : 'Listo'}
          </span>
        );
      case 'analyzing':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
            <Loader2 className="w-3 h-3 animate-spin text-purple-400" />
            Analizando DeepSeek...
          </span>
        );
      case 'transcribing':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
            <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
            Transcribiendo...
          </span>
        );
      case 'processing_audio':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
            <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
            Extrayendo audio...
          </span>
        );
      case 'uploaded':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full">
            En cola
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
            <AlertCircle className="w-3 h-3 text-rose-400" />
            Error
          </span>
        );
      default:
        return (
          <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
            {status}
          </span>
        );
    }
  };

  const filteredProjects = projects.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Barra de Controles y Selección */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Título y Conteo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                Videos Subidos en Storage R2
                <span className="text-xs font-normal text-slate-400">({projects.length})</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Selecciona un video para ver sus clips generados o elimínalos
              </p>
            </div>
          </div>

          {/* Acciones de Selección y Refresco */}
          <div className="flex items-center gap-2 flex-wrap">
            {filteredProjects.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 text-xs font-medium transition-all"
              >
                {selectedIds.size === filteredProjects.length && filteredProjects.length > 0 ? (
                  <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>
                  {selectedIds.size === filteredProjects.length && filteredProjects.length > 0
                    ? 'Deseleccionar todos'
                    : 'Seleccionar todos'}
                </span>
              </button>
            )}

            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={handleTriggerBatchDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/20 transition-all animate-in fade-in"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar ({selectedIds.size})</span>
              </button>
            )}

            <button
              type="button"
              onClick={fetchProjects}
              disabled={loading}
              title="Actualizar lista de videos"
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Buscador Rápido (si hay más de 2 proyectos) */}
        {projects.length > 2 && (
          <div className="mt-3 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre de archivo..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        )}
      </div>

      {/* Lista de Videos */}
      {loading && projects.length === 0 ? (
        <div className="bg-slate-900/30 border border-slate-800/60 rounded-2xl p-10 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
          <p className="text-xs text-slate-400">Cargando tus videos subidos...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-slate-900/30 border border-slate-800/60 rounded-2xl p-8 text-center">
          <Film className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <h4 className="text-xs font-semibold text-slate-300">
            {searchQuery ? 'No se encontraron videos con ese nombre' : 'Aún no tienes videos subidos'}
          </h4>
          <p className="text-[11px] text-slate-500 mt-1">
            {searchQuery
              ? 'Prueba con otro término de búsqueda'
              : 'Sube un video o podcast con el panel superior para comenzar a recortar clips.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredProjects.map((p) => {
            const isSelected = selectedIds.has(p.id);
            const isActive = activeProjectId === p.id;

            return (
              <div
                key={p.id}
                onClick={() => onSelectProject(p.id)}
                className={`group relative p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                  isActive
                    ? 'bg-cyan-950/20 border-cyan-500/50 shadow-lg shadow-cyan-500/5 ring-1 ring-cyan-500/30'
                    : isSelected
                    ? 'bg-slate-900/90 border-cyan-500/40'
                    : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700/90 hover:bg-slate-900/80'
                }`}
              >
                {/* Fila Superior: Checkbox, Título, Estado */}
                <div className="flex items-start gap-3">
                  {/* Checkbox de Selección */}
                  <button
                    type="button"
                    onClick={(e) => toggleSelectOne(p.id, e)}
                    className="mt-0.5 flex-shrink-0 p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-cyan-400" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
                    )}
                  </button>

                  {/* Icono de Video */}
                  <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-cyan-400 flex-shrink-0">
                    <PlayCircle className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                  </div>

                  {/* Info de Video */}
                  <div className="flex-1 min-w-0 pr-1">
                    <h4 className="text-sm font-semibold text-white tracking-tight truncate group-hover:text-cyan-300 transition-colors">
                      {p.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusBadge(p.status, p.clip_count)}
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {formatDate(p.created_at)}
                      </span>
                    </div>

                    {p.status === 'failed' && p.error_message && (
                      <p className="text-[10px] text-rose-300/80 mt-1 truncate">
                        {p.error_message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Fila Inferior: Botones de Acción */}
                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {p.clip_count > 0
                      ? `${p.clip_count} clips detectados`
                      : p.status === 'ready'
                      ? '0 clips detectados'
                      : 'Procesando pipeline'}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* Botón Seleccionar / Abrir */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectProject(p.id);
                      }}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                          : 'bg-slate-800/90 hover:bg-cyan-500 hover:text-slate-950 text-slate-200'
                      }`}
                    >
                      <span>{isActive ? 'Viendo ahora' : 'Ver clips'}</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>

                    {/* Botón Eliminar Individual */}
                    <button
                      type="button"
                      onClick={(e) => handleTriggerSingleDelete(p.id, e)}
                      title="Eliminar video y clips de R2"
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {confirmDeleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">¿Confirmas la eliminación?</h3>
                <p className="text-xs text-slate-400">Esta acción no se puede deshacer</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              {confirmDeleteModal.isBatch ? (
                <>
                  Estás a punto de eliminar <strong>{confirmDeleteModal.ids.length} videos</strong>{' '}
                  junto con sus transcripciones, historial de chat y archivos almacenados en{' '}
                  <strong>Cloudflare R2</strong>.
                </>
              ) : (
                <>
                  Se eliminará permanentemente el video seleccionado, sus clips generados y los
                  archivos asociados en <strong>Cloudflare R2</strong> y <strong>Supabase</strong>.
                </>
              )}
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setConfirmDeleteModal({ open: false, ids: [], isBatch: false })}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={executeDelete}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/20 transition-all disabled:opacity-50"
              >
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{deleting ? 'Eliminando...' : 'Sí, eliminar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
