import { api } from './api';

export interface RoomCreateData {
  name: string;
  description?: string;
  is_private?: boolean;
}

export const chatService = {
  async getRooms() {
    const response = await api.get('/rooms');
    return response.data;
  },

  async createRoom(data: RoomCreateData) {
    const response = await api.post('/rooms', data);
    return response.data;
  },

  async joinRoom(roomId: string) {
    const response = await api.post(`/rooms/${roomId}/join`);
    return response.data;
  },

  async leaveRoom(roomId: string) {
    const response = await api.post(`/rooms/${roomId}/leave`);
    return response.data;
  },

  async getMessages(roomId: string, limit = 50, before: string | null = null) {
    const params: Record<string, any> = { limit };
    if (before) {
      params.before = before;
    }
    const response = await api.get(`/rooms/${roomId}/messages`, { params });
    return response.data;
  },

  async uploadFile(roomId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/rooms/${roomId}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};
