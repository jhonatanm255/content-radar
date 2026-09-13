import React, { useCallback, useEffect, useState } from 'react';
import {
  Users,
  Youtube,
  ShieldCheck,
  RefreshCw,
  Search,
  Inbox,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '../../infrastructure/supabase/client';
import { useAuthStore } from '../store/authStore';
import { isAdminUser } from '../../domain/demoLimits';
import { formatCompactNumber } from '../utils/format';

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  last_sign_in_at: string | null;
}

interface AdminChannel {
  id: string;
  user_id: string;
  youtube_channel_id: string;
  name: string;
  handle: string;
  avatar_url: string | null;
  subscriber_count: number;
  total_views: number;
  video_count: number;
  is_competitor: boolean;
  linked_at: string;
  last_sync_at: string;
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function Avatar({ name, url }: { name: string; url?: string | null }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div className="w-9 h-9 rounded-full bg-cr-accent/15 text-cr-accent dark:text-indigo-300 flex items-center justify-center text-xs font-bold flex-shrink-0 overflow-hidden">
      {url ? (
        <img src={url} alt={name} className="w-full h-full object-cover" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
      ) : null}
      <span className={url ? 'hidden' : ''}>{initials || '?'}</span>
    </div>
  );
}

const EmptyState: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({
  icon,
  title,
  description,
}) => (
  <div className="py-12 flex flex-col items-center text-center">
    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/[0.04] flex items-center justify-center text-slate-400 dark:text-cr-muted-fg mb-3">
      {icon}
    </div>
    <h3 className="text-sm font-bold text-slate-800 dark:text-white">{title}</h3>
    <p className="text-xs text-slate-500 dark:text-cr-muted mt-1 max-w-sm">{description}</p>
  </div>
);

