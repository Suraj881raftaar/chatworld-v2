# Chat World v2 (Cloudflare-Native)

[![Vite](https://img.shields.io/badge/Vite-6.0.3-blue?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![React 18](https://img.shields.io/badge/React-18.3.1-blue?style=for-the-badge&logo=react&logoColor=white)](https://react.dev/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-Hono-orange?style=for-the-badge&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://neon.tech/)

Chat World v2 is a flagship, enterprise-grade real-time chat application built using a decoupled **Clean Architecture** and **Domain-Driven Design (DDD)** approach. It runs 100% serverless on the **Cloudflare Serverless Platform**, serving both static assets and API requests with **zero monthly hosting cost**.

---

## 🚀 Key Features

*   **Real-time Messaging:** Powered by Cloudflare **Durable Objects** for high-performance edge WebSocket connections, presence management, and typing indicators.
*   **Zero-Cost File Sharing:** Chat file sharing and user avatar uploads are hosted on **Cloudflare R2** object storage.
*   **Neon Serverless Integration:** Serverless PostgreSQL database queries executed at the edge using `@neondatabase/serverless` client connections.
*   **State-of-the-Art Cryptography:** Auth password verification uses native Web Crypto PBKDF2 hashing, and sessions use JWT access/refresh token rotation.
*   **Modern Interface:** Dark-themed responsive design built with **React 18**, styled with **Tailwind CSS**, and optimized for screen readers and keyboard navigation (WCAG 2.1 compliance).

---

## 🛠️ Technology Stack

*   **Frontend:** React 18.3.1, TypeScript, Vite, Tailwind CSS, TanStack Query (v5), Zustand, Axios
*   **Backend:** Cloudflare Workers, Hono Web Framework, Durable Objects (Real-time WS), Cloudflare R2 (Storage)
*   **Database:** Neon PostgreSQL (Production/Dev)
*   **CI/CD:** GitHub Actions

---

## 📁 Repository Structure

```text
├── backend/            # Cloudflare Workers source code (Hono routers & Durable Objects)
│   ├── src/
│   │   ├── db/         # Neon serverless client & DDL schema file
│   │   ├── objects/    # Durable Object classes (ChatRoom)
│   │   ├── routers/    # Hono routers (Auth, Users, Rooms, Uploads)
│   │   └── index.ts    # Main entrypoint
│   └── wrangler.toml   # Cloudflare deployment settings
├── frontend/           # React + Vite application (components, hooks, stores, services)
├── docs/               # Technical specifications and planning documents
└── README.md           # Project index
```

---

## ⚙️ Quick Start (Development)

### Local Dev Run
To boot up the complete stack locally using Wrangler's emulation:
1. Initialize dependencies:
   ```bash
   npm install
   ```
2. Build the React frontend:
   ```bash
   npm run build
   ```
3. Boot up the local emulated Worker server:
   ```bash
   npm run dev
   ```
Access the application at `http://localhost:8787` (the Hono Worker automatically routes API calls and serves static assets from `frontend/dist`).

---

## 🚀 Production Deployment

1. Register on [Neon](https://neon.tech/) and create a PostgreSQL database. Run the commands in `backend/src/db/schema.sql` to initialize tables.
2. Log in to Cloudflare using the CLI:
   ```bash
   npx wrangler login
   ```
3. Set your production secrets on your worker:
   ```bash
   npx wrangler secret put DATABASE_URL
   npx wrangler secret put JWT_SECRET
   ```
4. Deploy the application:
   ```bash
   npm run deploy
   ```
