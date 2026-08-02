import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../../infrastructure/supabase/client';

type AuthMode = 'login' | 'signup';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isSubmitting: boolean;
  authMode: AuthMode;
  error: string | null;
  successMessage: string | null;

  initialize: () => Promise<void>;
  setAuthMode: (mode: AuthMode) => void;
  clearMessages: () => void;
  signIn: (email: string, password: string) => Promise<boolean>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<boolean>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: true,
  isSubmitting: false,
  authMode: 'login',
  error: null,
  successMessage: null,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession();

    set({
      session,
      user: session?.user ?? null,
      isLoading: false,
    });

    supabase.auth.onAuthStateChange((_event, nextSession) => {
      set({
        session: nextSession,
        user: nextSession?.user ?? null,
        isLoading: false,
      });
    });
  },

  setAuthMode: (mode) => {
    set({ authMode: mode, error: null, successMessage: null });
  },

  clearMessages: () => set({ error: null, successMessage: null }),

  signIn: async (email, password) => {
    set({ isSubmitting: true, error: null, successMessage: null });

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      set({ isSubmitting: false, error: translateAuthError(error.message) });
      return false;
    }

    set({ isSubmitting: false });
    return true;
  },

  signInWithGoogle: async () => {
    set({ isSubmitting: true, error: null, successMessage: null });

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      set({ isSubmitting: false, error: translateAuthError(error.message) });
    }
  },

  signUp: async (email, password, fullName) => {
    set({ isSubmitting: true, error: null, successMessage: null });

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (error) {
      set({ isSubmitting: false, error: translateAuthError(error.message) });
      return false;
    }

    if (data.session) {
      set({ isSubmitting: false });
      return true;
    }

    set({
      isSubmitting: false,
      authMode: 'login',
      successMessage:
        'Cuenta creada. Revisa tu correo para confirmar el registro e inicia sesión.',
    });
    return true;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, error: null, successMessage: null });
  },
}));

function translateAuthError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid login credentials')) {
    return 'Correo o contraseña incorrectos.';
  }
  if (normalized.includes('user already registered')) {
    return 'Ya existe una cuenta con este correo.';
  }
  if (normalized.includes('password should be at least')) {
    return 'La contraseña debe tener al menos 6 caracteres.';
  }
  if (normalized.includes('unable to validate email')) {
    return 'El formato del correo no es válido.';
  }
  if (normalized.includes('email not confirmed')) {
    return 'Debes confirmar tu correo antes de iniciar sesión.';
  }

  return message;
}
