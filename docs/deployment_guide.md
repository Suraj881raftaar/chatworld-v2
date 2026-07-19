# Deployment Guide
## Chat World v2 (Cloudflare-Native)

This document guides the release of Chat World v2 to production hosting on the Cloudflare Serverless Platform.

---

### 1. Unified Cloudflare Serverless Architecture

```text
       +-------------------------------------------------------+
       |                    CLOUDFLARE EDGE                    |
       |                                                       |
       |  [ Hono Worker API (Single Main Script) ]             |
       |                                                       |
       |       /                  --> Serves index.html        |
       |       /assets/*          --> Serves JS/CSS bundles    |
       |       /api/v1/*          --> Handles REST endpoints   |
       |       /api/v1/ws/chat    --> Upgrades to WebSockets   |
       +----------------------------+--------------------------+
                                    | (Async Engine / WS)
                                    v
                         [ Neon PostgreSQL Database ]
```

---

### 2. Prerequisite Setup

#### 2.1 Neon PostgreSQL
1. Sign up on [Neon Database](https://neon.tech/) and create a new project.
2. In the Neon Console, execute the queries inside [schema.sql](file:///E:/suraj/chatworld-v2/backend/src/db/schema.sql) to initialize the database tables.
3. Copy the database connection URL for step 3.2.

#### 2.2 Cloudflare Wrangler Login
Authenticate your local command line environment with Cloudflare:
```bash
npx wrangler login
```

---

### 3. Build & Deploy Commands

Deploy the entire React frontend and Workers backend concurrently with:
```bash
npm install
npm run build
npm run deploy
```

#### 3.1 Deploy Scripts Mappings
- **`npm install`:** Installs root workspace dependencies.
- **`npm run build`:** Compiles the React SPA into `frontend/dist/`.
- **`npm run deploy`:** Deploys the static assets from `frontend/dist` and mounts the Hono Worker script containing Durable Objects bindings.

#### 3.2 Setting Wrangler Production Secrets
Run the following commands to securely set database connection strings and JWT token keys inside Cloudflare KV Secrets:
```bash
npx wrangler secret put DATABASE_URL
# Input Neon connection string (e.g. postgresql://alex:pass@ep-cool-123.neon.tech/neondb)

npx wrangler secret put JWT_SECRET
# Input a random 64-character signing secret key
```
