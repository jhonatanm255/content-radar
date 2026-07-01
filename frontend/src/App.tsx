import React, { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useAppStore } from './presentation/store/appStore';
import { useAuthStore } from './presentation/store/authStore';
import { Sidebar } from './presentation/components/Sidebar';
import { Auth } from './presentation/pages/Auth';
import { Dashboard } from './presentation/pages/Dashboard';
import { Opportunities } from './presentation/pages/Opportunities';
import { CommentsAnalysis } from './presentation/pages/CommentsAnalysis';
import { CompetitorRadar } from './presentation/pages/CompetitorRadar';
import { Trends } from './presentation/pages/Trends';
import { IdeasVault } from './presentation/pages/IdeasVault';
import { Alerts } from './presentation/pages/Alerts';
import { Settings } from './presentation/pages/Settings';

export const App: React.FC = () => {
  const {
    currentTab,
    loadInitialData,
    isSyncing,
    syncStep,
    syncProgress,
  } = useAppStore();

  const { user, isLoading, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (user) {
      loadInitialData();
    }
  }, [user, loadInitialData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cr-bg-dark flex flex-col items-center justify-center text-white gap-3">
        <Loader2 size={32} className="animate-spin text-cr-accent" />
        <p className="text-sm text-cr-muted">Cargando sesión...</p>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  const renderActiveTab = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'opportunities':
        return <Opportunities />;
      case 'comments':
        return <CommentsAnalysis />;
      case 'competitors':
        return <CompetitorRadar />;
      case 'trends':
        return <Trends />;
      case 'ideas':
        return <IdeasVault />;
      case 'alerts':
        return <Alerts />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="h-[100dvh] flex flex-col lg:flex-row overflow-hidden bg-cr-bg dark:bg-cr-bg-dark text-slate-800 dark:text-slate-100 transition-colors duration-200">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 min-h-0 relative z-0 overflow-hidden">
        {renderActiveTab()}

        {/* Syncing Overlay */}
        {isSyncing && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 text-white p-6">
            <div className="relative w-16 h-16 mb-4 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-slate-850" />
              <div className="absolute inset-0 rounded-full border-4 border-violet-500 border-t-transparent animate-spin" />
              <span className="text-xs font-bold">{syncProgress}%</span>
            </div>
            <p className="text-sm font-semibold">{syncStep}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
