import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatService } from '../services/chatService';

export function useMessages(roomId: string) {
  const queryClient = useQueryClient();

  const messagesQuery = useInfiniteQuery({
    queryKey: ['messages', roomId],
    queryFn: ({ pageParam = null }: { pageParam: string | null }) =>
      chatService.getMessages(roomId, 50, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => {
      if (lastPage && lastPage.length > 0) {
        return lastPage[0].id;
      }
      return undefined;
    },
    enabled: !!roomId,
  });

  const uploadMutation = useMutation({
    mutationFn: ({ file }: { file: File }) => chatService.uploadFile(file),
  });

  const deleteMessageMutation = useMutation({
    mutationFn: (messageId: string) => chatService.deleteMessage(roomId, messageId),
    onSuccess: (_, messageId) => {
      // Remove message from TanStack Query cache
      queryClient.setQueryData(
        ['messages', roomId],
        (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page: any[]) =>
              page.filter((msg: any) => msg.id !== messageId)
            ),
          };
        }
      );
    },
  });

  return {
    data: messagesQuery.data,
    fetchNextPage: messagesQuery.fetchNextPage,
    hasNextPage: messagesQuery.hasNextPage,
    isFetchingNextPage: messagesQuery.isFetchingNextPage,
    isLoading: messagesQuery.isLoading,
    isError: messagesQuery.isError,
    uploadFile: uploadMutation.mutateAsync,
    deleteMessage: deleteMessageMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
  };
}
