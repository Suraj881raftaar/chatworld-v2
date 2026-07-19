# API Specification & Contracts
## Chat World v2

This document details the REST API specifications and WebSocket event protocols under the `/api/v1` namespace.

---

### 1. Global Setup
*   **Version Prefix:** `/api/v1`
*   **Automatic Docs:** Provided by FastAPI at `/docs` (Swagger UI) and `/redoc` (ReDoc).
*   **Access Control:** Access Tokens passed via the `Authorization: Bearer <token>` header. Refresh Tokens stored in the client browser as an HTTP-Only secure cookie named `refresh_token`.

---

### 2. Authentication Services

#### 2.1 User Registration (`POST /api/v1/auth/signup`)
*   **Request Body:**
    ```json
    {
      "email": "user@example.com",
      "username": "suraj_yadav",
      "password": "SecurePassword123!"
    }
    ```
*   **Responses:**
    *   `201 Created` - Returns user entity minus password hash.
    *   `400 Bad Request` - Username/Email already in use.

#### 2.2 User Login (`POST /api/v1/auth/login`)
*   **Request Body:**
    ```json
    {
      "email": "user@example.com",
      "password": "SecurePassword123!"
    }
    ```
*   **Responses:**
    *   `200 OK` - Returns user profile info and JSON body access token. Drops Cookie.
    *   `401 Unauthorized` - Invalid credentials.

#### 2.3 Token Rotation (`POST /api/v1/auth/refresh`)
*   **Request Body:** Empty. Relies on `refresh_token` secure cookie.
*   **Responses:**
    *   `200 OK` - Returns a new active JWT access token.
    *   `401 Unauthorized` - Token revoked or expired.

---

### 3. Messaging & User Operations

#### 3.1 User Search (`GET /api/v1/users/search`)
*   **Parameters:** `q` (string query)
*   **Required Role:** `User` or `Admin`
*   **Response:**
    *   `200 OK` - Array of user representations.

#### 3.2 List Active Channels (`GET /api/v1/rooms`)
*   **Required Role:** `User` or `Admin`
*   **Response:**
    *   `200 OK` - Array of rooms user belongs to.

#### 3.3 Create Channel (`POST /api/v1/rooms`)
*   **Request Body:**
    ```json
    {
      "name": "General Chat",
      "description": "Public channel",
      "is_private": false
    }
    ```
*   **Required Role:** `User` or `Admin`
*   **Response:**
    *   `201 Created` - Created room metadata.

#### 3.4 Delete Room (`DELETE /api/v1/rooms/{room_id}`)
*   **Required Role:** `Admin` (System Admin) OR Room Creator (`Owner`)
*   **Responses:**
    *   `200 OK` - Successful deletion.
    *   `403 Forbidden` - User role has insufficient privileges.

#### 3.5 Block/Suspend User (`POST /api/v1/admin/users/{user_id}/suspend`)
*   **Required Role:** `Admin`
*   **Responses:**
    *   `200 OK` - Account status set to inactive.
    *   `403 Forbidden` - Only system administrators can call this endpoint.

---

### 4. Live WebSocket Messaging Protocol

#### 4.1 Connection Setup
Establish connecting socket at:
`wss://domain.com/api/v1/ws/chat?token=<access_token>`

#### 4.2 Messages Models
Incoming packets from client must match JSON event formats:
```json
{
  "event": "send_message",
  "data": {
    "room_id": "uuid-string",
    "message_type": "text",
    "content": "Hello World"
  }
}
```

Server replies with matching event schema:
```json
{
  "event": "new_message",
  "data": {
    "id": "uuid-string",
    "room_id": "uuid-string",
    "sender": {
      "id": "uuid-string",
      "username": "suraj_yadav",
      "avatar_url": null
    },
    "content": "Hello World",
    "created_at": "2026-07-19T13:25:00Z"
  }
}
```
