# Coding Standards
## Chat World v2

This document defines the code style, linting guidelines, and pattern standards for Chat World v2.

---

### 1. Python Code Guidelines (Backend)

*   **Style Standards:** Adhere strictly to **PEP 8**.
*   **Formatter:** **Black** (Line length limit: `88` characters).
*   **Import Sorting:** **isort** configured to group imports logically (standard library, third-party libraries, local project files).
*   **Type Hinting:** Mandatory type hints on all functions and class methods.
    ```python
    def get_user_by_id(user_id: UUID) -> User | None:
        ...
    ```
*   **Static Code Analysis:** **MyPy** and **Flake8** for linting.
*   **Pydantic Models:** Use Pydantic v2 schemas for request validations and response serialization. Define attributes with explicit constraints.

---

### 2. TypeScript & React Guidelines (Frontend)

*   **Package Manager:** **NPM** or **PNPM**.
*   **Formatter:** **Prettier** (Line length: `100` characters, single quotes, semi-colons).
*   **Linting:** **ESLint** with React Hooks plugin.
*   **TypeScript:** Enforce strict type checking (`strict: true` in `tsconfig.json`). Avoid using `any` type annotations; define interfaces or types for all objects.
*   **Component Structure:**
    *   Functional components with default or named exports.
    *   One component per file.
    *   Custom hooks for separating API fetch logic and view logic (using TanStack Query).
*   **React 19 Standards:**
    *   Leverage native React 19 compiler optimizations.
    *   Use the new `use` hook and standard async state transitions where appropriate.

---

### 3. Database & SQL standards (SQLAlchemy 2.0)

*   **Style:** 2.0-style declaration models (`Mapped[...]` and `mapped_column(...)`).
*   **Naming Conventions:** Tables are plural, lowercase (e.g. `users`, `rooms`). Column names are snake_case.
*   **Async Operations:** All database transactions run over async sessions (`AsyncSession` from SQLAlchemy).

---

### 4. Git Branching & Commit Conventions

*   **Branch Naming:**
    *   Features: `feature/short-description`
    *   Bugfixes: `bugfix/short-description`
    *   Refactoring: `refactor/short-description`
*   **Commit Message Guidelines (Conventional Commits):**
    *   `feat: add websocket user typing indicators`
    *   `fix: resolve refresh token expiration check exception`
    *   `docs: update API endpoints specs for v1`
    *   `style: format files using black`
    *   `test: add unit tests for user signup logic`
