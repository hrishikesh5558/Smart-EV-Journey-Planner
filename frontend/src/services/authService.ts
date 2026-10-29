import api from './api';
import type { AuthTokens, User } from '../types';

export interface RegisterPayload {
  full_name: string;
  email: string;
  password: string;
  confirm_password: string;
  accept_terms: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const authService = {
  register: async (payload: RegisterPayload): Promise<AuthTokens> => {
    const { data } = await api.post<AuthTokens>('/auth/register', payload);
    return data;
  },

  login: async (payload: LoginPayload): Promise<AuthTokens> => {
    const { data } = await api.post<AuthTokens>('/auth/login', payload);
    return data;
  },

  getMe: async (): Promise<User> => {
    const { data } = await api.get<User>('/auth/me');
    return data;
  },

  updateProfile: async (payload: Partial<{
    full_name: string;
    default_safety_reserve: number;
    preferred_unit: string;
  }>): Promise<User> => {
    const { data } = await api.put<User>('/auth/profile', payload);
    return data;
  },

  changePassword: async (payload: {
    current_password: string;
    new_password: string;
    confirm_new_password: string;
  }): Promise<void> => {
    await api.post('/auth/change-password', payload);
  },

  logout: () => {
    localStorage.removeItem('ev_access_token');
    localStorage.removeItem('ev_refresh_token');
    localStorage.removeItem('ev_user');
  },

  saveTokens: (tokens: AuthTokens) => {
    localStorage.setItem('ev_access_token', tokens.access_token);
    localStorage.setItem('ev_refresh_token', tokens.refresh_token);
    localStorage.setItem('ev_user', JSON.stringify(tokens.user));
  },

  getStoredUser: (): User | null => {
    const stored = localStorage.getItem('ev_user');
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('ev_access_token');
  },
};
