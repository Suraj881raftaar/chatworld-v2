# GitHub Issues Template Backlog
## Chat World v2

This document templates standard issues to track project development.

---

### Issue 1: Database Setup and ORM Modeling
*   **Title:** `[FOUNDATIONS] Configure Database Switching, SQLAlchemy 2.x & Alembic`
*   **Label:** `enhancement`, `backend`
*   **Description:**
    Initialize the database container, write SQLAlchemy model classes using the 2.x style (declarative base, Mapped/mapped_column annotations), and integrate Alembic migrations. Ensure the project switches seamlessly between SQLite (for local dev) and PostgreSQL (for production).
*   **Acceptance Criteria:**
    * [ ] Running local config runs on SQLite with enforced foreign keys enabled.
    * [ ] Production config runs on PostgreSQL cleanly.
    * [ ] Alembic initialized; running `alembic upgrade head` completes cleanly on both dialects.

---

### Issue 2: Clean Architecture Auth Services
*   **Title:** `[AUTH] Implement Core Domain Entities, JWT Logic, and Auth Use Cases`
*   **Label:** `security`, `backend`
*   **Description:**
    Implement core `User` entities in the domain layer. Write application use cases for user registration and JWT authentication. Setup FastAPI endpoints returning Access Tokens in JSON body and setting Refresh Tokens inside secure HTTP-only cookies.
*   **Acceptance Criteria:**
    * [ ] Register hashes passwords with bcrypt.
    * [ ] Login endpoint issues access token and secure HttpOnly cookie.
    * [ ] Refresh endpoint updates credentials; validates against token database tables.

---

### Issue 3: Chat REST Endpoints
*   **Title:** `[REST] Implement Channel Management & Paginated Logs API`
*   **Label:** `enhancement`, `backend`
*   **Description:**
    Implement REST endpoints to create, list, and join chat rooms. Retrieve message logs using cursor-based pagination. Protect admin routes (e.g. Delete Room) with role-based checks.
*   **Acceptance Criteria:**
    * [ ] CRUD for channels matches application permissions.
    * [ ] Messages endpoint supports infinite scroll pagination using cursor keys.
    * [ ] Admin-only endpoints return `403 Forbidden` if accessed by regular users.

---

### Issue 4: Scalable WebSockets with Redis
*   **Title:** `[REAL-TIME] WebSocket endpoint and Redis Pub/Sub Broadcast Integration`
*   **Label:** `core`, `backend`
*   **Description:**
    Build WS endpoint connection upgrade paths. Wire connections manager to Redis client to broadcast message events across multiple server node containers.
*   **Acceptance Criteria:**
    * [ ] Connection requires a valid JWT for authentication.
    * [ ] Sockets exchange live text messaging, typing signals, and presence status changes.
    * [ ] Redis pub/sub matches connections across different nodes.

---

### Issue 5: React 19 Frontend App Layout & State
*   **Title:** `[FRONTEND] Scaffolding with TypeScript, Vite, Tailwind & Zustand`
*   **Label:** `frontend`
*   **Description:**
    Scaffold frontend using React 19, TypeScript, and Vite. Write Zustand store managers (`authStore.ts`, `chatStore.ts`) and configure Tailwind layouts.
*   **Acceptance Criteria:**
    * [ ] Vite client builds and renders templates cleanly.
    * [ ] Zustand handles session auth state and active chat window content.
    * [ ] Setup app router protecting chat views.

---

### Issue 6: Client API Integration (TanStack Query)
*   **Title:** `[FRONTEND] API Hydration, Auth Forms, and Infinite Scroll`
*   **Label:** `frontend`
*   **Description:**
    Connect login and registration views to the backend auth APIs using Axios. Integrate TanStack Query for caching and cursor-based infinite scroll message loading.
*   **Acceptance Criteria:**
    * [ ] Axios interceptors handle automatic silent token refreshes on API 401s.
    * [ ] Chat rooms list and logs load and cache correctly using TanStack Query.
    * [ ] Scrolling to the top of the chat area fetches the next batch of historical messages.

---

### Issue 7: Live Socket UI UI Binding
*   **Title:** `[FRONTEND] WebSocket React Hooks, Presence, and Typing UI`
*   **Label:** `frontend`, `real-time`
*   **Description:**
    Create a custom WebSocket hook with keep-alive, auto-reconnection, and Zustand sync. Build user presence status indicators and typing indicator views.
*   **Acceptance Criteria:**
    * [ ] Sockets automatically reconnect on drop with exponential backoff.
    * [ ] Online status lights up in real-time.
    * [ ] Typing indicator signals display dynamically.

---

### Issue 8: Dark Theme and Accessibility (WCAG 2.1)
*   **Title:** `[UI/UX] Theme Switcher, Light/Dark Modes & WCAG AA Accessibility`
*   **Label:** `frontend`, `design`
*   **Description:**
    Implement light and dark theme styling using Tailwind variables. Refine styles to meet WCAG 2.1 AA accessibility guidelines (contrast ratios, focus ring indicators, and keyboard navigation support).
*   **Acceptance Criteria:**
    * [ ] Toggle switch changes theme instantly.
    * [ ] Focus state clearly outlines active elements.
    * [ ] Keyboard navigation is fully supported (Tab traverses interactive elements cleanly).
