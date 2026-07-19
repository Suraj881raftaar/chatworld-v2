# Security Architecture
## Chat World v2

This document describes the security protocols, policies, and practices implemented in Chat World v2 to protect data integrity and user privacy.

---

### 1. Cryptographic Safeguards

*   **Password Hashing:** Passwords must be hashed using **bcrypt** with a work factor (salt rounds) of `12` before database persistence. Under no circumstances are raw passwords stored or printed in console logs.
*   **Transport Security:** In production, SSL/TLS (`HTTPS` and `WSS`) must be enforced globally. All non-secure HTTP requests must redirect automatically to HTTPS on Render.

---

### 2. Session Security (JWT and Cookie rotation)

*   **Access Token:** Short-lived JWT (expires in 15 minutes), containing user ID and scope payload, signed with `HS256`. Clients store access tokens in-memory.
*   **Refresh Token:** Long-lived secure string stored in database, set inside browser as an HTTP-only Cookie:
    *   `HttpOnly`: Prevents JavaScript code from accessing token (mitigates Cross-Site Scripting (XSS) risks).
    *   `Secure`: Enforces cookie transmission only over encrypted SSL/TLS channels.
    *   `SameSite=Strict`: Restricts cookie transmission on cross-site requests (mitigates Cross-Site Request Forgery (CSRF) vectors).
    *   `Path=/api/v1/auth/refresh`: Cookie is sent to the server *only* during silent refresh attempts.
*   **Token Revocation:** Logouts instantly revoke active Refresh Tokens in the database (`is_revoked = true` constraint check).

---

### 3. Attack Vector Mitigations (OWASP Top 10)

#### 3.1 SQL Injection Prevention
*   SQL query bindings must rely strictly on SQLAlchemy ORM parameterized query templates. 
*   Avoid using string concatenations (`f"SELECT * FROM users WHERE id = {user_id}"`) inside database connection scopes.

#### 3.2 Cross-Site Scripting (XSS)
*   **Frontend Sanitization:** React automatically escapes values rendered in JSX. Where markdown elements are supported in chats, inputs must parse through a sanitization library (such as `DOMPurify`) before DOM rendering.
*   **Content Security Policy (CSP):** FastAPI middleware configured headers restricting script executions to verified domains.

#### 3.3 Rate Limiting
*   FastAPI endpoints (especially `/auth/login` and `/auth/signup`) must use rate-limiting middlewares (e.g. `slowapi` or Redis-backed rate limit checks) limiting users to `5` login attempts per minute.

---

### 4. OWASP Checklist

*   [ ] Hashed credentials (bcrypt salt >= 12).
*   [ ] HTTPS/WSS globally enforced.
*   [ ] Secure cookie parameters (`HttpOnly`, `Secure`, `SameSite=Strict`).
*   [ ] SQLAlchemy ORM parameterized queries utilized exclusively.
*   [ ] XSS protection input sanitization enabled on frontend markdown renderer.
*   [ ] Rate limiter guards `/login` and `/signup` endpoints.
*   [ ] CORS origins locked to verified domains in production.
*   [ ] Access logs scrub authentication credentials and bearer tokens.
