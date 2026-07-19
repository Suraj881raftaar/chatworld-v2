import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatService, type RoomCreateData } from '../services/chatService';

export function useRooms() {
  const queryClient = useQueryClient();

  const roomsQuery = useQuery({
    queryKey: ['rooms'],
    queryFn: chatService.getRooms,
  });

  const createRoomMutation = useMutation({
    mutationFn: (data: RoomCreateData) => chatService.createRoom(data),
    onSuccess: () => {
      // Invalidate cache to force reload of listings
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });

  return {
    rooms: roomsQuery.data || [],
    isLoading: roomsQuery.isLoading,
    error: roomsQuery.error,
    createRoom: createRoomMutation.mutateAsync,
    isCreating: createRoomMutation.isPending,
  };
}
