# Testing Strategy
## Chat World v2

This document details the testing architecture, testing tools, and execution strategies.

---

### 1. Test Architecture & Directory Setup

All tests reside under `backend/app/tests/` (Backend) and `frontend/tests/` (Frontend) namespaces.

```text
tests/
├── conftest.py             # Global async db fixtures and client setups
├── domain/                 # Domain logic unit tests (independent of frameworks)
│   └── test_user_entity.py
├── use_cases/              # Application layer unit tests (mocked interfaces)
│   └── test_auth_use_cases.py
└── integration/            # HTTP and WebSocket API endpoints integration tests
    ├── test_auth_endpoints.py
    └── test_websocket.py
```

---

### 2. Testing Framework & Configurations (Backend)

*   **Test Runner:** **pytest**
*   **Async Test Helper:** **pytest-asyncio**
*   **Mock Library:** **unittest.mock** (or pytest-mock)

#### 2.1 Database Isolation Setup
To ensure database mutations from tests do not pollute production databases, the configuration forces tests to use an in-memory SQLite database setup.

```python
# backend/app/tests/conftest.py
import pytest
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture(scope="session")
async def db_engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture
async def db_session(db_engine):
    async_session = sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session
```

#### 2.2 WebSocket Integration Mocking
Tests verify WebSocket endpoints by upgrading client calls using FastAPI's standard `TestClient` (supports socket client mock connections):
```python
def test_websocket_messaging(client: TestClient):
    with client.websocket_connect("/api/v1/ws/chat?token=test_jwt") as websocket:
        websocket.send_json({"event": "send_message", "data": {"content": "Hello Test"}})
        response = websocket.receive_json()
        assert response["event"] == "new_message"
        assert response["data"]["content"] == "Hello Test"
```

---

### 3. Frontend Testing Setup (React 19)

*   **Unit Tests:** **Vitest** + **React Testing Library**
*   **Target Scope:**
    *   Zustand store updates (login mutations, socket status connections state).
    *   API components handling mock payloads correctly.
*   **UI Integration / E2E:** **Playwright** (automated script loading to verify layout renders and client-server connectivity).

---

### 4. Metrics & Gateways
*   **Coverage Target:** Minimum **90%** statement coverage across backend layers.
*   **Execution Rule:** CI tests execute automatically on code branches pull requests. Merges are blocked if any check fails.
