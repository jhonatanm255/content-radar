import React, { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { Plus, Search, Calendar, Trash2, Check, ExternalLink, Bookmark, Lightbulb, X } from 'lucide-react';
import { SavedIdea, SavedIdeaStatus } from '../../domain/entities';

export const IdeasVault: React.FC = () => {
  const { ideas, updateIdeaStatus, deleteIdea, saveIdea } = useAppStore();
  const [activeFilter, setActiveFilter] = useState<'all' | 'todo' | 'in_progress' | 'published'>('all');
  const [search, setSearch] = useState('');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [newScore, setNewScore] = useState(75);
  const [newFormat, setNewFormat] = useState('Video Tutorial');

  const filteredIdeas = ideas.filter((idea) => {
    if (search.trim() && !idea.topic.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (activeFilter === 'all') return true;
    if (activeFilter === 'todo') return idea.status === 'todo';
    if (activeFilter === 'in_progress') return idea.status === 'in_progress';
    if (activeFilter === 'published') return idea.status === 'published';
    return true;
  });

  const handleAddIdea = async () => {
    if (newTopic.trim()) {
      await saveIdea(newTopic, newScore, newFormat);
      setShowAddModal(false);
      setNewTopic('');
      setNewScore(75);
    }
  };

  const statusLabels: Record<SavedIdeaStatus, string> = {
    todo: 'Por hacer',
    in_progress: 'En producción',
    published: 'Publicadas',
    discarded: 'Descartada',
  };

  return (
    <div className="cr-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Lightbulb size={14} />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Pipeline de Creación
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Ideas de Contenido
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Organiza, prioriza y lleva a producción las mejores ideas extraídas de tu comunidad.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 self-start sm:self-auto"
        >
          <Plus size={14} />
          <span>Nueva Idea</span>
        </button>
      </div>

      {/* Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: `Todas (${ideas.length})` },
            { id: 'todo', label: `Por hacer (${ideas.filter((i) => i.status === 'todo').length})` },
            { id: 'in_progress', label: `En producción (${ideas.filter((i) => i.status === 'in_progress').length})` },
            { id: 'published', label: `Publicadas (${ideas.filter((i) => i.status === 'published').length})` },
          ].map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar en tus ideas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-[#121624] border border-slate-200/80 dark:border-slate-800 rounded-full pl-9 pr-4 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm transition-all"
          />
        </div>
      </div>

      {/* Ideas Table Card */}
      <div className="rounded-2xl bg-white dark:bg-[#121624] border border-slate-200/70 dark:border-slate-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-none overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800/80 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                <th className="p-4 sm:pl-6">Idea de Contenido</th>
                <th className="p-4">Formato</th>
                <th className="p-4 text-center">Score</th>
                <th className="p-4">Estado</th>
                <th className="p-4">Fecha de guardado</th>
                <th className="p-4 pr-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredIdeas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    <Bookmark size={24} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="text-xs">No se encontraron ideas guardadas en esta vista.</p>
                  </td>
                </tr>
              ) : (
                filteredIdeas.map((idea) => (
                  <tr key={idea.id} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors group">
                    <td className="p-4 sm:pl-6 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                        <span className="truncate max-w-sm sm:max-w-md group-hover:text-blue-600 transition-colors">
                          {idea.topic}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {idea.format || 'Video Tutorial'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/40">
                        {idea.opportunityScore}
                      </span>
                    </td>
                    <td className="p-4">
                      <select
                        value={idea.status}
                        onChange={(e) => updateIdeaStatus(idea.id, e.target.value as SavedIdeaStatus)}
                        className={`px-3 py-1 rounded-xl text-[11px] font-bold border outline-none cursor-pointer transition-all ${
                          idea.status === 'todo'
                            ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                            : idea.status === 'in_progress'
                            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/40 text-amber-600 dark:text-amber-400'
                            : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        <option value="todo">{statusLabels.todo}</option>
                        <option value="in_progress">{statusLabels.in_progress}</option>
                        <option value="published">{statusLabels.published}</option>
                        <option value="discarded">{statusLabels.discarded}</option>
                      </select>
                    </td>
                    <td className="p-4 text-slate-400 text-xs">
                      {new Date(idea.savedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <button
                        onClick={() => deleteIdea(idea.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        title="Eliminar Idea"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nueva Idea */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-[#121624] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X size={18} />
            </button>

            <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-4">
              Agregar Nueva Idea de Contenido
            </h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                  Título de la Idea
                </label>
                <input
                  type="text"
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  placeholder="Ej. Guía paso a paso: Automatiza tu canal con IA"
                  className="cr-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                  Formato
                </label>
                <select
                  value={newFormat}
                  onChange={(e) => setNewFormat(e.target.value)}
                  className="cr-input cursor-pointer"
                >
                  <option value="Video Tutorial">Video Tutorial</option>
                  <option value="Comparativa">Comparativa</option>
                  <option value="Guía">Guía</option>
                  <option value="Caso de Éxito">Caso de Éxito</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                  Puntaje Estimado de Potencial (1-100)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={newScore}
                  onChange={(e) => setNewScore(parseInt(e.target.value) || 0)}
                  className="cr-input"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddIdea}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all"
              >
                Guardar Idea
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
