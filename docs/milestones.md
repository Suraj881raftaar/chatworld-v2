# Project Milestones
## Chat World v2

---

### 1. Milestone Tracking

| Milestone | Deliverables | Verification Strategy | Target Completion |
| :--- | :--- | :--- | :--- |
| **M1: Foundations** | Env configuration, SQLite/Postgres dialect engines, SQLAlchemy 2.x schemas, Vite TS React scaffolding | Migration executions on both SQLite & Postgres, web build output success | Day 4 |
| **M2: Security & REST** | JWT access/cookie refresh logic, User CRUD, Channel API endpoints | Pytest suite pass with >=90% code coverage | Day 8 |
| **M3: Real-Time Engine** | WS endpoint handler, Redis Pub/Sub broadcast coordinator, client status tracking | Multi-node scaling local validation using two node ports bridged with Redis | Day 13 |
| **M4: Client Core** | React 19 views, Zustand store binding, TanStack Query integrations, Dark/Light modes | Keyboard accessibility (Tab) verification, contrast validations, mock disconnected states | Day 18 |
| **M5: Deployment** | Docker Compose orchestration, CI pipelines, Cloudflare config | Unified local docker compose execution check, staging environment checks | Day 22 |

---

### 2. Detailed Verification Protocols

#### M1: Environment and Schemas
*   Must demonstrate database operations functioning on local SQLite (`chatworld.db` file is generated) and PostgreSQL database.
*   Running `alembic upgrade head` must generate matching schemas on both database dialects.

#### M2: JWT and REST
*   Must pass automated testing checking password encryption validations.
*   Token endpoint `/auth/refresh` must rotate access token correctly while denying expired/revoked cookies.

#### M3: WebSocket Scaling
*   Test environment spins up two FastAPI processes on port 8000 and 8001 connected to a single Redis container.
*   Connecting client A to node 1 and client B to node 2 must broadcast message exchanges cleanly in real-time.

#### M4: UI/UX & WCAG Checklist
*   Check contrast values using accessibility tools to guarantee a minimum contrast ratio of `4.5:1` on active UI elements.
*   Ensure all buttons and inputs are fully focusable with clear, visual focus outlines when using keyboard navigation.
