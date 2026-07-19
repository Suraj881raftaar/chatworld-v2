# Chat World v2

[![CI Status](https://img.shields.io/badge/CI-Pending-lightgrey?style=for-the-badge)](https://github.com/Suraj881raftaar/chatworld-v2)
[![React 19](https://img.shields.io/badge/React-19.0-blue?style=for-the-badge&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)

Chat World v2 is a flagship, enterprise-grade real-time chat application built using a decoupled **Clean Architecture** and **Domain-Driven Design (DDD)** approach. It replaces the legacy socket-based BCA Chat World application with a robust, production-quality system.

---

## 🚀 Key Features

*   **Real-time Messaging:** Direct and channel chats powered by asynchronous WebSocket loops.
*   **Scalable Broadcasts:** Coordination of real-time events across multiple backend nodes using **Redis Pub/Sub**.
*   **Dual Database Dialect Engine:** SQLite database support for rapid local development and high-performance PostgreSQL 16+ for production environments.
*   **Secure Sessioning:** Authentication using JWT access/refresh token rotation. Access tokens are stored in-memory, and refresh tokens are stored in secure `HttpOnly` cookie storage.
*   **Role-Based Access Control (RBAC):** Built-in support for standard `User` and administrative `Admin` permissions.
*   **Modern Interface:** Dark-themed responsive design built with **React 19**, styled with **Tailwind CSS**, and optimized for screen readers and keyboard navigation (WCAG 2.1 compliance).

---

## 🛠️ Technology Stack

*   **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, TanStack Query (v5), Zustand, Axios
*   **Backend:** FastAPI (Python 3.11+), Uvicorn, SQLAlchemy 2.0 ORM, Alembic migrations, Loguru
*   **Database:** PostgreSQL 16+ (Production), SQLite (Development)
*   **Caching/Broker:** Redis (WS Pub/Sub & REST Caching)
*   **Containerization:** Docker & Docker Compose
*   **CI/CD:** GitHub Actions
*   **Hosting/Edge:** Cloudflare Pages (Frontend) & VPS Container (Backend/Database)

---

## 📁 Repository Structure

```text
├── backend/            # FastAPI source code (domain, application, infrastructure layers)
├── frontend/           # React + Vite application (components, hooks, stores, services)
├── database/           # Alembic database migration files
├── docker/             # Docker configuration files
├── docs/               # Technical specifications and planning documents
└── README.md           # Project index
```

---

## 📚 Detailed Project Documentation

All specifications, architectural designs, and roadmaps are documented inside the [docs/](docs/) folder:

1.  **[Software Requirements Specification (SRS)](docs/srs.md):** Functional & non-functional requirements.
2.  **[System Architecture Design](docs/system_architecture.md):** Clean Architecture, DDD details, and Redis diagrams.
3.  **[Database Schema & ERD](docs/database_erd.md):** Relational tables and database structures.
4.  **[API Reference](docs/api_documentation.md):** REST and WebSocket endpoints documentation.
5.  **[Folder Structure Spec](docs/folder_structure.md):** Layout definitions of all repository files.
6.  **[UI Wireframe Layouts](docs/ui_wireframes.md):** Mockup designs for desktop and mobile views.
7.  **[Development Roadmap](docs/roadmap.md):** Chronological implementation phases and checklist.
8.  **[Milestones & Criteria](docs/milestones.md):** Delivery checkpoints and acceptance tests.
9.  **[GitHub Issues Backlog](docs/github_issues.md):** Project board templates to trace issues.
10. **[Coding Standards](docs/coding_standards.md):** Coding styles and lint configurations.
11. **[UI Design System](docs/ui_design_system.md):** Styling palettes, variables, typography, and spacing.
12. **[API Contract Reference](docs/api_contract.md):** OpenAPI schema templates.
13. **[Database Migrations Setup](docs/database_migrations.md):** Alembic configuration guides.
14. **[Deployment Guide](docs/deployment_guide.md):** DevOps instructions for Cloudflare and Docker.
15. **[Testing Strategy](docs/testing_strategy.md):** Unit and integration testing protocols.
16. **[Security Architecture](docs/security.md):** OWASP protection checklists.
17. **[Performance & Optimization](docs/performance.md):** Caching, scaling, and database indexes.
18. **[Contribution Guide](docs/contribution_guide.md):** Guidelines for developers.
19. **[Changelog](docs/changelog.md):** Version tracking files.

---

## ⚙️ Quick Start (Development)

### Prerequisites
*   Docker & Docker Compose installed.
*   Python 3.11+ (if running bare-metal backend).
*   Node.js 20+ (if running bare-metal frontend).

### Run with Docker Compose
To boot up the entire stack (Database, Backend, Frontend) concurrently:
```bash
docker compose -f docker/docker-compose.yml up --build
```
Once initialized, access:
*   Frontend: `http://localhost:5173`
*   Backend API Swagger Docs: `http://localhost:8000/docs`

---

## 🚀 Production Deployment & Setup

### 1. 🗄️ Neon PostgreSQL Setup
1. Sign up on [Neon Database](https://neon.tech/) and create a new project.
2. In the Neon Console, copy the connection string for your database.
3. Replace the prefix schema from standard `postgres://` to async-compatible `postgresql+asyncpg://` when setting the connection URL (e.g. `postgresql+asyncpg://alex:pass@ep-cool-water-123.us-east-2.aws.neon.tech/neondb`).
4. Apply the Alembic migrations against your live Neon database:
   ```bash
   alembic upgrade head
   ```

### 2. 🐍 Render Setup (FastAPI Backend)
1. Register on [Render](https://render.com/) and connect your GitHub repository.
2. Create a new **Blueprint** service instance. Render will automatically read the `render.yaml` specification located in the repository root.
3. Configure the following environment variables on the Render Dashboard:
   - `DATABASE_URL`: Your async Neon PostgreSQL connection string.
   - `SECRET_KEY`: A secure random 64-character secret key.
   - `JWT_SECRET`: A secure key used for signing JWT tokens.
   - `CORS_ORIGINS`: Allowed origins (e.g. `["https://chatworld-v2.pages.dev"]`).
4. Click **Deploy**. Render will build and start the web server from the `backend/` directory automatically.

### 3. ☁️ Cloudflare Pages Setup (React Frontend)
1. Sign up on [Cloudflare Pages](https://pages.cloudflare.com/) and connect your GitHub account.
2. Create a new Pages Project, and set the root directory of the build to `frontend`.
3. Configure the following build settings:
   - **Framework Preset:** None (Vite/React).
   - **Build Command:** `npm run build`
   - **Build Output Directory:** `dist`
4. Deploy the application. The router redirects in `public/_redirects` will automatically proxy all frontend `/api/*` and `/ws/*` calls to your Render backend edge.

