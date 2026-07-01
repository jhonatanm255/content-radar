import React, { useState } from 'react';
import { Channel } from '../../domain/entities';
import { ChannelAvatar } from './ChannelAvatar';
import { RefreshCw, Trash2, CheckCircle } from 'lucide-react';

interface ChannelManageListProps {
  channels: Channel[];
  selectedChannelId?: string;
  isSyncing?: boolean;
  emptyMessage?: string;
  onSelect?: (channelId: string) => void;
  onSync?: (channelId: string) => void;
  onDelete: (channelId: string) => Promise<void>;
  showSync?: boolean;
}

export const ChannelManageList: React.FC<ChannelManageListProps> = ({
  channels,
  selectedChannelId,
  isSyncing = false,
  emptyMessage = 'No hay canales.',
  onSelect,
  onSync,
  onDelete,
  showSync = true,
}) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (channels.length === 0) {
    return (
      <p className="text-xs text-slate-500 dark:text-cr-muted py-2">{emptyMessage}</p>
    );
  }

  const handleDelete = async (channel: Channel) => {
    if (confirmId !== channel.id) {
      setConfirmId(channel.id);
      return;
    }
    setDeletingId(channel.id);
    try {
      await onDelete(channel.id);
      setConfirmId(null);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-2">
      {channels.map((channel) => {
        const isSelected = selectedChannelId === channel.id;
        const isConfirming = confirmId === channel.id;

        return (
          <div
            key={channel.id}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
              isSelected
                ? 'bg-violet-500/5 border-indigo-500/30'
                : 'bg-slate-50 dark:bg-cr-bg-dark/50 border-slate-200 dark:border-cr-border-dark'
            }`}
          >
            <ChannelAvatar src={channel.avatarUrl} name={channel.name} size="md" />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-slate-800 dark:text-white truncate">
                  {channel.name}
                </p>
                {isSelected && (
                  <span className="text-[9px] font-bold uppercase tracking-wider text-violet-500 bg-violet-500/10 px-1.5 py-0.5 rounded">
                    Activo
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 truncate">{channel.handle}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {channel.subscriberCount.toLocaleString('es-ES')} subs ·{' '}
                {(channel.totalViews ?? 0).toLocaleString('es-ES')} vistas
              </p>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {onSelect && !isSelected && (
                <button
                  onClick={() => onSelect(channel.id)}
                  className="p-2 rounded-lg text-slate-400 hover:text-violet-500 hover:bg-violet-500/10 transition-colors"
                  title="Seleccionar canal"
                >
                  <CheckCircle size={15} />
                </button>
              )}
              {showSync && onSync && (
                <button
                  onClick={() => onSync(channel.id)}
                  disabled={isSyncing}
                  className="p-2 rounded-lg text-slate-400 hover:text-violet-500 hover:bg-violet-500/10 transition-colors disabled:opacity-40"
                  title="Sincronizar métricas"
                >
                  <RefreshCw size={15} className={isSyncing ? 'animate-spin' : ''} />
                </button>
              )}
              <button
                onClick={() => handleDelete(channel)}
                disabled={deletingId === channel.id}
                className={`p-2 rounded-lg transition-colors disabled:opacity-40 ${
                  isConfirming
                    ? 'text-red-500 bg-red-500/10 hover:bg-red-500/20'
                    : 'text-slate-400 hover:text-red-500 hover:bg-red-500/10'
                }`}
                title={isConfirming ? 'Confirmar eliminación' : 'Eliminar canal'}
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        );
      })}

      {confirmId && (
        <p className="text-[10px] text-amber-600 dark:text-amber-400 px-1">
          Pulsa el icono de eliminar otra vez para confirmar. Se borrarán también sus snapshots históricos.
        </p>
      )}
    </div>
  );
};
