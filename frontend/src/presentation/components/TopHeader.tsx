import React, { useState } from 'react';
import { Search, Bell, Menu, Sun, Moon } from 'lucide-react';
import { useAppStore, getActiveOwnChannel } from '../store/appStore';
import { useAuthStore } from '../store/authStore';

interface TopHeaderProps {
  onOpenMobileMenu?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ onOpenMobileMenu }) => {
  const { theme, toggleTheme, channels, selectedChannelId, alerts, setTab } = useAppStore();
  const { user } = useAuthStore();
  const [searchValue, setSearchValue] = useState('');

  const activeChannel = getActiveOwnChannel(channels, selectedChannelId);

  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ||
    activeChannel?.name ||
    'Jhonatan Muñoz';

  const avatarUrl =
    activeChannel?.avatarUrl ||
    (user?.user_metadata?.avatar_url as string | undefined) ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&h=160&q=80';

  const unreadAlerts =
    alerts.filter((a) => a.status === 'active' || a.status === 'triggered').length || 3;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      setTab('comments');
    }
  };

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/90 dark:bg-[#0B0F19]/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800/80 px-4 sm:px-8 flex items-center justify-between gap-4 transition-colors">
      {/* Mobile Menu Button + Search Form */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Abrir menú"
        >
          <Menu size={20} />
        </button>

        <form onSubmit={handleSearchSubmit} className="relative w-full max-w-md">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none"
          />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Buscar en tus videos, canales o temas..."
            className="w-full bg-slate-50 dark:bg-[#121624] border border-slate-200/70 dark:border-slate-800 rounded-full pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/70 transition-all shadow-sm"
          />
        </form>
      </div>

      {/* Right Side Icons */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
        >
          {theme === 'dark' ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
        </button>

        {/* Notifications Bell */}
        <button
          onClick={() => setTab('alerts')}
          className="relative p-2 rounded-full text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={`${unreadAlerts} alertas activas`}
        >
          <Bell size={18} />
          {unreadAlerts > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-[#0B0F19]" />
          )}
        </button>

        {/* User Profile Avatar */}
        <button
          onClick={() => setTab('settings')}
          className="flex items-center gap-2 pl-1 group"
          title={`Perfil de ${displayName}`}
        >
          <div className="relative">
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-transparent group-hover:ring-blue-500 transition-all"
            />
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#0B0F19]" />
          </div>
        </button>
      </div>
    </header>
  );
};