export const AdminPanel: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = isAdminUser(user?.email);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [channels, setChannels] = useState<AdminChannel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userQuery, setUserQuery] = useState('');
  const [channelQuery, setChannelQuery] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const usersResponse = (await supabase.rpc('get_admin_users')) as unknown as {
        data: AdminUser[] | null;
        error: { message: string } | null;
      };
      const channelsResponse = await supabase
        .from('channels')
        .select('*')
        .order('linked_at', { ascending: false });

      if (usersResponse.error) throw new Error(usersResponse.error.message);
      if (channelsResponse.error) throw new Error(channelsResponse.error.message);

      setUsers(usersResponse.data ?? []);
      setChannels(channelsResponse.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los datos del panel.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) loadData();
  }, [isAdmin, loadData]);

  if (!isAdmin) {
    return (
      <div className="cr-page">
        <div className="p-8 rounded-2xl bg-gradient-to-br from-red-500/10 to-orange-500/5 border border-red-500/20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={28} className="text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            Acceso restringido
          </h2>
          <p className="text-sm text-slate-500 dark:text-cr-muted max-w-md mx-auto">
            Este panel es exclusivo del superadmin de la plataforma. No tienes permisos para ver esta página.
          </p>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter((u) => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      u.email.toLowerCase().includes(q) ||
      u.full_name.toLowerCase().includes(q)
    );
  });

  const filteredChannels = channels.filter((c) => {
    const q = channelQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.handle.toLowerCase().includes(q) ||
      c.youtube_channel_id.toLowerCase().includes(q)
    );
  });

  const ownerByUserId = new Map(users.map((u) => [u.id, u.email]));
  const totalVideos = channels.reduce((sum, c) => sum + (c.video_count ?? 0), 0);

  return (
    <div className="p-8 min-h-screen overflow-y-auto pb-10 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Panel de Administración
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cr-accent/15 text-cr-accent dark:text-indigo-300 uppercase tracking-wider">
              Superadmin
            </span>
          </div>
          <p className="text-slate-500 dark:text-cr-muted text-sm mt-1">
            Usuarios registrados y canales vinculados en la plataforma
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={isLoading}
          className="cr-btn-secondary disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>{isLoading ? 'Cargando...' : 'Actualizar'}</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-400 text-sm">
          <AlertTriangle size={16} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: <Users size={18} />, label: 'Usuarios registrados', value: users.length, color: 'text-indigo-500 bg-indigo-500/10' },
          { icon: <Youtube size={18} />, label: 'Canales vinculados', value: channels.length, color: 'text-red-500 bg-red-500/10' },
          { icon: <Youtube size={18} />, label: 'Canales propios', value: channels.filter((c) => !c.is_competitor).length, color: 'text-emerald-500 bg-emerald-500/10' },
          { icon: <Youtube size={18} />, label: 'Canales competidores', value: channels.filter((c) => c.is_competitor).length, color: 'text-amber-500 bg-amber-500/10' },
        ].map((stat) => (
          <div key={stat.label} className="cr-card cr-card-pad flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}>
              {stat.icon}
            </div>
            <div className="min-w-0">
              <p className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {stat.value}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-cr-muted truncate">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Users table - Aumentada altura y scroll interno */}
      <div className="cr-card overflow-hidden">
        <div className="px-6 pt-5 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">Usuarios registrados</h2>
            <p className="text-[11px] text-slate-500 dark:text-cr-muted mt-0.5">
              {users.length} usuarios en total
            </p>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-cr-muted-fg" />
            <input
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="Buscar por nombre o correo..."
              className="cr-input !w-64 !pl-8 !py-2"
            />
          </div>
        </div>

        {/* Contenedor con altura responsiva y scroll interno vertical */}
        <div className="h-[55vh] min-h-[350px] max-h-[950px] overflow-y-auto overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-cr-card dark:bg-cr-card-dark">
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 dark:text-cr-muted-fg border-y border-slate-100 dark:border-cr-border-dark">
                <th className="px-6 py-3 font-semibold">Usuario</th>
                <th className="px-6 py-3 font-semibold">Correo</th>
                <th className="px-6 py-3 font-semibold">Registrado</th>
                <th className="px-6 py-3 font-semibold">Último acceso</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id} className="cr-row-hover border-b border-slate-100/60 dark:border-cr-border-dark/60">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={u.full_name || u.email} />
                      <span className="font-semibold text-slate-800 dark:text-white truncate max-w-[180px]">
                        {u.full_name || 'Sin nombre'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-slate-500 dark:text-cr-muted">{u.email}</td>
                  <td className="px-6 py-3 text-slate-500 dark:text-cr-muted whitespace-nowrap">
                    {formatDate(u.created_at)}
                  </td>
                  <td className="px-6 py-3 text-slate-500 dark:text-cr-muted whitespace-nowrap">
                    {formatDate(u.last_sign_in_at)}
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <EmptyState
                      icon={<Inbox size={20} />}
                      title={userQuery ? 'Sin resultados' : 'Sin usuarios'}
                      description={userQuery ? 'Ningún usuario coincide con la búsqueda.' : 'Todavía no hay usuarios registrados en la plataforma.'}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Channels table - Aumentada altura y scroll interno */}
      <div className="cr-card overflow-hidden">
        <div className="px-6 pt-5 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">Canales vinculados</h2>
            <p className="text-[11px] text-slate-500 dark:text-cr-muted mt-0.5">
              {channels.length} canales · {formatCompactNumber(totalVideos)} videos
            </p>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-cr-muted-fg" />
            <input
              value={channelQuery}
              onChange={(e) => setChannelQuery(e.target.value)}
              placeholder="Buscar canal..."
              className="cr-input !w-64 !pl-8 !py-2"
            />
          </div>
        </div>

        {/* Contenedor con altura responsiva y scroll interno vertical */}
        <div className="h-[55vh] min-h-[350px] max-h-[650px] overflow-y-auto overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-cr-card dark:bg-cr-card-dark">
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 dark:text-cr-muted-fg border-y border-slate-100 dark:border-cr-border-dark">
                <th className="px-6 py-3 font-semibold">Canal</th>
                <th className="px-6 py-3 font-semibold">Propietario</th>
                <th className="px-6 py-3 font-semibold">Tipo</th>
                <th className="px-6 py-3 font-semibold">Suscriptores</th>
                <th className="px-6 py-3 font-semibold">Videos</th>
                <th className="px-6 py-3 font-semibold">Vinculado</th>
              </tr>
            </thead>
            <tbody>
              {filteredChannels.map((c) => (
                <tr key={c.id} className="cr-row-hover border-b border-slate-100/60 dark:border-cr-border-dark/60">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={c.name} url={c.avatar_url} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800 dark:text-white truncate max-w-[160px]">
                            {c.name}
                          </span>
                          <a
                            href={`https://www.youtube.com/${c.handle}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 dark:text-cr-muted-fg hover:text-cr-accent dark:hover:text-indigo-400 transition-colors"
                            title="Abrir en YouTube"
                          >
                            <ExternalLink size={12} />
                          </a>
                        </div>
                        <p className="text-[11px] text-slate-400 dark:text-cr-muted-fg truncate max-w-[180px]">
                          {c.handle || c.youtube_channel_id}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-slate-500 dark:text-cr-muted">
                    {ownerByUserId.get(c.user_id) ?? c.user_id}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${c.is_competitor ? 'bg-amber-500/10 text-amber-600 dark:text-cr-warning' : 'bg-emerald-500/10 text-emerald-600 dark:text-cr-success'}`}>
                      {c.is_competitor ? 'Competidor' : 'Propio'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-slate-500 dark:text-cr-muted tabular-nums">
                    {formatCompactNumber(c.subscriber_count ?? 0)}
                  </td>
                  <td className="px-6 py-3 text-slate-500 dark:text-cr-muted tabular-nums">
                    {formatCompactNumber(c.video_count ?? 0)}
                  </td>
                  <td className="px-6 py-3 text-slate-500 dark:text-cr-muted whitespace-nowrap">
                    {formatDate(c.linked_at)}
                  </td>
                </tr>
              ))}
              {filteredChannels.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={<Youtube size={20} />}
                      title={channelQuery ? 'Sin resultados' : 'Sin canales'}
                      description={channelQuery ? 'Ningún canal coincide con la búsqueda.' : 'Todavía no hay canales vinculados en la plataforma.'}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;