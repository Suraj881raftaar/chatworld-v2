# Database Migrations Setup
## Chat World v2

This document describes the workflow for database updates and schema migrations using Alembic and SQLAlchemy.

---

### 1. Project Integration

The Alembic system is configured in the `database/` directory.

*   **Config File:** `database/alembic.ini`
*   **Migrations Root:** `database/migrations/`
*   **Version Control:** Alembic tracks current migration state using a database table named `alembic_version`.

To ensure tables are detected by Alembic auto-generation, the migrations script loader `database/migrations/env.py` binds to the application's unified metadata:
```python
from backend.app.infrastructure.database.models import Base
target_metadata = Base.metadata
```

---

### 2. Workflow CLI Commands

Run these commands inside the `database` folder (ensure the python virtual environment is active).

#### 2.1 Generating a New Migration
Run this command when models in `backend/app/domain/` or `backend/app/infrastructure/database/models.py` are created or modified:
```bash
# Example syntax
alembic revision --autogenerate -m "add_user_roles"
```
*Note: Always review the generated script in `database/migrations/versions/` to verify column transformations are correct.*

#### 2.2 Applying Migrations
Apply migrations up to the latest revision:
```bash
alembic upgrade head
```

#### 2.3 Rolling Back a Migration
To revert the last applied database schema update:
```bash
alembic downgrade -1
```

---

### 3. PostgreSQL vs SQLite Dialect Rules

*   **SQLite Limitations:** SQLite does not support standard `ALTER TABLE` statements (like dropping columns or adding constraints) natively. During migration generation, Alembic must be configured to run with `render_as_batch=True` to reconstruct the tables properly:
    ```python
    # database/migrations/env.py
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        render_as_batch=True
    )
    ```
*   **Production PostgreSQL:** In production environments, running migrations is containerized. The backend Docker startup script runs:
    ```bash
    alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000
    ```
    This ensures schemas are fully updated before the web service boots and begins accepting connections.
