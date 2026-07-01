import React, { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { Plus, Bell, Play, Pause, Trash2, ShieldAlert } from 'lucide-react';
import { Alert, AlertType } from '../../domain/entities';

export const Alerts: React.FC = () => {
  const { alerts, toggleAlert, deleteAlert, addAlert } = useAppStore();
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'paused'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [name, setName] = useState('');
  const [type, setType] = useState<AlertType>('trend');
  const [condition, setCondition] = useState('');

  const filteredAlerts = alerts.filter(a => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'active') return a.status === 'active';
    if (activeFilter === 'paused') return a.status === 'paused';
    return true;
  });

  const handleAdd = () => {
    if (name.trim() && condition.trim()) {
      addAlert(name, type, condition);
      setShowAddModal(false);
      setName('');
      setCondition('');
    }
  };

  const typeLabels: Record<AlertType, string> = {
    trend: 'Tendencia',
    competitor: 'Competidor',
    performance: 'Rendimiento',
    topic: 'Oportunidad'
  };

  const typeColors: Record<AlertType, string> = {
    trend: 'bg-violet-100 dark:bg-violet-950/45 text-violet-650 dark:text-indigo-400',
    competitor: 'bg-blue-100 dark:bg-blue-950/45 text-blue-650 dark:text-blue-400',
    performance: 'bg-amber-100 dark:bg-amber-950/45 text-amber-650 dark:text-amber-400',
    topic: 'bg-emerald-100 dark:bg-emerald-950/45 text-emerald-650 dark:text-emerald-450'
  };

  return (
    <div className="cr-page">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Alertas
          </h1>
          <p className="text-slate-500 dark:text-cr-muted text-sm mt-1">
            Configura y gestiona tus alertas personalizadas de tendencias y competidores
          </p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cr-accent hover:bg-cr-accent-hover text-white text-xs font-bold transition-all shadow-md"
        >
          <Plus size={14} />
          <span>Nueva Alerta</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-cr-border-dark pb-3 mb-6 gap-1 overflow-x-auto">
        {[
          { id: 'all', label: `Todas (${alerts.length})` },
          { id: 'active', label: `Activas (${alerts.filter(a => a.status === 'active').length})` },
          { id: 'paused', label: `Pausadas (${alerts.filter(a => a.status === 'paused').length})` }
        ].map((tab) => {
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isActive 
                  ? 'bg-cr-accent text-white' 
                  : 'text-slate-650 dark:text-cr-muted hover:bg-slate-100 dark:hover:bg-white/[0.04]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Alerts Table */}
      <div className="cr-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-cr-border-dark text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                <th className="p-4">Alerta</th>
                <th className="p-4">Tipo</th>
                <th className="p-4">Condición</th>
                <th className="p-4">Estado</th>
                <th className="p-4">Última actividad</th>
                <th className="p-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-cr-border-dark/50">
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No se encontraron alertas.
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20">
                    <td className="p-4 font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
                      <div className="text-slate-400"><Bell size={14} /></div>
                      {alert.name}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-lg font-semibold ${typeColors[alert.type]}`}>
                        {typeLabels[alert.type]}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 dark:text-cr-muted font-semibold">
                      {alert.condition}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => toggleAlert(alert.id)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors inline-flex items-center gap-1 ${
                          alert.status === 'active'
                            ? 'bg-emerald-50 dark:bg-emerald-950/25 border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-450 hover:bg-emerald-100'
                            : 'bg-red-50 dark:bg-red-950/25 border-red-255/15 dark:border-red-900/50 text-red-650 dark:text-red-400 hover:bg-red-100'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${alert.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <span>{alert.status === 'active' ? 'Activa' : 'Pausada'}</span>
                      </button>
                    </td>
                    <td className="p-4 text-slate-400 dark:text-cr-muted-fg font-medium">
                      {alert.lastActivity}
                    </td>
                    <td className="p-4 text-right pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => toggleAlert(alert.id)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-cr-border-dark bg-white dark:bg-cr-card-dark text-slate-400 hover:text-slate-650 hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                          title={alert.status === 'active' ? 'Pausar' : 'Activar'}
                        >
                          {alert.status === 'active' ? <Pause size={12} /> : <Play size={12} />}
                        </button>
                        <button
                          onClick={() => deleteAlert(alert.id)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-cr-border-dark bg-white dark:bg-cr-card-dark text-slate-400 hover:text-red-500 hover:border-red-500/30 transition-colors"
                          title="Eliminar Alerta"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nueva Alerta */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-cr-card-dark rounded-xl border border-slate-200 dark:border-cr-border-dark shadow-2xl p-6 relative">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">
              Configurar Nueva Alerta
            </h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre de la Alerta</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. CTR bajo en video nuevo"
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-slate-50 dark:bg-cr-bg-dark border border-slate-200 dark:border-cr-border-dark text-slate-800 dark:text-white focus:outline-none focus:border-cr-accent transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Alerta</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as AlertType)}
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-slate-50 dark:bg-cr-bg-dark border border-slate-200 dark:border-cr-border-dark text-slate-800 dark:text-white focus:outline-none focus:border-cr-accent transition-colors"
                >
                  <option value="trend">{typeLabels.trend}</option>
                  <option value="competitor">{typeLabels.competitor}</option>
                  <option value="topic">{typeLabels.topic}</option>
                  <option value="performance">{typeLabels.performance}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Condición de Activación</label>
                <input 
                  type="text" 
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  placeholder="Ej. CTR < 2% en 24h"
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-slate-50 dark:bg-cr-bg-dark border border-slate-200 dark:border-cr-border-dark text-slate-800 dark:text-white focus:outline-none focus:border-cr-accent transition-colors"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-cr-elevated-dark text-slate-650 dark:text-cr-muted text-xs font-bold hover:bg-slate-200 dark:hover:bg-white/[0.06] transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleAdd}
                className="px-4 py-2 rounded-lg bg-cr-accent hover:bg-cr-accent-hover text-white text-xs font-bold transition-colors"
              >
                Crear Alerta
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
