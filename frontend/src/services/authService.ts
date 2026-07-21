import { api } from './api';
import type { UserRegister, UserLogin } from '../types/auth';

export const authService = {
  async signup(data: UserRegister) {
    const response = await api.post('/auth/signup', data);
    return response.data;
  },

  async login(data: UserLogin) {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  async logout() {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  async updateProfile(data: { avatar_url?: string; status_message?: string; status_type?: string; bio?: string; username?: string }) {
    const response = await api.put('/users/me', data);
    return response.data;
  },

  async getProfile() {
    const response = await api.get('/users/me');
    return response.data;
  },
};
