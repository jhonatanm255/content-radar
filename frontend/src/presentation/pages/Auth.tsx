import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import {
  Radio,
  Mail,
  Lock,
  User,
  ArrowRight,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';

export const Auth: React.FC = () => {
  const {
    authMode,
    setAuthMode,
    signIn,
    signUp,
    isSubmitting,
    error,
    successMessage,
    clearMessages,
  } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const isLogin = authMode === 'login';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (isLogin) {
      await signIn(email.trim(), password);
    } else {
      await signUp(email.trim(), password, fullName.trim());
    }
  };

  const switchMode = () => {
    clearMessages();
    setAuthMode(isLogin ? 'signup' : 'login');
  };

  return (
    <div className="min-h-screen bg-cr-bg-dark flex flex-col items-center justify-center p-4 text-white relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cr-accent/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md bg-cr-card-dark/80 backdrop-blur-md border border-cr-border-dark rounded-2xl p-8 relative shadow-2xl">
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-cr-accent flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Radio size={24} className="animate-pulse" />
          </div>
          <span className="text-2xl font-extrabold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
            Creator Radar
          </span>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-xl font-bold text-slate-100">
            {isLogin ? 'Inicia sesión' : 'Crea tu cuenta'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isLogin
              ? 'Accede a tu radar de contenido y oportunidades.'
              : 'Empieza a analizar tu canal y competidores hoy.'}
          </p>
        </div>

        <div className="flex items-center justify-center gap-1 mb-6 p-1 rounded-xl bg-slate-950/80 border border-slate-800">
          <button
            type="button"
            onClick={() => setAuthMode('login')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              isLogin
                ? 'bg-cr-accent text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            onClick={() => setAuthMode('signup')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              !isLogin
                ? 'bg-cr-accent text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Crear cuenta
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-xs font-medium">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-medium">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-2">
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                Nombre completo
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <User size={16} />
                </span>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  required={!isLogin}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cr-accent transition-colors"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              Correo electrónico
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Mail size={16} />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                autoComplete="email"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cr-accent transition-colors"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              Contraseña
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Lock size={16} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                className="w-full pl-10 pr-11 py-3 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cr-accent transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-cr-accent hover:bg-cr-accent-hover disabled:opacity-50 text-white font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 mt-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Procesando...</span>
              </>
            ) : (
              <>
                <span>{isLogin ? 'Entrar' : 'Crear cuenta'}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 mt-6">
          {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
          <button
            type="button"
            onClick={switchMode}
            className="text-violet-400 hover:text-violet-300 font-bold transition-colors"
          >
            {isLogin ? 'Regístrate aquí' : 'Inicia sesión'}
          </button>
        </p>
      </div>
    </div>
  );
};
