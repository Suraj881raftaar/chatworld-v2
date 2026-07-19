# Contribution Guide
## Chat World v2

This document guides developers on how to configure their environments, write code, format code, and submit Pull Requests (PRs).

---

### 1. Local Environment Setup

Follow these steps to run a bare-metal development environment:

#### 1.1 Backend Setup
1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Create a virtual environment:
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Copy environmental variables template:
    ```bash
    cp .env.example .env
    ```
5.  Launch development server:
    ```bash
    uvicorn app.main:app --reload
    ```

#### 1.2 Frontend Setup
1.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Launch development client:
    ```bash
    npm run dev
    ```

---

### 2. Code Quality Commands

Before staging or committing any code, developers must run the formatting and testing tools locally.

#### 2.1 Backend Format & Lint Checks
```bash
# Sort imports
isort app/

# Format code
black app/

# Static lint check
flake8 app/

# Run unit tests
pytest app/tests/
```

#### 2.2 Frontend Format & Lint Checks
```bash
# Run lint check
npm run lint

# Format code
npm run format

# Run dev compile build checks
npm run build
```

---

### 3. Pull Request (PR) Quality Checklist

When submitting a Pull Request, ensure the following requirements are met:

*   [ ] The branch follows naming conventions (`feature/`, `bugfix/`).
*   [ ] The code compiles without errors or warnings.
*   [ ] All local unit tests pass successfully.
*   [ ] Prettier/Black formatting rules are fully applied.
*   [ ] New endpoints are covered by integration tests.
*   [ ] Pull Request is linked to a matching GitHub Issue ticket.
*   [ ] The changes have been recorded in the project `CHANGELOG.md`.
