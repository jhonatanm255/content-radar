import React, { useState } from 'react';
import { UploadCloud, Loader2 } from 'lucide-react';

interface VideoUploaderProps {
  onProjectCreated: (projectId: string) => void;
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({ onProjectCreated }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progressText, setProgressText] = useState('');

  const apiUrl = import.meta.env.VITE_CLIP_API_URL || 'http://localhost:8001';

  const handleFileUpload = async (file: File) => {
    if (!file.type.includes('video')) {
      alert('Por favor selecciona un archivo de video válido (MP4, MOV, WebM).');
      return;
    }

    setUploading(true);
    setProgressText('Subiendo video al almacenamiento y preparando pipeline...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${apiUrl}/api/v1/videos/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Error en la subida del video');
      }

      const data = await response.json();
      onProjectCreated(data.project_id);
    } catch (err) {
      console.error(err);
      alert('Ocurrió un error al subir el video.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
      }}
      className={`border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center transition-all duration-300 relative overflow-hidden ${
        isDragging
          ? 'border-cyan-400 bg-cyan-950/20'
          : 'border-slate-800 bg-slate-900/40 hover:border-slate-700/80'
      }`}
    >
      {uploading ? (
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="w-12 h-12 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-cyan-400" />
          </div>
          <p className="text-slate-200 font-medium text-sm">{progressText}</p>
          <span className="text-xs text-slate-500">Iniciando extracción de audio y transcripción AssemblyAI...</span>
        </div>
      ) : (
        <>
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4 shadow-lg shadow-cyan-500/10">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white text-center">
            Arrastra tu podcast o video largo aquí
          </h3>
          <p className="text-xs text-slate-400 mt-1 mb-6 text-center max-w-sm">
            Detectaremos automáticamente los mejores ganchos (hooks) y momentos virales para Shorts, Reels y TikTok.
          </p>
          <label className="cursor-pointer px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
            Seleccionar archivo local
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            />
          </label>
        </>
      )}
    </div>
  );
};
