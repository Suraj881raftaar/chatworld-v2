import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatService, type RoomCreateData } from '../services/chatService';

export function useRooms() {
  const queryClient = useQueryClient();

  const roomsQuery = useQuery({
    queryKey: ['rooms'],
    queryFn: chatService.getRooms,
  });

  const publicRoomsQuery = useQuery({
    queryKey: ['public-rooms'],
    queryFn: chatService.getPublicRooms,
  });

  const createRoomMutation = useMutation({
    mutationFn: (data: RoomCreateData) => chatService.createRoom(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['public-rooms'] });
    },
  });

  const joinRoomMutation = useMutation({
    mutationFn: (roomId: string) => chatService.joinRoom(roomId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['public-rooms'] });
    },
  });

  const leaveRoomMutation = useMutation({
    mutationFn: (roomId: string) => chatService.leaveRoom(roomId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['public-rooms'] });
    },
  });

  const deleteRoomMutation = useMutation({
    mutationFn: (roomId: string) => chatService.deleteRoom(roomId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['public-rooms'] });
    },
  });

  return {
    rooms: roomsQuery.data || [],
    publicRooms: publicRoomsQuery.data || [],
    isLoading: roomsQuery.isLoading,
    isLoadingPublic: publicRoomsQuery.isLoading,
    error: roomsQuery.error,
    createRoom: createRoomMutation.mutateAsync,
    joinRoom: joinRoomMutation.mutateAsync,
    leaveRoom: leaveRoomMutation.mutateAsync,
    deleteRoom: deleteRoomMutation.mutateAsync,
    isCreating: createRoomMutation.isPending,
    isJoining: joinRoomMutation.isPending,
    isDeleting: deleteRoomMutation.isPending,
    refetchPublic: publicRoomsQuery.refetch,
  };
}
