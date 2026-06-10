// src/hooks/useAuth.ts
// Hook de autenticação com React Query

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

interface User {
  login: string;
  name: string;
  email: string;
  phone?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (login: string, password: string) => Promise<void>;
  register: (data: { login: string; password: string; name: string; email: string }) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      login: async (login: string, password: string) => {
        const response = await api.post<{ token: string; user: User }>('/api/auth/login', {
          login,
          password,
        });
        
        localStorage.setItem('iamobil_token', response.token);
        set({ 
          token: response.token, 
          user: response.user, 
          isAuthenticated: true 
        });
      },

      register: async (data) => {
        const response = await api.post<{ token: string; user: User }>('/api/auth/register', data);
        
        localStorage.setItem('iamobil_token', response.token);
        set({ 
          token: response.token, 
          user: response.user, 
          isAuthenticated: true 
        });
      },

      logout: () => {
        localStorage.removeItem('iamobil_token');
        set({ 
          token: null, 
          user: null, 
          isAuthenticated: false 
        });
      },

      setUser: (user: User) => {
        set({ user });
      },
    }),
    {
      name: 'iamobil-auth',
      partialize: (state) => ({ 
        token: state.token, 
        user: state.user,
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);

export default useAuth;
