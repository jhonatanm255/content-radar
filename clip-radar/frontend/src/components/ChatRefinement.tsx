import React, { useState } from 'react';
import { Send, Bot, Loader2, Sparkles } from 'lucide-react';

interface ChatRefinementProps {
  projectId: string;
  onClipsGenerated: () => void;
}

export const ChatRefinement: React.FC<ChatRefinementProps> = ({ projectId, onClipsGenerated }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const apiUrl = import.meta.env.VITE_CLIP_API_URL || 'http://localhost:8001';

  const handleRefine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/clips/refine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, user_prompt: prompt }),
      });
      if (res.ok) {
        setPrompt('');
        onClipsGenerated();
      } else {
        alert('Error al refinar clips con DeepSeek');
      }
    } catch (error) {
      console.error(error);
      alert('Error de conexión con el backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 backdrop-blur-md">
      <div className="flex items-center gap-2 mb-2 text-xs text-slate-400">
        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
        <span>Refinamiento inteligente con <strong>DeepSeek API</strong></span>
      </div>
      <form onSubmit={handleRefine} className="relative flex items-center">
        <div className="absolute left-3.5 text-cyan-400">
          <Bot className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ej: 'Céntrate en el debate sobre IA y futuro del empleo' o 'Busca los 2 momentos más polémicos'..."
          className="w-full pl-10 pr-24 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/80 transition-colors"
        />
        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          className="absolute right-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-40"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          Filtrar
        </button>
      </form>
    </div>
  );
};
