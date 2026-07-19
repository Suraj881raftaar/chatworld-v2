# Performance & Scaling Spec
## Chat World v2

This document defines performance optimization standards, database connection parameters, caching policies, and client load-reduction strategies.

---

### 1. Database Scaling & Query Optimizations

*   **Connection Pooling:** Configure SQLAlchemy's async connection pool engine with standard thresholds:
    ```python
    engine = create_async_engine(
        DATABASE_URL,
        pool_size=20,           # Max persistent connections
        max_overflow=10,        # Temporary overflow connections under spikes
        pool_timeout=30,        # Connection timeout wait limit
        pool_recycle=1800       # Close connection after 30 minutes to reclaim memory
    )
    ```
*   **Query Pagination:** Enforce cursor-based pagination (using message IDs) rather than standard offset pagination (`LIMIT offset`) when querying history. Cursor queries perform at `O(1)` complexity by jumping directly to indices, avoiding database table scans.
*   **Database Indexing:** Ensure index bindings match columns matching filter queries:
    *   Compound index on `messages(room_id, created_at DESC)`.
    *   Index on `room_members(user_id)`.

---

### 2. Redis Caching & Pub/Sub Propagation

*   **Broker Scaling:** Under multi-container horizontally scaled backend setups, WebSocket message distributions publish events to **Redis Channels** (`room:{room_id}`). This routes messages across distinct servers to connect localized sockets.
*   **Caching Layer:** User profiles lookup info and general public channel directories cache inside Redis (expiry TTL: 1 hour).
*   **Cache Revocation:** Any update (`PUT /users/me` or room name changes) clears the associated Redis cache keys.

---

### 3. Real-Time WebSocket Optimizations

*   **Heartbeat Checks:** Sockets keep-alive are validated via periodic ping-pong frames. Connections with zero signals for 65 seconds close automatically to prevent memory leaks from stale connections.
*   **Message Backpressure:** The frontend queues incoming and outgoing packets to ensure the UI remains smooth during high-volume chat periods.

---

### 4. Client Frontend Optimizations (React 19)

*   **Code Splitting:** React Router utilizes dynamic imports (`lazy()`) to load routes (e.g. Chat dashboard, login views) only when traversed.
*   **TanStack Query Caching:** Keeps messages history, room details, and user lists cached in memory, preventing redundant network requests.
*   **Image Compression:** User avatars must pass compression filters before upload to cap file sizes at 500KB.
*   **Virtual Scrolling:** The chat history window uses virtual list rendering (such as `@tanstack/react-virtual`) to render only the messages currently visible in the user's viewport. This prevents DOM lag when channels contain thousands of loaded items.
