import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { type User as SupabaseUser } from '@supabase/supabase-js';

export type Rol = 'Admin' | 'Agente';

export interface Permisos {
  dashboard: boolean;
  leads: boolean;
  captaciones: boolean;
  mensajes: boolean;
  propiedades: boolean;
  campanas: boolean;
  marketing: boolean;
  usuarios: boolean;
}

export const PERMISOS_ADMIN: Permisos = {
  dashboard: true,
  leads: true,
  captaciones: true,
  mensajes: true,
  propiedades: true,
  campanas: true,
  marketing: true,
  usuarios: true,
};

export const PERMISOS_AGENTE_DEFAULT: Permisos = {
  dashboard: true,
  leads: true,
  captaciones: true,
  mensajes: true,
  propiedades: true,
  campanas: false,
  marketing: false,
  usuarios: false,
};

export interface User {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  avatar?: string;
  telefono?: string;
  permisos: Permisos;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  hasPermission: (key: keyof Permisos) => boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (sbUser: SupabaseUser) => {
    // Fallback inmediato como Agente (sin hardcode por email)
    const fallbackUser: User = {
      id: sbUser.id,
      nombre: sbUser.email?.split('@')[0] || 'Usuario',
      email: sbUser.email || '',
      rol: 'Agente',
      avatar: `https://avatar.vercel.sh/${sbUser.email}`,
      permisos: PERMISOS_AGENTE_DEFAULT,
    };

    setUser(fallbackUser);
    setLoading(false);

    // Intentar cargar perfil real desde Supabase
    try {
      const profilePromise = supabase
        .from('perfiles')
        .select('*')
        .eq('id', sbUser.id)
        .single();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 2500)
      );

      const { data: profile } = await (Promise.race([profilePromise, timeoutPromise]) as any);

      if (profile) {
        const rawRol = (profile.rol || '').toLowerCase();
        const rol: Rol = rawRol === 'admin' ? 'Admin' : 'Agente';

        // Los permisos del Admin siempre son completos, independientemente de la BD
        const permisos: Permisos = rol === 'Admin'
          ? PERMISOS_ADMIN
          : { ...PERMISOS_AGENTE_DEFAULT, ...(profile.permisos || {}) };

        setUser({
          id: profile.id,
          nombre: profile.nombre || fallbackUser.nombre,
          email: sbUser.email || '',
          rol,
          avatar: profile.avatar_url || fallbackUser.avatar,
          telefono: profile.telefono,
          permisos,
        });
      }
    } catch {
      // Silencioso: el fallback como Agente ya está activo
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (identifier: string, password: string) => {
    let email = identifier;

    // Si no es un email (no tiene @), buscamos el email asociado al usuario
    if (!identifier.includes('@')) {
      const { data, error } = await supabase
        .from('perfiles')
        .select('email')
        .eq('usuario', identifier)
        .maybeSingle();
      
      if (error || !data) {
        console.error('Usuario no encontrado en perfiles:', identifier);
        return false;
      }
      email = data.email;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return !error;
  };

  const logout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setLoading(false);
    window.location.reload();
  };

  const isAdmin = user?.rol === 'Admin';

  const hasPermission = (key: keyof Permisos): boolean => {
    if (!user) return false;
    if (user.rol === 'Admin') return true;
    return user.permisos[key] === true;
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isAdmin, hasPermission, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
