import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { VideoUploader } from './components/VideoUploader';
import { VideoList } from './components/VideoList';
import { ClipCard, ClipItem } from './components/ClipCard';
import { ChatRefinement } from './components/ChatRefinement';
import {
  Sparkles,
  Layers,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  UploadCloud,
  Film
} from 'lucide-react';

interface Project {
  id: string;
  title: string;
  status: string;
  error_message?: string;
  original_video_url?: string;
}

export const App: React.FC = () => {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [clips, setClips] = useState<ClipItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshListTrigger, setRefreshListTrigger] = useState(0);
  const [showUploaderModal, setShowUploaderModal] = useState(false);

  const apiUrl = import.meta.env.VITE_CLIP_API_URL || 'http://localhost:8001';

  const fetchProjectData = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const res = await fetch(`${apiUrl}/api/v1/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data.project);
        setClips(data.clips || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!projectId) return;

    fetchProjectData();

    // Polling si el proyecto sigue procesándose o si hay algún clip renderizándose
    const isRenderingClip = clips.some((c) => c.status === 'rendering');
    const shouldPoll = (project?.status !== 'ready' && project?.status !== 'failed') || isRenderingClip;

    if (!shouldPoll) return;

    const interval = setInterval(() => {
      fetchProjectData();
      setRefreshListTrigger((prev) => prev + 1);
    }, 2500);

    return () => clearInterval(interval);
  }, [projectId, project?.status, clips]);

  const handleProjectCreated = (newId: string) => {
    setProjectId(newId);
    setShowUploaderModal(false);
    setRefreshListTrigger((prev) => prev + 1);
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'uploaded':
        return (
          <span className="text-yellow-400 bg-yellow-500/10 px-2.5 py-1 rounded-full text-xs font-medium border border-yellow-500/20">
            Video Subido
          </span>
        );
      case 'processing_audio':
        return (
          <span className="text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-full text-xs font-medium border border-cyan-500/20">
            Extrayendo Audio con FFmpeg...
          </span>
        );
      case 'transcribing':
        return (
          <span className="text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full text-xs font-medium border border-blue-500/20">
            Transcribiendo con AssemblyAI...
          </span>
        );
      case 'analyzing':
        return (
          <span className="text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-full text-xs font-medium border border-purple-500/20">
            Analizando Hooks con DeepSeek API...
          </span>
        );
      case 'ready':
        return (
          <span className="text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full text-xs font-medium border border-emerald-500/20 flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" /> Highlights Detectados
          </span>
        );
      case 'failed':
        return (
          <span className="text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full text-xs font-medium border border-rose-500/20 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" /> Error en procesamiento
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#080C15] flex flex-col text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {!projectId ? (
          <div className="space-y-10 mt-4">
            {/* Cabecera Principal */}
            <div className="text-center max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-4 shadow-sm">
                <Sparkles className="w-4 h-4" />
                Módulo Desacoplado ClipRadar • Cloudflare R2
              </div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
                Corte Automático de Videos Largos
              </h1>
              <p className="mt-3 text-slate-400 text-sm max-w-lg mx-auto">
                Transforma podcasts y conferencias en clips verticales listos para TikTok, Shorts y Reels usando AssemblyAI y DeepSeek.
              </p>
            </div>

            {/* Zona de Subida y Lista de Videos Almacenados */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Columna Izquierda: Uploader de Videos */}
              <div className="lg:col-span-5 space-y-4">
                <div className="flex items-center gap-2 text-white font-semibold text-sm">
                  <UploadCloud className="w-4 h-4 text-cyan-400" />
                  <span>Subir Nuevo Video / Podcast</span>
                </div>
                <VideoUploader onProjectCreated={handleProjectCreated} />
              </div>

              {/* Columna Derecha: Gestor de Videos Almacenados (Listar, Seleccionar, Borrar) */}
              <div className="lg:col-span-7 space-y-4">
                <VideoList
                  onSelectProject={(id) => setProjectId(id)}
                  activeProjectId={projectId}
                  refreshTrigger={refreshListTrigger}
                  onListUpdated={() => {
                    if (projectId) {
                      setProjectId(null);
                      setProject(null);
                      setClips([]);
                    }
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Barra de Navegación del Proyecto */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setProjectId(null);
                  setProject(null);
                  setClips([]);
                  setRefreshListTrigger((prev) => prev + 1);
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-all group"
              >
                <ArrowLeft className="w-4 h-4 text-cyan-400 group-hover:-translate-x-1 transition-transform" />
                <span>Volver a Mis Videos</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowUploaderModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-semibold transition-colors"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Subir otro video</span>
                </button>
              </div>
            </div>

            {/* Cabecera del Proyecto Activo */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 backdrop-blur-md">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    {project?.title || 'Cargando video...'}
                  </h2>
                  {getStatusBadge(project?.status)}
                </div>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  ID de Proyecto: {projectId}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={fetchProjectData}
                  disabled={loading}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-slate-300 text-xs font-medium flex items-center gap-1.5 border border-slate-700/60 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
                  Actualizar Estado
                </button>
              </div>
            </div>

            {/* Error Banner si el procesamiento falla */}
            {project?.status === 'failed' && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-rose-300">
                    Hubo un problema al procesar el video
                  </h4>
                  <p className="text-xs text-rose-200/80 mt-1 font-mono break-all">
                    {project.error_message || 'Error desconocido'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-2">
                    Puedes eliminar este video desde la lista de videos y volver a intentarlo.
                  </p>
                </div>
              </div>
            )}

            {/* Chat de Refinamiento con DeepSeek */}
            {project?.status === 'ready' && (
              <ChatRefinement projectId={projectId} onClipsGenerated={fetchProjectData} />
            )}

            {/* Listado de Clips Detectados */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-semibold text-white">
                    Clips Detectados ({clips.length})
                  </h3>
                </div>
              </div>

              {clips.length === 0 ? (
                <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-12 text-center">
                  <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto mb-3 animate-pulse">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-medium text-white">
                    {project?.status === 'failed'
                      ? 'No se pudieron extraer clips debido a un error'
                      : 'Procesando highlights virales'}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    {project?.status === 'failed'
                      ? 'Revisa el detalle del error arriba.'
                      : 'Nuestros modelos de transcripción y DeepSeek están analizando la transcripción para encontrar los mejores fragmentos.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {clips.map((clip) => (
                    <ClipCard
                      key={clip.id}
                      clip={clip}
                      originalVideoUrl={project?.original_video_url}
                      onRefresh={fetchProjectData}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Sección Inferior: Cambiar a otro video rápidamente */}
            <div className="mt-12 pt-8 border-t border-slate-800/80">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Film className="w-4 h-4 text-cyan-400" />
                  Otros Videos en tu Biblioteca
                </h3>
              </div>
              <VideoList
                onSelectProject={(id) => setProjectId(id)}
                activeProjectId={projectId}
                refreshTrigger={refreshListTrigger}
                onListUpdated={() => {
                  setRefreshListTrigger((prev) => prev + 1);
                }}
              />
            </div>
          </div>
        )}
      </main>

      {/* Modal para Subir Video Rápido cuando estás en vista de proyecto */}
      {showUploaderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Subir Nuevo Video</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowUploaderModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-slate-800"
              >
                Cerrar ✕
              </button>
            </div>
            <VideoUploader onProjectCreated={handleProjectCreated} />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
