import { Bindings } from '../types';
import { dbQuery } from '../db/client';

export class ChatRoom implements DurableObject {
  state: DurableObjectState;
  env: Bindings;
  sessions: Map<WebSocket, { userId: string; username: string }> = new Map();

  constructor(state: DurableObjectState, env: Bindings) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected Upgrade: websocket", { status: 426 });
    }

    const url = new URL(request.url);
    const userId = url.searchParams.get("user_id");
    const username = url.searchParams.get("username");
    const roomId = url.searchParams.get("room_id");

    if (!userId || !username || !roomId) {
      return new Response("Missing connection parameters", { status: 400 });
    }

    // Create WebSocket pair
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    // Accept WebSocket connection on server side
    await this.handleSession(server, userId, username, roomId);

    return new Response(null, {
      status: 101,
      webSocket: client
    });
  }

  async handleSession(ws: WebSocket, userId: string, username: string, roomId: string) {
    // Accept the websocket connection
    // @ts-ignore (Cloudflare Workers native WebSocket api extends standard browser WebSocket)
    ws.accept();

    // Register active session
    this.sessions.set(ws, { userId, username });

    // Broadcast client joined event (presence)
    this.broadcast({
      event: "presence",
      data: {
        user_id: userId,
        username: username,
        status: "online"
      }
    });

    // Listen for incoming messages
    ws.addEventListener("message", async (event) => {
      try {
        const msg = JSON.parse(event.data as string);

        if (msg.event === "send_message") {
          const { message_type, content, file_url } = msg.data;

          // Save message to Neon PostgreSQL
          const messages = await dbQuery<{ id: string; created_at: string }>(
            this.env.DATABASE_URL,
            "INSERT INTO messages (room_id, sender_id, message_type, content, file_url) VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at",
            [roomId, userId, message_type || 'text', content || '', file_url || null]
          );

          const savedMessage = messages[0];

          // Broadcast message to all active clients in the room
          this.broadcast({
            event: "new_message",
            data: {
              id: savedMessage.id,
              room_id: roomId,
              sender_id: userId,
              sender_name: username,
              message_type: message_type || 'text',
              content: content || '',
              file_url: file_url || null,
              created_at: savedMessage.created_at
            }
          });
        } else if (msg.event === "typing") {
          const { is_typing } = msg.data;
          this.broadcast({
            event: "typing",
            data: {
              user_id: userId,
              username: username,
              is_typing: !!is_typing
            }
          }, ws); // Exclude the typing sender from seeing their own indicator
        } else if (msg.event === "delete_message") {
          const { message_id } = msg.data;
          this.broadcast({
            event: "message_deleted",
            data: {
              message_id: message_id,
              room_id: roomId
            }
          });
        }
      } catch (err) {
        console.error("Error handling DO websocket message:", err);
      }
    });

    // Listen for connection close
    ws.addEventListener("close", () => {
      this.sessions.delete(ws);
      this.broadcast({
        event: "presence",
        data: {
          user_id: userId,
          username: username,
          status: "offline"
        }
      });
    });

    // Listen for errors
    ws.addEventListener("error", () => {
      this.sessions.delete(ws);
    });
  }

  broadcast(message: any, excludeSocket?: WebSocket) {
    const serialized = JSON.stringify(message);
    for (const [ws, info] of this.sessions.entries()) {
      if (ws === excludeSocket) continue;
      try {
        ws.send(serialized);
      } catch (err) {
        this.sessions.delete(ws);
      }
    }
  }
}
