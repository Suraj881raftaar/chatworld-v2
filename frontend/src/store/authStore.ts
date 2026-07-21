import { create } from 'zustand';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: string;
  avatar_url: string | null;
  status_message: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: UserProfile, token: string) => void;
  updateUser: (updatedFields: Partial<UserProfile>) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  setAuth: (user, token) => set({ user, accessToken: token, isAuthenticated: true }),
  updateUser: (updatedFields) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...updatedFields } : null,
    })),
  clearAuth: () => set({ user: null, accessToken: null, isAuthenticated: false }),
}));
