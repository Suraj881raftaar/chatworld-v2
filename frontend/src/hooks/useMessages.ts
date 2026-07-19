import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { chatService } from '../services/chatService';

export function useMessages(roomId: string) {

  const messagesQuery = useInfiniteQuery({
    queryKey: ['messages', roomId],
    queryFn: ({ pageParam = null }: { pageParam: string | null }) =>
      chatService.getMessages(roomId, 50, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => {
      // In the array of messages returned (sorted chronologically: oldest to newest),
      // the first element (index 0) represents the oldest loaded item in this batch.
      // We pass its ID as the cursor to query earlier history.
      if (lastPage && lastPage.length > 0) {
        return lastPage[0].id;
      }
      return undefined;
    },
    enabled: !!roomId,
  });

  const uploadMutation = useMutation({
    mutationFn: ({ file }: { file: File }) => chatService.uploadFile(roomId, file),
  });

  return {
    data: messagesQuery.data,
    fetchNextPage: messagesQuery.fetchNextPage,
    hasNextPage: messagesQuery.hasNextPage,
    isFetchingNextPage: messagesQuery.isFetchingNextPage,
    isLoading: messagesQuery.isLoading,
    isError: messagesQuery.isError,
    uploadFile: uploadMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
  };
}
