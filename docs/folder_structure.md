# Repository Folder Layout Spec
## Chat World v2

This document describes the Clean Architecture + Domain-Driven Design (DDD) structural layout of Chat World v2.

---

### 1. Unified Directory Layout

```text
.
├── .github/
│   └── workflows/
│       ├── test.yml             # CI testing pipeline
│       └── deploy.yml           # CD deployment script
├── assets/                      # Repository branding and documentation images
│   └── banner.png
├── backend/                     # FastAPI Backend Root
│   ├── app/
│   │   ├── domain/              # DDD Domain Layer (Pure Python, No Framework Deps)
│   │   │   ├── entities/        # Domain entities (User, Room, Message)
│   │   │   ├── exceptions/      # Domain specific exceptions (UserBlockedException)
│   │   │   └── value_objects/   # Domain Value Objects (Email, PasswordHash)
│   │   ├── application/         # Application Layer (Use Cases & Ports)
│   │   │   ├── use_cases/       # Use Case Interactors (CreateRoomUseCase, AuthenticateUser)
│   │   │   ├── interfaces/      # Repository and service ports interfaces
│   │   │   └── dtos/            # Data Transfer Objects
│   │   ├── infrastructure/      # Infrastructure Layer (Adapters & Integrations)
│   │   │   ├── database/        # Database adapter (SQLAlchemy models, repos, db session)
│   │   │   │   ├── models.py    # SQLAlchemy tables representation
│   │   │   │   └── repository.py# CRUD implementations mapping to repository ports
│   │   │   ├── cache/           # Redis cache and Pub/Sub integrations
│   │   │   ├── web/             # FastAPI presentation adapters
│   │   │   │   ├── routers/     # API route controllers (v1 namespace)
│   │   │   │   │   ├── auth.py
│   │   │   │   │   ├── users.py
│   │   │   │   │   └── rooms.py
│   │   │   │   ├── middleware/  # CORS, Logging, Exception handler middlewares
│   │   │   │   └── websocket.py # WebSocket connections manager
│   │   │   └── security/        # JWT utilities and password crypto
│   │   ├── core/                # Configuration and logging orchestrators
│   │   │   ├── config.py        # Pydantic-settings environment parser
│   │   │   └── logging.py       # Custom loguru structured logger config
│   │   ├── tests/               # Test suites (pytest)
│   │   │   ├── conftest.py      # Database/WebSocket test fixtures
│   │   │   ├── domain/
│   │   │   ├── use_cases/
│   │   │   └── integration/     # REST/WS api endpoints test cases
│   │   └── main.py              # Application setup & start script
│   ├── Dockerfile               # Backend production Dockerfile
│   ├── requirements.txt         # Core dependencies
│   └── .env.example             # Template for backend settings
├── database/                    # Database Migrations Setup
│   ├── migrations/              # Alembic version files
│   └── alembic.ini              # Alembic config file
├── docker/                      # Container Configurations
│   ├── docker-compose.yml       # Dev/Prod multi-container runner
│   └── postgres-init.sql        # Database initialization script
├── docs/                        # Specifications, plans & guidelines
│   ├── srs.md
│   ├── system_architecture.md
│   ├── database_erd.md
│   ├── api_documentation.md
│   ├── folder_structure.md
│   ├── ui_wireframes.md
│   ├── roadmap.md
│   ├── milestones.md
│   ├── github_issues.md
│   ├── coding_standards.md
│   ├── ui_design_system.md
│   ├── api_contract.md
│   ├── database_migrations.md
│   ├── deployment_guide.md
│   ├── testing_strategy.md
│   ├── security.md
│   ├── performance.md
│   ├── contribution_guide.md
│   └── changelog.md
├── frontend/                    # React Frontend Root
│   ├── src/
│   │   ├── assets/              # Colors, styling, layouts
│   │   │   └── index.css        # Tailwind configurations
│   │   ├── components/          # Modular component layout
│   │   │   ├── ui/              # Atom presentation blocks (Button, Input, Dropdown)
│   │   │   └── shared/          # Molecular components (ChatBubble, UserRow, Sidebar)
│   │   ├── hooks/               # Custom React hooks (useAuth, useChatSocket)
│   │   ├── layouts/             # Grid systems layouts (MainLayout, AuthLayout)
│   │   ├── pages/               # Routing views (LoginPage, ChatPage, RegisterPage)
│   │   ├── services/            # Axios API client handlers
│   │   ├── store/               # Zustand local state stores
│   │   ├── types/               # TypeScript models declarations
│   │   ├── App.tsx              # Application layout root
│   │   └── main.tsx             # DOM entry file
│   ├── index.html               # Frontend root template
│   ├── package.json             # NPM dependencies manifest
│   ├── tailwind.config.js       # Styles configurations
│   ├── vite.config.ts           # Vite compile parameters
│   └── Dockerfile               # Production static assets server Dockerfile
├── LICENSE
└── README.md
```
