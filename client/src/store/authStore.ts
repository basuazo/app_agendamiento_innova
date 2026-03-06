import { create } from 'zustand';
import { User } from '../types';
import { authService } from '../services/auth.service';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  updateProfile: (data: { name?: string; email?: string }) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isLoading: !!localStorage.getItem('token'), // true si hay token pendiente de verificar

  login: async (email, password) => {
    const { user, token } = await authService.login(email, password);
    localStorage.setItem('token', token);
    set({ user, token });
  },

  register: async (name, email, password) => {
    await authService.register(name, email, password);
    // No token returned — account requires admin verification before login
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },

  loadUser: async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    set({ isLoading: true });
    try {
      const user = await authService.getMe();
      set({ user, isLoading: false });
    } catch {
      localStorage.removeItem('token');
      set({ user: null, token: null, isLoading: false });
    }
  },

  updateProfile: async (data) => {
    const user = await authService.updateProfile(data);
    set({ user });
  },
}));
