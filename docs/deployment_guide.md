# Deployment Guide
## Chat World v2

This document guides the release of Chat World v2 to production hosting using Docker Compose and Cloudflare Pages.

---

### 1. Local & Production Containerization (Docker Compose)

The application stack uses containerization to ensure identical behavior between local and production machines.

#### 1.1 Local Development Run
To boot up the complete stack locally:
```bash
docker compose -f docker/docker-compose.yml up --build
```
This starts:
1.  **PostgreSQL DB Container:** Accessible at `localhost:5432` mapping files to host volumes.
2.  **Redis Container:** Stores WebSocket session broker channels.
3.  **FastAPI Backend Container:** Runs hot-reload FastAPI server mapping port `8000`.
4.  **Vite Frontend Container:** Runs hot-reload frontend development server at `http://localhost:5173`.

#### 1.2 Production Dockerfile Strategy
*   **Backend:** Leverages standard multi-stage builds using a lightweight python alpine runtime image (`python:3.11-alpine`).
*   **Frontend:** The frontend build command compiles static HTML/JS assets via `npm run build`. In production, these assets are served at edge servers (e.g. Cloudflare Pages) directly, bypassing the need for a persistent Node container.

---

### 2. Cloudflare Deployment Architecture

```text
       +---------------------------------------------+
       |             CLOUDFLARE EDGE                 |
       +--------------------+------------------------+
                            |
             +--------------+--------------+
             |                             |
      (Static Assets)                 (API Routes)
             |                             |
             v                             v
   [ Cloudflare Pages ]           [ Cloudflare Tunnel / DNS ]
    Serves: index.html                     |
    JS/CSS bundle                          v
                                  [ VPS Load Balancer ]
                                           |
                                  +--------+--------+
                                  |                 |
                                  v                 v
                              Node A (WS)       Node B (WS)
                                  \                 /
                                   +-------+-------+
                                           | (Pub/Sub)
                                           v
                                       [ Redis ]
```

#### 2.1 Frontend: Cloudflare Pages Setup
1.  Connect your GitHub repository to **Cloudflare Dashboard > Pages**.
2.  Set the Build Configuration:
    *   **Framework Preset:** Vite
    *   **Build Command:** `npm run build`
    *   **Build Output Directory:** `dist`
3.  Set environment variables: `VITE_API_URL` pointing to backend address.

#### 2.2 Routing and Proxy (Cloudflare Rules)
To prevent CORS preflight delays and domain mismatches:
*   Configure a **Cloudflare Origin Rule** or **Worker** routing path:
    *   Requests targeting `domain.com/*` serve Cloudflare Pages static assets.
    *   Requests targeting `domain.com/api/*` proxy to the VPS backend server at `http://vps-ip:8000/api/*`.
    *   Requests targeting `domain.com/api/v1/ws/*` upgrade headers and proxy websocket connections to VPS backend at `ws://vps-ip:8000/api/v1/ws/*`.

---

### 3. Production Environment Checklist
Make sure these variables are configured in the VPS server's production environment before start:
*   `ENVIRONMENT`: `production`
*   `DATABASE_URL`: `postgresql+asyncpg://user:pass@host:5432/dbname`
*   `REDIS_URL`: `redis://:pass@host:6379/0`
*   `JWT_SECRET_KEY`: Long random string (generated via `openssl rand -hex 32`)
*   `CORS_ORIGINS`: `["https://domain.com"]`
