import React, { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { Plus, Search, Calendar, Trash2, Check, ExternalLink } from 'lucide-react';
import { SavedIdea, SavedIdeaStatus } from '../../domain/entities';

export const IdeasVault: React.FC = () => {
  const { ideas, updateIdeaStatus, deleteIdea, saveIdea } = useAppStore();
  const [activeFilter, setActiveFilter] = useState<'all' | 'todo' | 'in_progress' | 'published'>('all');
  const [search, setSearch] = useState('');
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [newScore, setNewScore] = useState(70);
  const [newFormat, setNewFormat] = useState('Video Tutorial');

  const filteredIdeas = ideas.filter(idea => {
    // Search filter
    if (search.trim() && !idea.topic.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    // Tab filter
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
      setNewScore(70);
    }
  };

  const statusLabels: Record<SavedIdeaStatus, string> = {
    todo: 'Por hacer',
    in_progress: 'En producción',
    published: 'Publicadas',
    discarded: 'Descartada'
  };

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Ideas Guardadas
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Organiza y gestiona tus ideas de contenido para producción
          </p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all shadow-md"
        >
          <Plus size={14} />
          <span>Nueva Idea</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3 mb-6">
        <div className="flex flex-wrap gap-1">
          {[
            { id: 'all', label: `Todas (${ideas.length})` },
            { id: 'todo', label: `Por hacer (${ideas.filter(i => i.status === 'todo').length})` },
            { id: 'in_progress', label: `En producción (${ideas.filter(i => i.status === 'in_progress').length})` },
            { id: 'published', label: `Publicadas (${ideas.filter(i => i.status === 'published').length})` }
          ].map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isActive 
                    ? 'bg-violet-600 text-white' 
                    : 'text-slate-650 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 shadow-sm'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
            <Search size={14} />
          </span>
          <input 
            type="text" 
            placeholder="Buscar ideas..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-violet-500 transition-colors shadow-sm"
          />
        </div>
      </div>

      {/* Ideas Table */}
      <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-105 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                <th className="p-4">Idea</th>
                <th className="p-4">Tema / Formato</th>
                <th className="p-4 text-center">Potencial</th>
                <th className="p-4">Estado</th>
                <th className="p-4">Guardada el</th>
                <th className="p-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {filteredIdeas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No se encontraron ideas.
                  </td>
                </tr>
              ) : (
                filteredIdeas.map((idea) => (
                  <tr key={idea.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20">
                    <td className="p-4 font-bold text-slate-800 dark:text-slate-150">
                      {idea.topic}
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/60 font-semibold text-slate-600 dark:text-slate-400">
                        {idea.format || 'Video Tutorial'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="font-extrabold text-emerald-500">
                        +{idea.opportunityScore}
                      </span>
                    </td>
                    <td className="p-4">
                      {/* State Select dropdown */}
                      <select
                        value={idea.status}
                        onChange={(e) => updateIdeaStatus(idea.id, e.target.value as SavedIdeaStatus)}
                        className={`px-2 py-1 rounded text-[11px] font-bold border outline-none cursor-pointer ${
                          idea.status === 'todo'
                            ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-350'
                            : idea.status === 'in_progress'
                            ? 'bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-850 text-violet-600 dark:text-violet-400'
                            : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-850 text-emerald-600 dark:text-emerald-450'
                        }`}
                      >
                        <option value="todo">{statusLabels.todo}</option>
                        <option value="in_progress">{statusLabels.in_progress}</option>
                        <option value="published">{statusLabels.published}</option>
                        <option value="discarded">{statusLabels.discarded}</option>
                      </select>
                    </td>
                    <td className="p-4 text-slate-400 dark:text-slate-500 font-medium">
                      {new Date(idea.savedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="p-4 text-right pr-4">
                      <button
                        onClick={() => deleteIdea(idea.id)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 hover:text-red-500 hover:border-red-500/30 transition-colors"
                        title="Eliminar Idea"
                      >
                        <Trash2 size={12} />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">
              Agregar Nueva Idea de Contenido
            </h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Título de la Idea</label>
                <input 
                  type="text" 
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  placeholder="Ej. Guía práctica de Redis para principiantes"
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Formato</label>
                <select
                  value={newFormat}
                  onChange={(e) => setNewFormat(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-violet-500 transition-colors"
                >
                  <option value="Video Tutorial">Video Tutorial</option>
                  <option value="Comparativa">Comparativa</option>
                  <option value="Guía">Guía</option>
                  <option value="Caso de Éxito">Caso de Éxito</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Puntaje Potencial Estimado (1-100)</label>
                <input 
                  type="number" 
                  min="1"
                  max="100"
                  value={newScore}
                  onChange={(e) => setNewScore(parseInt(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-350 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleAddIdea}
                className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-colors"
              >
                Crear Idea
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
