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
};
