import React, { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { Plus, Bell, Play, Pause, Trash2, ShieldAlert, Sparkles, X, Flame } from 'lucide-react';
import { Alert, AlertType } from '../../domain/entities';

export const Alerts: React.FC = () => {
  const { alerts, toggleAlert, deleteAlert, addAlert } = useAppStore();
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'paused'>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  const [name, setName] = useState('');
  const [type, setType] = useState<AlertType>('trend');
  const [condition, setCondition] = useState('');

  const filteredAlerts = alerts.filter((a) => {
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
    topic: 'Oportunidad',
  };

  const typeBadgeClasses: Record<AlertType, string> = {
    trend: 'cr-badge-info',
    competitor: 'cr-badge-info',
    performance: 'cr-badge-warning',
    topic: 'cr-badge-success',
  };

  return (
    <div className="cr-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Bell size={14} />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Centro de Notificaciones
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Alertas Automatizadas
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Configura reglas automáticas para recibir avisos de picos de interés, cambios de sentimiento y actividad de competidores.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 self-start sm:self-auto"
        >
          <Plus size={14} />
          <span>Nueva Alerta</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-slate-100 dark:border-slate-800/80 pb-2 gap-1.5 overflow-x-auto">
        {[
          { id: 'all', label: `Todas (${alerts.length})` },
          { id: 'active', label: `Activas (${alerts.filter((a) => a.status === 'active').length})` },
          { id: 'paused', label: `Pausadas (${alerts.filter((a) => a.status === 'paused').length})` },
        ].map((tab) => {
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
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

      {/* Alerts Table Card */}
      <div className="rounded-2xl bg-white dark:bg-[#121624] border border-slate-200/70 dark:border-slate-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-none overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800/80 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                <th className="p-4 sm:pl-6">Regla / Nombre</th>
                <th className="p-4">Tipo</th>
                <th className="p-4">Condición</th>
                <th className="p-4">Estado</th>
                <th className="p-4">Última actividad</th>
                <th className="p-4 pr-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    <Bell size={24} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="text-xs">No se encontraron alertas registradas en esta vista.</p>
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors group">
                    <td className="p-4 sm:pl-6 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                          <Bell size={13} />
                        </span>
                        <span className="truncate max-w-xs group-hover:text-blue-600 transition-colors">
                          {alert.name}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={typeBadgeClasses[alert.type] || 'cr-badge-info'}>
                        {typeLabels[alert.type]}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">
                      {alert.condition}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => toggleAlert(alert.id)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all inline-flex items-center gap-1.5 ${
                          alert.status === 'active'
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-900/40'
                            : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200/60 dark:border-rose-900/40'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${alert.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                        <span>{alert.status === 'active' ? 'Activa' : 'Pausada'}</span>
                      </button>
                    </td>
                    <td className="p-4 text-slate-400 text-xs">
                      {alert.lastActivity}
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => toggleAlert(alert.id)}
                          className="p-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                          title={alert.status === 'active' ? 'Pausar' : 'Activar'}
                        >
                          {alert.status === 'active' ? <Pause size={13} /> : <Play size={13} />}
                        </button>
                        <button
                          onClick={() => deleteAlert(alert.id)}
                          className="p-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                          title="Eliminar Alerta"
                        >
                          <Trash2 size={13} />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-[#121624] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X size={18} />
            </button>

            <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-4">
              Configurar Nueva Alerta
            </h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                  Nombre descriptivo
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Aumento de preguntas sobre Docker"
                  className="cr-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                  Tipo de Alerta
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as AlertType)}
                  className="cr-input cursor-pointer"
                >
                  <option value="trend">{typeLabels.trend}</option>
                  <option value="competitor">{typeLabels.competitor}</option>
                  <option value="topic">{typeLabels.topic}</option>
                  <option value="performance">{typeLabels.performance}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                  Condición de Disparo
                </label>
                <input
                  type="text"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  placeholder="Ej. > 30 comentarios en 24h"
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
                onClick={handleAdd}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all"
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
