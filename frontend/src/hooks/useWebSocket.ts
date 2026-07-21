import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';

const getWsBaseUrl = () => {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }
  const isSecure = window.location.protocol === 'https:';
  const wsScheme = isSecure ? 'wss:' : 'ws:';
  return `${wsScheme}//${window.location.host}/api/v1`;
};

const WS_BASE_URL = getWsBaseUrl();

export function useWebSocket(roomId: string) {
  const queryClient = useQueryClient();
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const heartbeatIntervalRef = useRef<any>(null);
  const reconnectAttemptsRef = useRef(0);
  
  const token = useAuthStore((state) => state.accessToken);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({}); // Maps user_id -> username

  const connect = useCallback(() => {
    if (!token || !roomId) return;

    // Close any existing connection
    if (socketRef.current) {
      socketRef.current.close();
    }

    const wsUrl = `${WS_BASE_URL}/ws/chat?token=${encodeURIComponent(token)}&room_id=${encodeURIComponent(roomId)}`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
      logger.info('WS connected cleanly');
      
      // Start ping heartbeat check every 30s to keep socket alive
      heartbeatIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ event: 'ping' }));
        }
      }, 30000);
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const { event: eventName, data } = payload;

        if (eventName === 'new_message') {
          // Append new message directly into TanStack Query's infinite query cache
          queryClient.setQueryData(
            ['messages', roomId],
            (oldData: any) => {
              if (!oldData) {
                return {
                  pages: [[data]],
                  pageParams: [null],
                };
              }
              
              // In InfiniteQuery, data is structured as pages: { pages: [...], pageParams: [...] }
              // Prevent duplicate items
              const exists = oldData.pages?.some((page: any[]) =>
                page.some((m: any) => m.id === data.id)
              );
              if (exists) return oldData;

              const updatedPages = [...oldData.pages];
              const lastPageIndex = updatedPages.length - 1;
              if (lastPageIndex >= 0) {
                updatedPages[lastPageIndex] = [...updatedPages[lastPageIndex], data];
              } else {
                updatedPages.push([data]);
              }

              return {
                ...oldData,
                pages: updatedPages,
              };
            }
          );
        } else if (eventName === 'typing' || eventName === 'user_typing') {
          const { user_id, username, is_typing } = data;
          setTypingUsers((prev) => {
            const updated = { ...prev };
            if (is_typing) {
              updated[user_id] = username;
            } else {
              delete updated[user_id];
            }
            return updated;
          });
        } else if (eventName === 'message_deleted') {
          const { message_id } = data;
          queryClient.setQueryData(
            ['messages', roomId],
            (oldData: any) => {
              if (!oldData) return oldData;
              return {
                ...oldData,
                pages: oldData.pages.map((page: any[]) =>
                  page.filter((msg: any) => msg.id !== message_id)
                ),
              };
            }
          );
        } else if (eventName === 'reaction_updated') {
          const { message_id, reactions } = data;
          queryClient.setQueryData(
            ['messages', roomId],
            (oldData: any) => {
              if (!oldData) return oldData;
              return {
                ...oldData,
                pages: oldData.pages.map((page: any[]) =>
                  page.map((msg: any) =>
                    msg.id === message_id ? { ...msg, reactions } : msg
                  )
                ),
              };
            }
          );
        } else if (eventName === 'room_deleted') {
          queryClient.invalidateQueries({ queryKey: ['rooms'] });
          queryClient.invalidateQueries({ queryKey: ['public-rooms'] });
        }
      } catch (err) {
        console.error('Error parsing WS message payload:', err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      clearInterval(heartbeatIntervalRef.current!);
      logger.warning('WS closed, attempting reconnection...');
      
      // Exponential backoff reconnect
      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
      reconnectAttemptsRef.current += 1;
      
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    };

    ws.onerror = (err) => {
      console.error('WS Error:', err);
      ws.close();
    };

  }, [token, roomId, queryClient]);

  useEffect(() => {
    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [connect]);

  const sendMessage = useCallback((content: string, messageType = 'text', fileUrl: string | null = null) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          event: 'send_message',
          data: {
            content,
            message_type: messageType,
            file_url: fileUrl,
          },
        })
      );
    }
  }, []);

  const sendTypingStatus = useCallback((isTyping: boolean) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          event: 'typing',
          data: {
            is_typing: isTyping,
          },
        })
      );
    }
  }, []);

  const sendDeleteMessage = useCallback((messageId: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          event: 'delete_message',
          data: {
            message_id: messageId,
          },
        })
      );
    }
  }, []);

  const sendToggleReaction = useCallback((messageId: string, emoji: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          event: 'toggle_reaction',
          data: {
            message_id: messageId,
            emoji: emoji,
          },
        })
      );
    }
  }, []);

  return {
    isConnected,
    typingUsers,
    sendMessage,
    sendTypingStatus,
    sendDeleteMessage,
    sendToggleReaction,
  };
}

// Simple Logger Helper
const logger = {
  info: (msg: string) => console.log(`%c[WS INFO] ${msg}`, 'color: #8b5cf6; font-weight: bold;'),
  warning: (msg: string) => console.warn(`[WS WARNING] ${msg}`),
};
